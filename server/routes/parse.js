import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { parseChatToTransactions } from '../../src/lib/chatParser.js';
import { parseReceiptText } from '../../src/lib/receiptParser.js';
import { parseChatWithLLM } from '../lib/llmChatParser.js';
import { parseReceiptWithLLM } from '../lib/llmReceiptParser.js';

const router = Router();
router.use(requireAuth);

// Tempel Chat: try the Groq LLM first (handles messy real-world phrasing far
// better than regex), and fall back to the original rule-based parser the
// instant anything about the LLM call goes wrong — a live demo can't afford
// this endpoint to ever hard-fail just because Groq is slow/down/rate-limited.
router.post('/chat', async (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Teks chat tidak boleh kosong.' });

  const llmResult = await parseChatWithLLM(text);
  if (llmResult.success) {
    return res.json({ rows: llmResult.rows, source: 'llm' });
  }

  console.warn('[parse/chat] Groq gagal, pakai fallback regex:', llmResult.error);
  const rows = parseChatToTransactions(text).map((r) => ({ ...r, pelanggan: '' }));
  res.json({ rows, source: 'rule-based-fallback' });
});

// Unggah Foto: frontend runs Tesseract OCR client-side (unchanged) and only
// sends the resulting raw text here. Same LLM-first, regex-fallback pattern
// as /chat above.
router.post('/receipt', async (req, res) => {
  const text = (req.body?.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Teks hasil OCR tidak boleh kosong.' });

  const llmResult = await parseReceiptWithLLM(text);
  if (llmResult.success) {
    return res.json({ result: llmResult.result, source: 'llm' });
  }

  console.warn('[parse/receipt] Groq gagal, pakai fallback regex:', llmResult.error);
  res.json({ result: parseReceiptText(text), source: 'rule-based-fallback' });
});

export default router;
