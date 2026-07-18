import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/offer', async (req, res) => {
  const tenor = parseInt(req.query.tenor, 10) || 24;
  if (![12, 24, 36].includes(tenor)) return res.status(400).json({ error: 'Tenor harus 12, 24, atau 36 bulan.' });
  const result = await pool.query('select get_kur_offer($1, $2) as offer', [req.userId, tenor]);
  res.json(result.rows[0].offer);
});

router.post('/documents', async (req, res) => {
  const { plafon, tenor_bulan, cicilan_bulanan, skor_saat_itu } = req.body || {};
  const result = await pool.query(
    `insert into kur_documents (user_id, plafon, tenor_bulan, cicilan_bulanan, skor_saat_itu)
     values ($1, $2, $3, $4, $5) returning *`,
    [req.userId, plafon, tenor_bulan, cicilan_bulanan, skor_saat_itu]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
