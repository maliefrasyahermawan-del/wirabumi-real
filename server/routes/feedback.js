import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  const message = (req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Ulasan tidak boleh kosong.' });
  if (message.length > 500) return res.status(400).json({ error: 'Ulasan maksimal 500 karakter.' });

  const result = await pool.query(
    'insert into feedback (user_id, message) values ($1, $2) returning *',
    [req.userId, message]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
