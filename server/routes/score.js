import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { generateScoreNarrative } from '../lib/llmScoreNarrative.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const result = await pool.query('select compute_score($1) as score', [req.userId]);
  const score = result.rows[0].score;
  const { narrative, source } = await generateScoreNarrative(score);
  res.json({ ...score, narrative, narrative_source: source });
});

export default router;
