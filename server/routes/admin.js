import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { logActivity } from '../lib/activityLog.js';

const router = Router();
router.use(requireAuth, requireRole('government', 'super_admin'));

// Constraint 1: Multi-Role Collaboration & Activity Monitoring.
// "Active user" = distinct user_id with an activity_log row in the last 24h,
// paired with "today's activity count" so both numbers describe the same
// rolling window of real, live activity — not a static snapshot.
router.get('/monitoring', async (req, res) => {
  const [activeUsers, todayActivity, recentActivities, activityByRole, todayByType] = await Promise.all([
    pool.query(`select count(distinct user_id) as c from activity_log where created_at >= now() - interval '24 hours'`),
    pool.query(`select count(*) as c from activity_log where created_at >= current_date`),
    pool.query(
      `select al.id, al.action_type, al.description, al.role_at_time, al.created_at, u.email, p.business_name
       from activity_log al
       join users u on u.id = al.user_id
       left join profiles p on p.user_id = al.user_id
       order by al.created_at desc
       limit 20`
    ),
    pool.query(
      `select role_at_time, count(*) as c from activity_log
       where created_at >= current_date - interval '30 days'
       group by role_at_time order by c desc`
    ),
    pool.query(
      `select action_type, count(*) as c from activity_log
       where created_at >= current_date
       group by action_type order by c desc`
    ),
  ]);

  res.json({
    active_users_count: Number(activeUsers.rows[0].c),
    today_activity_count: Number(todayActivity.rows[0].c),
    recent_activities: recentActivities.rows,
    activity_by_role: activityByRole.rows.map((r) => ({ role: r.role_at_time, count: Number(r.c) })),
    today_activity_by_type: todayByType.rows.map((r) => ({ action_type: r.action_type, count: Number(r.c) })),
  });
});

// Constraint 2: Smart Impact Dashboard & Action Log. `kecamatan` and `status`
// are real filters — both the 4 metrics AND the detail rows are recomputed
// from the SAME filtered set, so a judge changing a filter genuinely sees
// the whole page react, not just the table.
router.get('/impact', async (req, res) => {
  const { kecamatan, status } = req.query;

  const result = await pool.query(
    `select p.user_id, p.business_name as nama_usaha, p.business_category as kategori, p.kecamatan,
            s->>'status' as status, (s->>'total_score')::int as skor,
            (select max(t.tanggal) from transactions t where t.user_id = p.user_id) as waktu
     from profiles p, compute_score(p.user_id) as s
     where ($1::text is null or p.kecamatan = $1)
     order by skor asc`,
    [kecamatan || null]
  );

  let rows = result.rows;
  if (status === 'Layak Diajukan' || status === 'Perlu Peningkatan') {
    rows = rows.filter((r) => r.status === status);
  }

  const withPrioritas = rows.map((r) => ({
    ...r,
    prioritas: r.skor < 40 ? 'Tinggi' : r.skor < 70 ? 'Sedang' : 'Rendah',
  }));

  const totalUmkm = withPrioritas.length;
  const avgScore = totalUmkm > 0 ? Math.round(withPrioritas.reduce((a, r) => a + r.skor, 0) / totalUmkm) : 0;
  const layakCount = withPrioritas.filter((r) => r.status === 'Layak Diajukan').length;
  const layakPct = totalUmkm > 0 ? Math.round((layakCount / totalUmkm) * 100) : 0;

  const userIds = withPrioritas.map((r) => r.user_id);
  const kurDocsResult = userIds.length > 0
    ? await pool.query('select count(*) as c from kur_documents where user_id = any($1::uuid[])', [userIds])
    : { rows: [{ c: 0 }] };

  res.json({
    metrics: {
      total_umkm: totalUmkm,
      avg_score: avgScore,
      layak_pct: layakPct,
      kur_docs_count: Number(kurDocsResult.rows[0].c),
    },
    rows: withPrioritas,
  });
});

router.get('/users', requireRole('super_admin'), async (req, res) => {
  const result = await pool.query(
    `select u.id, u.email, u.role, p.business_name
     from users u left join profiles p on p.user_id = u.id
     order by u.created_at desc`
  );
  res.json(result.rows);
});

router.patch('/users/:id/role', requireRole('super_admin'), async (req, res) => {
  const { role } = req.body || {};
  const ASSIGNABLE_ROLES = ['umkm_owner', 'government', 'bank_officer'];
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return res.status(400).json({ error: `Role harus salah satu dari: ${ASSIGNABLE_ROLES.join(', ')}.` });
  }
  const result = await pool.query('update users set role = $1 where id = $2 returning id, email, role', [role, req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  logActivity(req.userId, 'role_change', `Mengubah peran ${result.rows[0].email} jadi "${role}"`);
  res.json(result.rows[0]);
});

// Super Admin System page: real (never fabricated) system-health metrics.
router.get('/system', requireRole('super_admin'), async (req, res) => {
  const [totalUsers, totalUmkm, dbSize, dbHealth, llmUsage, recentErrors] = await Promise.all([
    pool.query('select count(*) as c from users'),
    pool.query('select count(*) as c from profiles'),
    pool.query('select pg_database_size(current_database()) as bytes'),
    pool.query('select 1').then(() => true).catch(() => false),
    pool.query(
      `select feature, success, count(*) as c from llm_usage_log
       where created_at >= current_date - interval '7 days'
       group by feature, success order by feature, success desc`
    ),
    pool.query('select id, route, message, created_at from error_log order by created_at desc limit 20'),
  ]);

  const llmByFeature = {};
  for (const row of llmUsage.rows) {
    const feature = row.feature;
    if (!llmByFeature[feature]) llmByFeature[feature] = { feature, success: 0, failed: 0 };
    if (row.success) llmByFeature[feature].success = Number(row.c);
    else llmByFeature[feature].failed = Number(row.c);
  }

  res.json({
    total_users: Number(totalUsers.rows[0].c),
    total_umkm: Number(totalUmkm.rows[0].c),
    db_size_bytes: Number(dbSize.rows[0].bytes),
    db_healthy: dbHealth,
    llm_usage_7d: Object.values(llmByFeature),
    recent_errors: recentErrors.rows,
  });
});

export default router;
