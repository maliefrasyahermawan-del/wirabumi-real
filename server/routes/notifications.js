import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

function rupiah(n) {
  return 'Rp' + Math.round(Number(n) || 0).toLocaleString('id-ID');
}

// ISO 8601 week key (e.g. "2026-W29") so the weekly-drop notification is
// generated at most once per calendar week regardless of when it's checked.
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function upsertNotification(userId, type, dedupeKey, title) {
  await pool.query(
    `insert into notifications (user_id, type, dedupe_key, title) values ($1, $2, $3, $4)
     on conflict (user_id, dedupe_key) do nothing`,
    [userId, type, dedupeKey, title]
  );
}

async function ensureNotifications(userId) {
  const today = new Date().toISOString().slice(0, 10);

  const capture = await pool.query(
    `select count(*) c, coalesce(sum(harga),0) total from transactions
     where user_id = $1 and created_at::date = current_date`,
    [userId]
  );
  const captureCount = Number(capture.rows[0].c);
  if (captureCount > 0) {
    const title = `${captureCount} transaksi baru terdeteksi hari ini, total ${rupiah(capture.rows[0].total)}`;
    await upsertNotification(userId, 'capture_daily', `capture-${today}`, title);
  }

  const lowConf = await pool.query(
    `select count(*) c from transactions
     where user_id = $1 and confidence in ('low','medium') and source in ('chat_parse','photo_ocr')
       and created_at >= current_date - interval '7 days'`,
    [userId]
  );
  const lowConfCount = Number(lowConf.rows[0].c);
  if (lowConfCount > 0) {
    const title = lowConfCount === 1
      ? 'Ada 1 chat yang WIRABUMI kurang yakin bacanya, cek & koreksi manual?'
      : `Ada ${lowConfCount} chat yang WIRABUMI kurang yakin bacanya, cek & koreksi manual?`;
    await upsertNotification(userId, 'low_confidence', `low-confidence-${today}`, title);
  }

  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const recapKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const recap = await pool.query(
    `select count(*) c, coalesce(sum(harga),0) total from transactions
     where user_id = $1
       and tanggal >= date_trunc('month', current_date - interval '1 month')
       and tanggal < date_trunc('month', current_date)`,
    [userId]
  );
  const recapCount = Number(recap.rows[0].c);
  if (recapCount > 0) {
    const monthName = prevMonthDate.toLocaleDateString('id-ID', { month: 'long' });
    const title = `Pembukuan bulan ${monthName} selesai disusun, ${recapCount} transaksi, total ${rupiah(recap.rows[0].total)}`;
    await upsertNotification(userId, 'monthly_recap', `recap-${recapKey}`, title);
  }

  const thisWeek = await pool.query(
    `select coalesce(sum(harga),0) total from transactions
     where user_id = $1 and tanggal >= current_date - interval '6 days'`,
    [userId]
  );
  const thisWeekTotal = Number(thisWeek.rows[0].total);
  const trailingAvg = await pool.query(
    `select coalesce(avg(weekly_total),0) avg_total from (
       select date_trunc('week', tanggal) wk, sum(harga) weekly_total
       from transactions
       where user_id = $1 and tanggal >= current_date - interval '34 days' and tanggal < current_date - interval '6 days'
       group by wk
     ) t`,
    [userId]
  );
  const avgWeekTotal = Number(trailingAvg.rows[0].avg_total);
  if (avgWeekTotal > 0 && thisWeekTotal < avgWeekTotal * 0.8) {
    const pct = Math.round((1 - thisWeekTotal / avgWeekTotal) * 100);
    const title = `Omzetmu turun ${pct}% minggu ini dibanding rata-rata, lihat detail?`;
    await upsertNotification(userId, 'weekly_drop', `weekly-drop-${isoWeekKey(now)}`, title);
  }

  // Score-increase: only fires when we already had a prior snapshot to compare
  // against (so the very first check-in of a brand-new account stays quiet),
  // and only when the real compute_score() total has actually gone up.
  const scoreRes = await pool.query('select compute_score($1) as s', [userId]);
  const currentScore = scoreRes.rows[0].s.total_score;
  const snapshotRes = await pool.query('select last_score from score_snapshots where user_id = $1', [userId]);
  const lastScore = snapshotRes.rows[0]?.last_score;
  if (lastScore !== undefined && currentScore > lastScore) {
    const title = `Skormu naik jadi ${currentScore}!`;
    await upsertNotification(userId, 'score_increase', `score-${currentScore}-${today}`, title);
  }
  if (lastScore !== currentScore) {
    await pool.query(
      `insert into score_snapshots (user_id, last_score) values ($1, $2)
       on conflict (user_id) do update set last_score = excluded.last_score, updated_at = now()`,
      [userId, currentScore]
    );
  }
}

router.get('/', async (req, res) => {
  await ensureNotifications(req.userId);
  const result = await pool.query(
    'select id, type, title, created_at, read_at from notifications where user_id = $1 order by created_at desc limit 30',
    [req.userId]
  );
  res.json({
    notifications: result.rows,
    unread_count: result.rows.filter((r) => !r.read_at).length,
  });
});

router.post('/:id/read', async (req, res) => {
  await pool.query(
    'update notifications set read_at = now() where id = $1 and user_id = $2 and read_at is null',
    [req.params.id, req.userId]
  );
  res.status(204).end();
});

router.post('/read-all', async (req, res) => {
  await pool.query(
    'update notifications set read_at = now() where user_id = $1 and read_at is null',
    [req.userId]
  );
  res.status(204).end();
});

export default router;
