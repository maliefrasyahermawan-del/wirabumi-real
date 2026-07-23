// LLM-backed replacement for src/lib/receiptParser.js's regex heuristic.
// Tesseract OCR output is noisy (misread characters, broken line wraps), and
// an LLM tolerates that far better than rigid regex. "produk" and
// "confidence" are still derived deterministically in JS afterward (same
// formula receiptParser.js uses) so those two fields mean the same thing
// app-wide regardless of which path produced a given transaction.

import { callGroq, extractJson } from './groqClient.js';

const SYSTEM_PROMPT = `Kamu membaca teks hasil OCR (mungkin berantakan: huruf salah baca, baris terpotong, spasi aneh) dari layar konfirmasi transfer bank Indonesia (mis. m-Transfer BCA, BNI, BI-FAST).

Balas HANYA dengan JSON object (tanpa markdown, tanpa penjelasan), field PERSIS seperti ini:
{
  "tanggal": "YYYY-MM-DD, atau null kalau tidak ketemu tanggal",
  "harga": angka nominal TRANSFER dalam Rupiah, angka murni tanpa titik/koma/text (0 kalau tidak ketemu),
  "biaya": angka biaya admin/transfer dalam Rupiah kalau disebutkan (0 kalau tidak ada),
  "bank": "nama bank tujuan, atau null",
  "rekeningTujuan": "nomor rekening tujuan, hanya digit, atau null",
  "namaPenerima": "nama pemilik rekening tujuan, atau null",
  "berita": "isi field Berita/catatan transfer kalau ada, string kosong kalau tidak ada",
  "tujuanTransaksi": "isi field Tujuan Transaksi kalau ada, string kosong kalau tidak ada",
  "ref": "nomor referensi/ID transaksi kalau ada, string kosong kalau tidak ada",
  "statusTerbaca": "berhasil" atau "gagal" atau null kalau tidak jelas
}

Lakukan yang terbaik untuk tetap menangkap nominal dan tanggal meski teksnya berantakan. JANGAN mengarang nilai yang sama sekali tidak ada petunjuknya - isi null/0/string kosong sesuai jenis fieldnya.`;

function coerceAmount(val) {
  const n = typeof val === 'number' ? val : parseFloat(val);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

function cleanString(val) {
  return typeof val === 'string' && val.trim() ? val.trim() : null;
}

// Same rule as receiptParser.js's own confidence heuristic, kept identical so
// "confidence" carries the same meaning no matter which parser produced it.
function deriveConfidence(harga, tanggal, statusTerbaca) {
  if (harga > 0 && tanggal) return statusTerbaca === 'berhasil' ? 'high' : 'medium';
  if (harga > 0) return 'medium';
  return 'low';
}

/**
 * @param {string} rawText - raw OCR output
 * @returns {Promise<{success: true, result: object} | {success: false, error: string}>}
 */
export async function parseReceiptWithLLM(rawText) {
  const result = await callGroq({
    system: SYSTEM_PROMPT,
    user: rawText,
    feature: 'receipt_parser',
    temperature: 0.1,
    maxTokens: 500,
  });

  if (!result.success) return result;

  let parsed;
  try {
    parsed = extractJson(result.content);
  } catch {
    return { success: false, error: 'Groq mengembalikan JSON yang tidak valid.' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { success: false, error: 'Groq tidak mengembalikan objek JSON seperti yang diminta.' };
  }

  const harga = coerceAmount(parsed.harga);
  const biaya = coerceAmount(parsed.biaya);
  const tanggal = typeof parsed.tanggal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.tanggal) ? parsed.tanggal : null;
  const statusTerbaca = ['berhasil', 'gagal'].includes(parsed.statusTerbaca) ? parsed.statusTerbaca : null;
  const berita = typeof parsed.berita === 'string' ? parsed.berita.trim() : '';
  const tujuanTransaksi = typeof parsed.tujuanTransaksi === 'string' ? parsed.tujuanTransaksi.trim() : '';
  // Mirrors receiptParser.js's own fallback chain exactly: berita || tujuanTransaksi || default.
  const produk = berita || tujuanTransaksi || 'Pembayaran via transfer bank';

  return {
    success: true,
    result: {
      tanggal,
      harga,
      biaya,
      bank: cleanString(parsed.bank),
      rekeningTujuan: cleanString(parsed.rekeningTujuan),
      namaPenerima: cleanString(parsed.namaPenerima),
      berita,
      tujuanTransaksi,
      ref: typeof parsed.ref === 'string' ? parsed.ref.trim() : '',
      produk,
      statusTerbaca,
      confidence: deriveConfidence(harga, tanggal, statusTerbaca),
    },
  };
}
