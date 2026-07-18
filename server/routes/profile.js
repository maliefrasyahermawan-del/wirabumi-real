import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const EDITABLE_FIELDS = ['business_name', 'business_category', 'business_address', 'kecamatan', 'phone', 'legal_nib', 'legal_pirt', 'legal_halal'];

router.patch('/', async (req, res) => {
  const updates = Object.entries(req.body || {}).filter(([k]) => EDITABLE_FIELDS.includes(k));
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada field valid untuk diperbarui.' });

  const setClause = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = updates.map(([, v]) => v);
  const result = await pool.query(
    `update profiles set ${setClause} where user_id = $1 returning *`,
    [req.userId, ...values]
  );
  res.json(result.rows[0]);
});

export default router;
