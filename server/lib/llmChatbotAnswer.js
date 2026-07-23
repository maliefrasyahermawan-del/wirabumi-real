// LLM-backed replacement for Mas Sido's keyword-matched answers
// (src/lib/chatbotAnswer.js). Same grounding data, same persona, but able to
// handle real natural-language questions instead of a fixed regex list.

import { callGroq } from './groqClient.js';

const SYSTEM_PROMPT = `Kamu adalah Mas Sido, asisten keuangan WIRABUMI untuk pelaku UMKM. Namamu diambil dari kata "sido" pada motif batik Sidomukti (bahasa Jawa: "jadi"/"tercapai").

Kamu akan diberi data usaha pengguna dalam JSON (skor kelayakan & 4 faktornya, simulasi KUR, omzet & jumlah transaksi bulan ini, produk terlaris, status legalitas) dan satu pertanyaan dari pengguna. Jawab pertanyaan itu HANYA berdasarkan data yang diberikan.

Aturan:
- JANGAN PERNAH mengarang angka yang tidak ada di data yang diberikan.
- Kalau data yang diberikan tidak cukup untuk menjawab (mis. pertanyaan di luar topik usaha/keuangan, atau datanya kosong/nol), jawab jujur bahwa kamu tidak punya info itu, dan sarankan topik yang BISA kamu jawab (omzet, skor kelayakan, plafon & angsuran KUR, produk terlaris, legalitas).
- Jawab singkat (1-3 kalimat), bahasa Indonesia santai/ramah seperti bicara ke teman pemilik usaha, boleh sesekali emoji tapi jangan berlebihan.
- Balas HANYA jawabannya saja - tanpa embel-embel seperti "Jawaban:", tanpa tanda kutip di awal/akhir, tanpa markdown.`;

/**
 * @param {string} question
 * @param {object} ctx - same shape Chatbot.jsx already assembles: {score, offer, monthTotal, monthCount, topProducts, legal}
 * @returns {Promise<{success: true, answer: string} | {success: false, error: string}>}
 */
export async function answerWithLLM(question, ctx) {
  const result = await callGroq({
    system: SYSTEM_PROMPT,
    user: JSON.stringify({ pertanyaan: question, data: ctx }),
    feature: 'chatbot',
    temperature: 0.4,
    maxTokens: 300,
  });

  if (!result.success) return result;

  const text = result.content.trim().replace(/^"|"$/g, '');
  if (!text) return { success: false, error: 'Groq mengembalikan jawaban kosong.' };
  return { success: true, answer: text };
}
