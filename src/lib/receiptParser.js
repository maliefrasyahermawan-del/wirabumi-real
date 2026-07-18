// Heuristic parser for bank-transfer confirmation screenshots (BCA/BNI/BI-FAST
// style "m-Transfer: BERHASIL" receipts), run AFTER Tesseract.js OCR has
// already turned the photo into raw text. No external AI — pure rule-based
// text extraction, same philosophy as chatParser.js. OCR is never perfect, so
// the caller must show the result in an editable review table before saving.

function parseAmount(str) {
  if (!str) return 0;
  let s = str.trim();
  // Bank apps show amounts as "89,000.00" or "89.000,00" — either way the
  // last separator+two-digits is the cents, everything else is a thousands
  // separator to strip.
  s = s.replace(/[.,]\d{2}$/, '');
  s = s.replace(/[.,]/g, '');
  return parseInt(s, 10) || 0;
}

function toIsoDate(dd, mm, yyyy) {
  const d = String(dd).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return `${yyyy}-${m}-${d}`;
}

/**
 * @param {string} rawText - raw OCR output
 * @returns {{
 *   tanggal: string|null, harga: number, biaya: number, bank: string|null,
 *   rekeningTujuan: string|null, namaPenerima: string|null, berita: string,
 *   tujuanTransaksi: string, ref: string, produk: string,
 *   statusTerbaca: 'berhasil'|'gagal'|null, confidence: 'low'|'medium'|'high',
 * }}
 */
export function parseReceiptText(rawText) {
  const text = (rawText || '').replace(/\r/g, '');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const joined = text;

  let statusTerbaca = null;
  if (/berhasil/i.test(joined)) statusTerbaca = 'berhasil';
  else if (/gagal|ditolak|failed/i.test(joined)) statusTerbaca = 'gagal';

  let tanggal = null;
  const dateMatch = joined.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (dateMatch) tanggal = toIsoDate(dateMatch[1], dateMatch[2], dateMatch[3]);

  let harga = 0;
  const nominalMatch = joined.match(/nominal\s*transfer\s*rp\.?\s*([\d.,]+)/i);
  if (nominalMatch) harga = parseAmount(nominalMatch[1]);
  if (!harga) {
    const anyRp = joined.match(/rp\.?\s*([\d.,]{4,})/i);
    if (anyRp) harga = parseAmount(anyRp[1]);
  }

  let biaya = 0;
  const biayaMatch = joined.match(/biaya\s*rp\.?\s*([\d.,]+)/i);
  if (biayaMatch) biaya = parseAmount(biayaMatch[1]);

  let berita = '';
  const beritaMatch = joined.match(/berita\s*[:\-]?\s*(.+)/i);
  if (beritaMatch) berita = beritaMatch[1].split('\n')[0].trim();

  let tujuanTransaksi = '';
  const tujuanMatch = joined.match(/tujuan\s*transaksi\s*[:\-]?\s*(.+)/i);
  if (tujuanMatch) tujuanTransaksi = tujuanMatch[1].split('\n')[0].trim();

  let ref = '';
  const refMatch = joined.match(/\bref\.?\s*([a-z0-9]+)/i);
  if (refMatch) ref = refMatch[1].trim();

  let bank = null;
  let rekeningTujuan = null;
  let namaPenerima = null;
  const tujuanIdx = lines.findIndex((l) => /rekening\s*tujuan/i.test(l));
  if (tujuanIdx >= 0) {
    bank = lines[tujuanIdx + 1] || null;
    const accLine = lines[tujuanIdx + 2] || '';
    const accMatch = accLine.match(/(\d{6,})/);
    if (accMatch) rekeningTujuan = accMatch[1];
    const nameOnAccLine = accLine.replace(/\d{6,}/, '').replace(/^[\s\-–]+/, '').trim();
    namaPenerima = nameOnAccLine || (lines[tujuanIdx + 3] || '').trim() || null;
  }

  const produk = berita || tujuanTransaksi || 'Pembayaran via transfer bank';

  let confidence = 'low';
  if (harga > 0 && tanggal) confidence = statusTerbaca === 'berhasil' ? 'high' : 'medium';
  else if (harga > 0) confidence = 'medium';

  return { tanggal, harga, biaya, bank, rekeningTujuan, namaPenerima, berita, tujuanTransaksi, ref, produk, statusTerbaca, confidence };
}
