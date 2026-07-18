import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// A "conversation" is one user question + one bot answer (2 rows), so keeping
// the most recent 5 conversations means keeping the most recent 10 messages.
const MAX_MESSAGES = 10;

router.get('/', async (req, res) => {
  const result = await pool.query(
    'select * from chat_messages where user_id = $1 order by created_at asc limit 50',
    [req.userId]
  );
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { role, text } = req.body || {};
  if (!['user', 'bot'].includes(role) || !text) return res.status(400).json({ error: 'role dan text wajib diisi.' });
  const result = await pool.query(
    'insert into chat_messages (user_id, role, text) values ($1, $2, $3) returning *',
    [req.userId, role, text]
  );
  await pool.query(
    `delete from chat_messages
     where user_id = $1
       and id not in (select id from chat_messages where user_id = $1 order by created_at desc limit $2)`,
    [req.userId, MAX_MESSAGES]
  );
  res.status(201).json(result.rows[0]);
});

export default router;
