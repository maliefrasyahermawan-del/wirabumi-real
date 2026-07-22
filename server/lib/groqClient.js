// Shared Groq API client. Used by llmChatParser.js, llmScoreNarrative.js, and
// llmReceiptParser.js. Never throws — every caller gets back a plain
// {success, ...} object so a Groq outage can never take down the route that
// calls it; the route just falls back to the existing rule-based logic.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 8000;

/**
 * @param {{system: string, user: string, temperature?: number, maxTokens?: number}} params
 * @returns {Promise<{success: true, content: string} | {success: false, error: string}>}
 */
export async function callGroq({ system, user, temperature = 0.1, maxTokens = 1024 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'GROQ_API_KEY tidak diset di .env' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `Groq API error ${res.status}: ${text.slice(0, 300)}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Groq API mengembalikan respons kosong.' };
    }
    return { success: true, content };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: `Groq API timeout setelah ${TIMEOUT_MS / 1000} detik.` };
    }
    return { success: false, error: `Gagal memanggil Groq API: ${err.message}` };
  } finally {
    clearTimeout(timeoutId);
  }
}

// LLM is instructed to reply with raw JSON, but models sometimes wrap it in a
// ```json fence anyway — strip that defensively before JSON.parse instead of
// letting a cosmetic formatting slip take down the whole parse.
export function extractJson(content) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(cleaned);
}
