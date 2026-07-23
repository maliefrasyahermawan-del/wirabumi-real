import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import {
  generateUmkmInsight,
  generateGovernmentInsight,
  generateBankInsight,
  generateSuperAdminInsight,
} from '../lib/llmInsight.js';

const router = Router();
router.use(requireAuth);

router.get('/umkm', async (req, res) => {
  const [scoreRes, trendRes, profileRes] = await Promise.all([
    pool.query('select compute_score($1) as s', [req.userId]),
    pool.query(
      `select
         coalesce(sum(harga) filter (where tanggal >= current_date - interval '30 days'), 0) as last30,
         coalesce(sum(harga) filter (where tanggal >= current_date - interval '60 days' and tanggal < current_date - interval '30 days'), 0) as prev30
       from transactions where user_id = $1`,
      [req.userId]
    ),
    pool.query('select business_name, legal_nib, legal_pirt, legal_halal from profiles where user_id = $1', [req.userId]),
  ]);

  const data = {
    score: scoreRes.rows[0].s,
    omzet_30_hari: Number(trendRes.rows[0].last30),
    omzet_30_hari_sebelumnya: Number(trendRes.rows[0].prev30),
    legal: profileRes.rows[0],
  };
  const { insight, source } = await generateUmkmInsight(data);
  res.json({ insight, source });
});

router.get('/government', requireRole('government', 'super_admin'), async (req, res) => {
  const [dinkopRes, activeRes] = await Promise.all([
    pool.query('select dinkop_dashboard() as d'),
    pool.query(`select count(distinct user_id) as c from activity_log where created_at >= now() - interval '24 hours'`),
  ]);
  const data = { aggregate: dinkopRes.rows[0].d, active_users_24h: Number(activeRes.rows[0].c) };
  const { insight, source } = await generateGovernmentInsight(data);
  res.json({ insight, source });
});

router.get('/bank', requireRole('bank_officer', 'government', 'super_admin'), async (req, res) => {
  const result = await pool.query(
    `select coalesce(br.status, 'pending') as status, count(*) as c, round(avg((s->>'total_score')::int)) as avg_score
     from profiles p
     cross join compute_score(p.user_id) as s
     left join bank_reviews br on br.user_id = p.user_id
     where p.bank_consent = true
     group by coalesce(br.status, 'pending')`
  );
  const data = {
    by_status: result.rows.map((r) => ({
      status: r.status,
      count: Number(r.c),
      avg_score: r.avg_score === null ? null : Number(r.avg_score),
    })),
  };
  const { insight, source } = await generateBankInsight(data);
  res.json({ insight, source });
});

router.get('/super-admin', requireRole('super_admin'), async (req, res) => {
  const [usersRes, llmRes, errorsRes] = await Promise.all([
    pool.query('select role, count(*) as c from users group by role'),
    pool.query(
      `select feature, success, count(*) as c from llm_usage_log
       where created_at >= current_date - interval '7 days'
       group by feature, success`
    ),
    pool.query(`select count(*) as c from error_log where created_at >= current_date - interval '7 days'`),
  ]);
  const data = {
    users_by_role: usersRes.rows.map((r) => ({ role: r.role, count: Number(r.c) })),
    llm_usage: llmRes.rows.map((r) => ({ feature: r.feature, success: r.success, count: Number(r.c) })),
    errors_7d: Number(errorsRes.rows[0].c),
  };
  const { insight, source } = await generateSuperAdminInsight(data);
  res.json({ insight, source });
});

export default router;
