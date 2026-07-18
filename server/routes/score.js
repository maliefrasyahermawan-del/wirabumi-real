import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query('select compute_score($1) as score', [req.userId]);
  res.json(result.rows[0].score);
});

export default router;
