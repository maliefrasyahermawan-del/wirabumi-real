import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();

// The aggregate Dinkop dashboard used to be public (no login). It's now
// private — only Government, Bank, and Super Admin can view it. UMKM
// Owners never see this; they only ever see their own personal dashboard.
router.use(requireAuth, requireRole('government', 'bank_officer', 'super_admin'));

router.get('/', async (_req, res) => {
  const result = await pool.query('select dinkop_dashboard() as data');
  res.json(result.rows[0].data);
});

export default router;
