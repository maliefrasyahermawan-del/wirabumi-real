import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { logActivity } from '../lib/activityLog.js';

const router = Router();
router.use(requireAuth, requireRole('bank_officer', 'government', 'super_admin'));

const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

// Only UMKM who've opted in via profiles.bank_consent appear here - never
// raw transactions/chat, only the same score/simulation already shown
// elsewhere in the app (compute_score, latest kur_documents row).
router.get('/consenting', async (_req, res) => {
  const result = await pool.query(
    `select p.user_id, p.business_name, p.business_category, p.kecamatan,
            s->>'status' as status, (s->>'total_score')::int as skor,
            kd.plafon, kd.tenor_bulan, kd.cicilan_bulanan, kd.generated_at as kur_generated_at,
            coalesce(br.status, 'pending') as review_status, br.notes, br.reviewed_at
     from profiles p
     cross join compute_score(p.user_id) as s
     left join lateral (
       select plafon, tenor_bulan, cicilan_bulanan, generated_at
       from kur_documents kd2
       where kd2.user_id = p.user_id
       order by generated_at desc
       limit 1
     ) kd on true
     left join bank_reviews br on br.user_id = p.user_id
     where p.bank_consent = true
     order by skor asc`
  );
  res.json({ applications: result.rows });
});

router.patch('/:userId/status', async (req, res) => {
  const { userId } = req.params;
  const { status, notes } = req.body || {};
  if (!REVIEW_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status harus salah satu dari: ${REVIEW_STATUSES.join(', ')}.` });
  }

  const consentCheck = await pool.query('select business_name, bank_consent from profiles where user_id = $1', [userId]);
  if (!consentCheck.rows[0]?.bank_consent) {
    return res.status(403).json({ error: 'UMKM ini belum memberi izin untuk dilihat mitra Bank.' });
  }

  const result = await pool.query(
    `insert into bank_reviews (user_id, status, reviewer_id, notes, reviewed_at, updated_at)
     values ($1, $2, $3, $4, now(), now())
     on conflict (user_id) do update
       set status = excluded.status, reviewer_id = excluded.reviewer_id,
           notes = excluded.notes, reviewed_at = now(), updated_at = now()
     returning *`,
    [userId, status, req.userId, notes || null]
  );

  logActivity(req.userId, 'bank_review_status', `Status pengajuan ${consentCheck.rows[0].business_name} diubah jadi "${status}"`);
  res.json(result.rows[0]);
});

export default router;
