// LLM-backed replacement for src/lib/chatParser.js's regex heuristic. Same
// job (turn pasted WhatsApp/IG sales chat into draft transaction rows), same
// output shape, but tolerant of the phrasing/typos/multi-item chats the
// regex parser can't reliably handle. Callers MUST still fall back to the
// regex parser when this returns success: false.

import { callGroq, extractJson } from './groqClient.js';

const STATUS_VALUES = ['Lunas', 'DP 50%', 'Belum Lunas'];
const CONFIDENCE_VALUES = ['low', 'medium', 'high'];

const SYSTEM_PROMPT = `Kamu adalah pembaca chat penjualan UMKM Indonesia. Tugasmu: baca potongan obrolan WhatsApp atau caption Instagram penjualan yang informal (banyak singkatan: bu/pak/gan, "rb"/"ribu"/"jt"/"juta", typo, tanpa tanda baca rapi), lalu ekstrak SEMUA transaksi penjualan yang benar-benar terjadi di dalamnya.

Balas HANYA dengan JSON array yang valid (tanpa markdown code block, tanpa penjelasan, tanpa teks lain sama sekali). Array boleh kosong ([]) kalau tidak ada transaksi yang bisa dikenali.

Setiap elemen array adalah satu transaksi, dengan field PERSIS seperti ini:
{
  "tanggal": null,
  "produk": "string, nama produk dalam Title Case. Kalau benar-benar tidak jelas, isi \\"Produk (tidak terdeteksi)\\"",
  "qty": angka (default 1 kalau jumlah tidak disebut),
  "satuan": "string, mis. pcs/kg/lusin/potong (default \\"pcs\\" kalau tidak disebut)",
  "harga": angka total harga transaksi ini dalam Rupiah (ubah \\"320rb\\"/\\"320 ribu\\" jadi 320000, \\"1.2jt\\"/\\"1,2 juta\\" jadi 1200000, dst — HARUS angka murni tanpa titik/koma/text),
  "status": salah satu dari "Lunas" | "DP 50%" | "Belum Lunas" (Lunas kalau ada kata sudah/udah/transfer/lunas dikonfirmasi; "DP 50%" kalau disebut DP/setengah/uang muka; "Belum Lunas" kalau belum ada konfirmasi pembayaran sama sekali),
  "pelanggan": nama/panggilan pembeli KALAU disebutkan eksplisit di teks (mis. disapa "Bu Ani"), kalau tidak disebutkan isi null — JANGAN mengarang nama,
  "confidence": "high" kalau qty DAN harga sama-sama jelas disebut dan nama produk tidak ambigu; "medium" kalau sebagian info harus ditebak; "low" kalau sebagian besar field terpaksa ditebak
}

Field "tanggal" SELALU null (tanggal transaksi ditentukan terpisah oleh pengguna, bukan dari isi chat).

Kalau chat menyebut beberapa transaksi berbeda (produk/harga berbeda di titik berbeda), kembalikan beberapa elemen array. Kalau itu cuma satu percakapan tawar-menawar untuk SATU penjualan, kembalikan tepat satu elemen.`;

function coerceNumber(val, fallback = 0) {
  const n = typeof val === 'number' ? val : parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeRow(raw) {
  const produk = typeof raw.produk === 'string' && raw.produk.trim() ? raw.produk.trim() : 'Produk (tidak terdeteksi)';
  const status = STATUS_VALUES.includes(raw.status) ? raw.status : 'Lunas';
  const confidence = CONFIDENCE_VALUES.includes(raw.confidence) ? raw.confidence : 'medium';
  const pelanggan = typeof raw.pelanggan === 'string' && raw.pelanggan.trim() ? raw.pelanggan.trim() : '';

  return {
    tanggal: null,
    produk,
    qty: Math.max(0, coerceNumber(raw.qty, 1)) || 1,
    satuan: typeof raw.satuan === 'string' && raw.satuan.trim() ? raw.satuan.trim() : 'pcs',
    harga: Math.max(0, Math.round(coerceNumber(raw.harga, 0))),
    status,
    pelanggan,
    confidence,
    raw: '',
  };
}

/**
 * @param {string} rawText
 * @returns {Promise<{success: true, rows: Array<object>} | {success: false, error: string}>}
 */
export async function parseChatWithLLM(rawText) {
  const result = await callGroq({
    system: SYSTEM_PROMPT,
    user: rawText,
    feature: 'chat_parser',
    temperature: 0.1,
    maxTokens: 1500,
  });

  if (!result.success) return result;

  let parsed;
  try {
    parsed = extractJson(result.content);
  } catch {
    return { success: false, error: 'Groq mengembalikan JSON yang tidak valid.' };
  }

  if (!Array.isArray(parsed)) {
    return { success: false, error: 'Groq tidak mengembalikan array JSON seperti yang diminta.' };
  }

  return { success: true, rows: parsed.map(sanitizeRow) };
}
