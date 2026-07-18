// Heuristic parser for informal Indonesian sales chat (WhatsApp / IG DM text
// pasted in as-is). No external AI — pure rule-based extraction. Because
// heuristics are never perfect, the caller is expected to show the result in
// an editable review table before anything is saved.

const UNIT_WORDS = ['pcs', 'buah', 'potong', 'lembar', 'kg', 'gram', 'gr', 'liter', 'ltr', 'm', 'meter', 'kodi', 'lusin', 'set', 'paket', 'box', 'dus'];
const COMPLETE_KEYWORDS = /\b(total|sudah|udah|transfer|lunas|sip|oke|ok|masuk|terima kasih|makasih)\b/i;
const DP_KEYWORDS = /\bdp\b|\b50%|\bsetengah\b/i;
const TOTAL_KEYWORD = /\btotal(nya)?\b/i;

const FILLER_WORDS = new Set([
  'bu', 'pak', 'kak', 'gan', 'min', 'sis', 'bang', 'mas', 'mba', 'mbak',
  'ready', 'masih', 'ada', 'ambil', 'saya', 'ya', 'yah', 'kan', 'oke', 'ok', 'sip',
  'sudah', 'udah', 'blm', 'belum', 'terima', 'kasih', 'makasih', 'dikirim', 'kirim',
  'sore', 'pagi', 'siang', 'malam', 'ini', 'itu', 'nya', 'mau', 'boleh', 'dong',
  'harga', 'berapa', 'aja', 'deh', 'banget', 'total', 'totalnya', 'transfer',
  'bayar', 'lunas', 'betul', 'iya', 'ya', 'nanti', 'langsung', 'tolong', 'ke',
  'alamat', 'yang', 'buat', 'untuk', 'dari', 'di', 'jadi', 'ya', 'gak', 'ga',
  'nih', 'tuh', 'sih', 'ya', 'bisa', 'nya', 'kalo', 'kalau', 'bgt', 'plus',
]);

function parseIndoAmount(numStr, suffix) {
  const cleanSuffix = (suffix || '').toLowerCase();
  const normalized = numStr.replace(/\s/g, '');
  if (/^(jt|juta)$/.test(cleanSuffix)) {
    return Math.round(parseFloat(normalized.replace(',', '.')) * 1_000_000);
  }
  if (/^(rb|ribu|k)$/.test(cleanSuffix)) {
    return Math.round(parseFloat(normalized.replace(',', '.')) * 1_000);
  }
  // Bare number: Indonesian casual writing uses '.' or ',' as thousand separators.
  const digitsOnly = normalized.replace(/[.,]/g, '');
  return parseInt(digitsOnly, 10) || 0;
}

const PRICE_RE = /\brp\.?\s*([\d.,]+)\s*(jt|juta|rb|ribu|k)?\b|\b(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu|k)\b|\b(\d{1,3}(?:[.,]\d{3})+|\d{4,8})\b/gi;
const QTY_RE = new RegExp(`\\b(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_WORDS.join('|')})\\b`, 'i');

function findPrices(line) {
  const found = [];
  let m;
  PRICE_RE.lastIndex = 0;
  while ((m = PRICE_RE.exec(line)) !== null) {
    const numStr = m[1] || m[3] || m[5];
    const suffix = m[2] || m[4] || '';
    const value = parseIndoAmount(numStr, suffix);
    if (value >= 1000 && value <= 200_000_000) {
      found.push({ value, index: m.index, isTotal: TOTAL_KEYWORD.test(line.slice(Math.max(0, m.index - 15), m.index)) });
    }
  }
  return found;
}

function extractQty(line) {
  const m = line.match(QTY_RE);
  if (!m) return null;
  return { qty: parseFloat(m[1].replace(',', '.')), satuan: m[2].toLowerCase() };
}

function cleanForProductName(line) {
  return line
    .replace(PRICE_RE, ' ')
    .replace(QTY_RE, ' ')
    .replace(/[?!.,;:"'()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !FILLER_WORDS.has(w.toLowerCase()) && !/^\d+$/.test(w))
    .join(' ')
    .trim();
}

function titleCase(s) {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

/**
 * @param {string} rawText
 * @returns {Array<{tanggal: null, produk: string, qty: number, satuan: string, harga: number, status: string, confidence: 'low'|'medium'|'high', raw: string}>}
 */
export function parseChatToTransactions(rawText) {
  const lines = rawText
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  // Find anchor lines: lines carrying a price. Prefer ones near a completion keyword.
  const priceLines = lines
    .map((line, idx) => ({ idx, line, prices: findPrices(line) }))
    .filter((x) => x.prices.length > 0);

  if (priceLines.length === 0) return [];

  const usesCompletionSignal = priceLines.some((x) => COMPLETE_KEYWORDS.test(x.line));

  const anchors = usesCompletionSignal
    ? priceLines.filter((x) => COMPLETE_KEYWORDS.test(x.line))
    : priceLines;

  const results = [];
  let lastAnchorIdx = -10;
  let previousWindowEnd = -1;

  for (const anchor of anchors) {
    // Collapse anchors that fall in the same small window (avoid double counting
    // a quote-then-confirm exchange as two separate sales).
    if (anchor.idx - lastAnchorIdx <= 1 && results.length > 0) {
      lastAnchorIdx = anchor.idx;
      continue;
    }
    lastAnchorIdx = anchor.idx;

    // Never let a window reach back into the previous transaction's lines.
    const windowStart = Math.max(0, previousWindowEnd + 1, anchor.idx - 3);
    const windowLines = lines.slice(windowStart, anchor.idx + 1);
    previousWindowEnd = anchor.idx;

    // Price: prefer one explicitly marked as "total" on the anchor line, else the largest found.
    const totalPrice = anchor.prices.find((p) => p.isTotal);
    const harga = (totalPrice || anchor.prices.reduce((a, b) => (b.value > a.value ? b : a))).value;

    // Quantity: search window, nearest line first.
    let qtyInfo = null;
    for (let i = windowLines.length - 1; i >= 0; i--) {
      qtyInfo = extractQty(windowLines[i]);
      if (qtyInfo) break;
    }

    // Product name: an inquiry line ("... masih ada?") usually names the product
    // more cleanly than the confirmation line, so prefer question-shaped lines;
    // otherwise fall back to whichever window line has the richest leftover text.
    const questionLines = windowLines.filter((l) => l.includes('?'));
    const candidateLines = questionLines.length > 0 ? questionLines : windowLines;
    let bestProduk = '';
    for (const l of candidateLines) {
      const candidate = cleanForProductName(l);
      if (candidate.length > bestProduk.length) bestProduk = candidate;
    }
    const produk = bestProduk ? titleCase(bestProduk) : 'Produk (tidak terdeteksi)';

    // Payment status is sometimes confirmed a line or two AFTER the price is quoted
    // (e.g. "harga 1.560.000" then "oke DP dulu ya"), so peek forward too.
    let status = 'Lunas';
    const statusText = [...windowLines, ...lines.slice(anchor.idx + 1, anchor.idx + 3)].join(' ');
    if (DP_KEYWORDS.test(statusText)) status = 'DP 50%';

    let confidence = 'medium';
    if (qtyInfo && totalPrice && bestProduk.length > 2) confidence = 'high';
    if (!qtyInfo && !bestProduk) confidence = 'low';

    results.push({
      tanggal: null,
      produk,
      qty: qtyInfo ? qtyInfo.qty : 1,
      satuan: qtyInfo ? qtyInfo.satuan : 'pcs',
      harga,
      status,
      confidence,
      raw: windowLines.join(' / '),
    });
  }

  return results;
}
