// Turns the 4 score factors compute_score() already produced into a short,
// personal, Bahasa Indonesia narrative. This is a read-only presentation
// layer on top of the SQL score — it never feeds back into total_score/status
// and the LLM is only ever shown the numbers that already exist, so it has
// nothing to invent from.

import { callGroq } from './groqClient.js';

const SYSTEM_PROMPT = `Kamu menulis narasi singkat berbahasa Indonesia yang santai dan personal untuk pemilik UMKM, berdasarkan skor kelayakan usaha mereka.

Kamu akan diberi angka skor total (0-100), status ("Layak Diajukan" atau "Perlu Peningkatan"), dan rincian 4 faktor beserta nilainya (Konsistensi transaksi harian, Volume penjualan bulanan, Rasio pelanggan tetap, Kelengkapan dokumen legalitas).

Tulis 2-3 kalimat yang:
- HANYA merujuk ke angka yang diberikan — JANGAN mengarang angka atau fakta baru.
- Menyebut faktor yang paling KUAT dan faktor yang paling LEMAH beserta nilainya.
- Memberi satu saran konkret terkait faktor terlemah, ditulis sebagai potensi ("berpotensi naik ke...", bukan janji pasti).
- Bernada santai, ramah, menyemangati — seperti bicara ke teman pemilik toko, bukan laporan formal.

Balas HANYA teks narasinya saja, tanpa tanda kutip di awal/akhir, tanpa markdown, tanpa embel-embel lain.`;

function staticFallback(score) {
  const isLayak = score.status === 'Layak Diajukan';
  return isLayak
    ? `Skor kelayakanmu ${score.total_score}/100 — sudah masuk kategori "Layak Diajukan" untuk KUR mikro.`
    : `Skor kelayakanmu ${score.total_score}/100 — masih perlu ditingkatkan untuk masuk kategori "Layak Diajukan".`;
}

/**
 * @param {{total_score: number, status: string, factors: Array<{name: string, val: number}>}} score
 * @returns {Promise<{narrative: string, source: 'llm' | 'fallback'}>}
 */
export async function generateScoreNarrative(score) {
  const result = await callGroq({
    system: SYSTEM_PROMPT,
    user: JSON.stringify({
      skor_total: score.total_score,
      status: score.status,
      faktor: score.factors.map((f) => ({ nama: f.name, nilai: f.val })),
    }),
    feature: 'score_narrative',
    temperature: 0.4,
    maxTokens: 220,
  });

  if (!result.success) {
    console.warn('[score narrative] Groq gagal, pakai fallback statis:', result.error);
    return { narrative: staticFallback(score), source: 'fallback' };
  }

  const text = result.content.trim().replace(/^"|"$/g, '');
  if (!text) return { narrative: staticFallback(score), source: 'fallback' };
  return { narrative: text, source: 'llm' };
}
