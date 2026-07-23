import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/platform-stats', async (_req, res) => {
  const result = await pool.query('select platform_stats() as stats');
  res.json(result.rows[0].stats);
});

export default router;
