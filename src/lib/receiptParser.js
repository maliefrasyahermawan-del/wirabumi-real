// Heuristic parser for bank-transfer confirmation screenshots (BCA/BNI/BI-FAST
// style "m-Transfer: BERHASIL" receipts), run AFTER Tesseract.js OCR has
// already turned the photo into raw text. No external AI - pure rule-based
// text extraction, same philosophy as chatParser.js. OCR is never perfect, so
// the caller must show the result in an editable review table before saving.

function parseAmount(str) {
  if (!str) return 0;
  let s = str.trim();
  // Bank apps show amounts as "89,000.00" or "89.000,00" - either way the
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

const BULAN = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

function findTanggal(joined) {
  // "23 Jul 2026" / "07 Jul 2026" / "15 Jul 2026, 15:47 WIB" style (wondr, DANA, GoPay, Jago)
  const named = joined.match(/(\d{1,2})\s+([a-z]{3,})\s+(\d{4})/i);
  if (named) {
    const bulan = BULAN[named[2].slice(0, 3).toLowerCase()];
    if (bulan) return toIsoDate(named[1], bulan, named[3]);
  }
  // "23/07/2026" or "23-07-2026" style (older bank m-Transfer receipts)
  const numeric = joined.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (numeric) return toIsoDate(numeric[1], numeric[2], numeric[3]);
  return null;
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
  if (/berhasil|success|selesai/i.test(joined)) statusTerbaca = 'berhasil';
  else if (/gagal|ditolak|failed|dibatalkan/i.test(joined)) statusTerbaca = 'gagal';

  const tanggal = findTanggal(joined);

  let harga = 0;
  const labeledAmount = joined.match(
    /(?:nominal\s*transfer|total\s*payment|total|nominal|jumlah\s*transfer|jumlah)\s*[:\-]?\s*rp\.?\s*([\d.,]+)/i
  );
  if (labeledAmount) harga = parseAmount(labeledAmount[1]);
  if (!harga) {
    const anyRp = joined.match(/rp\.?\s*([\d.,]{4,})/i);
    if (anyRp) harga = parseAmount(anyRp[1]);
  }

  let biaya = 0;
  const biayaMatch = joined.match(/biaya\s*(?:admin)?\s*rp\.?\s*([\d.,]+)/i);
  if (biayaMatch) biaya = parseAmount(biayaMatch[1]);

  let berita = '';
  const beritaMatch = joined.match(/berita\s*[:\-]?\s*(.+)/i);
  if (beritaMatch) berita = beritaMatch[1].split('\n')[0].trim();

  let tujuanTransaksi = '';
  const tujuanMatch = joined.match(/tujuan\s*transaksi\s*[:\-]?\s*(.+)/i);
  if (tujuanMatch) tujuanTransaksi = tujuanMatch[1].split('\n')[0].trim();

  let ref = '';
  const refMatch = joined.match(
    /(?:ref\.?\s*id|no\.?\s*referensi|transaction\s*id|id\s*transaksi|no\.?\s*transaksi|merchant\s*order\s*id)\s*[:\-]?\s*([a-z0-9]{4,})/i
  );
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
    const nameOnAccLine = accLine.replace(/\d{6,}/, '').replace(/^[\s\- - ]+/, '').trim();
    namaPenerima = nameOnAccLine || (lines[tujuanIdx + 3] || '').trim() || null;
  }

  // E-wallet receipts (wondr/DANA/GoPay/Jago) rarely use "Berita"/"Tujuan
  // Transaksi" - they show a merchant/recipient name instead, either behind
  // a "Merchant Name" label or as the line right after a standalone "Tujuan"
  // heading.
  let merchantName = '';
  const merchantMatch = joined.match(/merchant\s*name\s*[:\-]?\s*(.+)/i);
  if (merchantMatch) merchantName = merchantMatch[1].split('\n')[0].trim();
  if (!merchantName) {
    const tujuanHeadingIdx = lines.findIndex((l) => /^tujuan$/i.test(l));
    if (tujuanHeadingIdx >= 0 && lines[tujuanHeadingIdx + 1]) {
      merchantName = lines[tujuanHeadingIdx + 1].trim();
    }
  }

  const produk = merchantName || berita || tujuanTransaksi || 'Pembayaran';

  let confidence = 'low';
  if (harga > 0 && tanggal) confidence = statusTerbaca === 'berhasil' ? 'high' : 'medium';
  else if (harga > 0) confidence = 'medium';

  return { tanggal, harga, biaya, bank, rekeningTujuan, namaPenerima, berita, tujuanTransaksi, ref, produk, statusTerbaca, confidence };
}
