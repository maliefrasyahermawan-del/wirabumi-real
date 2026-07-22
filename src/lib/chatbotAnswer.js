// Rule-based Mas Sido answer engine (no AI). Extracted out of Chatbot.jsx so
// the backend can import it as a fallback for the LLM-backed answer path
// (server/lib/llmChatbotAnswer.js) — same file, same behavior, no duplicated
// logic to drift out of sync.

import { rupiah } from './format.js';

export function buildAnswer(qRaw, ctx) {
  const q = qRaw.toLowerCase();
  const { score, offer, monthTotal, monthCount, topProducts, legal } = ctx;

  if (/omzet|penjualan|pendapatan|jualan|pemasukan/.test(q)) {
    if (monthCount === 0) return 'Belum ada transaksi tercatat bulan ini. Coba catat penjualanmu dulu di menu Pembukuan.';
    const avg = monthTotal / monthCount;
    return `Total penjualanmu bulan ini ${rupiah(monthTotal)} dari ${monthCount} transaksi, rata-rata ${rupiah(avg)} per order. Omzet 6 bulan terakhir ${rupiah(offer.omzet_6_bulan)} (± ${rupiah(offer.rata_rata_bulan)}/bulan).`;
  }
  // Must be checked before the generic /skor/ branch below, since "gimana cara
  // menaikkan skor" also contains the word "skor" and would otherwise be
  // swallowed by the generic lookup instead of getting actionable tips.
  if (/naik|tingkat|tips|saran|caranya|gimana/.test(q) && /skor|kelayakan/.test(q)) {
    const weakSorted = [...score.factors].sort((a, b) => a.val - b.val);
    const tips = weakSorted.slice(0, 3).map((f, i) => `${i + 1}) ${f.tip}`).join(' ');
    return `Cara meningkatkan skormu (dari ${score.total_score}): ${tips}`;
  }
  if (/skor|kelayakan|layak|nilai/.test(q)) {
    const sorted = [...score.factors].sort((a, b) => b.val - a.val);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    return `Skor kelayakan usahamu ${score.total_score}/100, ${score.status === 'Layak Diajukan' ? 'sudah masuk kategori "Layak Diajukan" untuk KUR mikro' : 'masih perlu ditingkatkan untuk masuk kategori layak'}. Pendorong terkuatmu: ${strongest.name.toLowerCase()} (${strongest.val}). Yang menahan: ${weakest.name.toLowerCase()} (${weakest.val}).`;
  }
  if (/plafon|pinjam|modal|\bkur\b/.test(q)) {
    if (offer.plafon <= 0) return 'Plafon KUR belum bisa dihitung karena belum ada data transaksi. Catat dulu penjualanmu di menu Pembukuan.';
    return `Berdasarkan omzet 6 bulanmu (${rupiah(offer.omzet_6_bulan)}), plafon KUR yang disarankan ${rupiah(offer.plafon)} dengan tenor ${offer.tenor_bulan} bulan, bunga ${(offer.suku_bunga_tahunan * 100).toFixed(0)}% efektif/tahun.`;
  }
  if (/cicilan|angsuran|bayar|per bulan|nyicil/.test(q)) {
    if (offer.plafon <= 0) return 'Belum ada simulasi angsuran karena plafon belum bisa dihitung. Catat dulu transaksimu.';
    return `Estimasi angsuran KUR-mu ${rupiah(offer.cicilan_bulanan)}/bulan (plafon ${rupiah(offer.plafon)}, tenor ${offer.tenor_bulan} bln). Itu sekitar ${offer.rasio_cicilan_omzet}% dari omzet bulananmu, ${offer.rasio_cicilan_omzet < 30 ? 'masih ringan dan aman' : 'cukup berat, idealnya di bawah 30% omzet'}.`;
  }
  if (/legal|nib|izin|halal|pirt|sertifik|dokumen/.test(q)) {
    const done = legal.filter((l) => l.done).map((l) => l.label);
    const missing = legal.filter((l) => !l.done).map((l) => l.label);
    return `Status legalitasmu: ${done.length ? done.join(', ') + ' ✅ sudah ada' : 'belum ada yang lengkap'}. ${missing.length ? `Yang belum: ${missing.join(', ')}. Melengkapinya bisa menaikkan skor sekaligus memperbesar plafon KUR-mu.` : 'Semua dokumen legalitas sudah lengkap 🎉'}`;
  }
  if (/produk|laris|terlaris|paling|favorit|best/.test(q)) {
    if (topProducts.length === 0) return 'Belum ada data produk. Catat transaksimu dulu di menu Pembukuan.';
    const list = topProducts.slice(0, 2).map((p) => `${p.produk} (${rupiah(p.total)})`).join(' lalu ');
    return `Produk penyumbang omzet terbesar: ${list}.`;
  }
  if (/naik|tingkat|tips|saran|caranya|gimana.*skor/.test(q)) {
    const weakSorted = [...score.factors].sort((a, b) => a.val - b.val);
    const tips = weakSorted.slice(0, 3).map((f, i) => `${i + 1}) ${f.tip}`).join(' ');
    return `Cara meningkatkan skormu (dari ${score.total_score}): ${tips}`;
  }
  // Plain keyword matching (no AI) for common greetings, checked before the
  // generic "what can you do" fallback below so a bare "halo" gets an actual
  // greeting back instead of the capabilities list.
  if (/\bhai\b|\bhalo+\b|\bhallo\b|\bhi\b|\bpagi\b|\bsiang\b|\bsore\b|\bmalam\b/.test(q)) {
    if (/pagi/.test(q)) return 'Selamat pagi! Aku Mas Sido, asisten keuangan WIRABUMI 👋 Ada yang bisa aku bantu soal usahamu?';
    if (/siang/.test(q)) return 'Selamat siang! Aku Mas Sido, asisten keuangan WIRABUMI 👋 Ada yang bisa aku bantu soal usahamu?';
    if (/sore/.test(q)) return 'Selamat sore! Aku Mas Sido, asisten keuangan WIRABUMI 👋 Ada yang bisa aku bantu soal usahamu?';
    if (/malam/.test(q)) return 'Selamat malam! Aku Mas Sido, asisten keuangan WIRABUMI 👋 Ada yang bisa aku bantu soal usahamu?';
    return 'Hai! Aku Mas Sido, asisten keuangan WIRABUMI 👋 Ada yang bisa aku bantu soal usahamu?';
  }
  if (/help|bantu|bisa apa|apa aja/.test(q)) {
    return 'Aku bisa bantu soal: omzet & penjualan, skor kelayakan, simulasi plafon KUR, angsuran bulanan, produk terlaris, dan status legalitas usahamu. Semua dihitung langsung dari data pembukuanmu. Mau mulai dari mana?';
  }
  return 'Aku belum punya jawaban pasti soal itu 🙏 Coba tanya soal omzet, skor kelayakan, plafon & angsuran KUR, produk terlaris, atau legalitas usahamu.';
}
