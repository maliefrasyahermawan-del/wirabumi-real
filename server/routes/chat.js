import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { buildAnswer } from '../../src/lib/chatbotAnswer.js';
import { answerWithLLM } from '../lib/llmChatbotAnswer.js';

const router = Router();
router.use(requireAuth);

// Mira: try the Groq LLM first (handles real free-form questions instead
// of a fixed keyword list), fall back to the original rule-based answer
// engine the instant anything about the LLM call goes wrong.
router.post('/ask', async (req, res) => {
  const question = (req.body?.question || '').trim();
  const ctx = req.body?.ctx;
  const bahasa = req.body?.bahasa;
  if (!question) return res.status(400).json({ error: 'Pertanyaan tidak boleh kosong.' });
  if (!ctx || typeof ctx !== 'object') return res.status(400).json({ error: 'Konteks data tidak ada.' });

  const llmResult = await answerWithLLM(question, ctx, bahasa);
  if (llmResult.success) {
    return res.json({ answer: llmResult.answer, source: 'llm' });
  }

  console.warn('[chat/ask] Groq gagal, pakai fallback keyword:', llmResult.error);
  res.json({ answer: buildAnswer(question, ctx), source: 'rule-based-fallback' });
});

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
