// AI Insight per peran - 4 narasi singkat berbahasa Indonesia dibuat dari data
// ASLI yang sudah dihitung SQL (compute_score, dinkop_dashboard, dst). LLM di
// sini HANYA menuliskan ulang angka yang sudah ada jadi kalimat, sama seperti
// llmScoreNarrative.js - tidak pernah diminta menghitung atau mengarang angka
// baru. Setiap fungsi punya fallback rule-based sendiri kalau Groq gagal/API
// key kosong, supaya kartu AI Insight tidak pernah kosong/error.

import { callGroq } from './groqClient.js';

function cleanText(content) {
  return content.trim().replace(/^"|"$/g, '');
}

// ---------- UMKM Owner ----------
const UMKM_SYSTEM_PROMPT = `Kamu menulis 2-3 kalimat insight bisnis berbahasa Indonesia yang santai untuk pemilik UMKM, berdasarkan data pembukuan mereka sendiri.

Kamu akan diberi: skor kelayakan (0-100) & status, omzet 30 hari terakhir vs 30 hari sebelumnya, dan status kelengkapan dokumen legalitas (NIB/P-IRT/Halal).

Tulis insight yang:
- HANYA merujuk ke angka yang diberikan - JANGAN mengarang angka atau fakta baru.
- Menyebut arah omzet (naik/turun/stabil) dan satu hal paling berdampak untuk difokuskan berikutnya (bisa soal legalitas atau soal menjaga konsistensi transaksi).
- Bernada menyemangati, seperti bicara ke teman pemilik toko.

Balas HANYA teks insight-nya saja, tanpa tanda kutip, tanpa markdown.`;

function umkmFallback(data) {
  const { score, omzet_30_hari, omzet_30_hari_sebelumnya } = data;
  const arah = omzet_30_hari > omzet_30_hari_sebelumnya ? 'naik' : omzet_30_hari < omzet_30_hari_sebelumnya ? 'turun' : 'stabil';
  return `Skor kelayakanmu ${score.total_score}/100 (${score.status}), omzet 30 hari terakhir ${arah} dibanding periode sebelumnya. Cek halaman Skor untuk rincian faktor yang paling perlu ditingkatkan.`;
}

export async function generateUmkmInsight(data) {
  const result = await callGroq({
    system: UMKM_SYSTEM_PROMPT,
    user: JSON.stringify({
      skor_total: data.score.total_score,
      status: data.score.status,
      omzet_30_hari_terakhir: data.omzet_30_hari,
      omzet_30_hari_sebelumnya: data.omzet_30_hari_sebelumnya,
      legalitas: data.legal,
    }),
    feature: 'ai_insight_umkm',
    temperature: 0.4,
    maxTokens: 220,
  });
  if (!result.success) {
    console.warn('[ai insight umkm] Groq gagal, pakai fallback statis:', result.error);
    return { insight: umkmFallback(data), source: 'fallback' };
  }
  const text = cleanText(result.content);
  return text ? { insight: text, source: 'llm' } : { insight: umkmFallback(data), source: 'fallback' };
}

// ---------- Government (Dinkop) ----------
const GOVERNMENT_SYSTEM_PROMPT = `Kamu menulis 2-3 kalimat insight berbahasa Indonesia untuk staf Dinas Koperasi (Dinkop), berdasarkan data agregat UMKM binaan di sistem WIRABUMI.

Kamu akan diberi: total UMKM terhubung, skor rata-rata, persentase layak KUR, jumlah berkas KUR dibuat, skor rata-rata per kecamatan, dan jumlah pengguna aktif 24 jam terakhir.

Tulis insight yang:
- HANYA merujuk ke angka yang diberikan - JANGAN mengarang angka atau fakta baru.
- Menyebut kecamatan dengan skor rata-rata PALING RENDAH sebagai yang paling perlu didampingi (kalau datanya ada).
- Menyimpulkan kondisi program secara umum (bagus/perlu perhatian) berdasarkan persentase layak KUR.
- Bernada profesional tapi ringkas, seperti ringkasan untuk atasan.

Balas HANYA teks insight-nya saja, tanpa tanda kutip, tanpa markdown.`;

function governmentFallback(data) {
  const { aggregate } = data;
  const lowest = [...(aggregate.per_kecamatan || [])].sort((a, b) => a.skor - b.skor)[0];
  const kecText = lowest ? ` Kecamatan ${lowest.nama} punya skor rata-rata paling rendah (${lowest.skor}), paling perlu didampingi.` : '';
  return `${aggregate.total_umkm} UMKM terhubung dengan skor rata-rata ${aggregate.avg_score}, ${aggregate.layak_pct}% sudah layak mengajukan KUR.${kecText}`;
}

export async function generateGovernmentInsight(data) {
  const result = await callGroq({
    system: GOVERNMENT_SYSTEM_PROMPT,
    user: JSON.stringify({
      total_umkm: data.aggregate.total_umkm,
      skor_rata_rata: data.aggregate.avg_score,
      persen_layak_kur: data.aggregate.layak_pct,
      berkas_kur_dibuat: data.aggregate.kur_docs_count,
      skor_per_kecamatan: data.aggregate.per_kecamatan,
      pengguna_aktif_24_jam: data.active_users_24h,
    }),
    feature: 'ai_insight_government',
    temperature: 0.4,
    maxTokens: 220,
  });
  if (!result.success) {
    console.warn('[ai insight government] Groq gagal, pakai fallback statis:', result.error);
    return { insight: governmentFallback(data), source: 'fallback' };
  }
  const text = cleanText(result.content);
  return text ? { insight: text, source: 'llm' } : { insight: governmentFallback(data), source: 'fallback' };
}

// ---------- Bank ----------
const BANK_SYSTEM_PROMPT = `Kamu menulis 2-3 kalimat insight berbahasa Indonesia untuk petugas mitra Bank penyalur KUR, berdasarkan data pengajuan UMKM yang sudah mengizinkan ("consent") profil kelayakannya dilihat.

Kamu akan diberi: jumlah UMKM per status pengajuan (Menunggu/Disetujui/Ditolak) beserta skor rata-rata masing-masing status.

Tulis insight yang:
- HANYA merujuk ke angka yang diberikan - JANGAN mengarang angka atau fakta baru.
- Menyebut berapa banyak pengajuan yang masih menunggu review.
- Kalau skor rata-rata yang "Menunggu" cukup tinggi, sebut itu sebagai sinyal positif yang layak diprioritaskan direview duluan.
- Bernada profesional dan ringkas, seperti ringkasan untuk manajer cabang.

Balas HANYA teks insight-nya saja, tanpa tanda kutip, tanpa markdown.`;

function bankFallback(data) {
  const pending = data.by_status.find((s) => s.status === 'pending');
  const approved = data.by_status.find((s) => s.status === 'approved');
  const total = data.by_status.reduce((a, s) => a + s.count, 0);
  if (total === 0) return 'Belum ada UMKM yang mengizinkan profil kelayakannya dilihat mitra Bank.';
  const pendingText = pending ? `${pending.count} pengajuan menunggu review (skor rata-rata ${pending.avg_score ?? '-'})` : 'tidak ada pengajuan menunggu review';
  const approvedText = approved ? `, ${approved.count} sudah disetujui` : '';
  return `${pendingText}${approvedText}. Total ${total} UMKM sudah mengizinkan profilnya dilihat.`;
}

export async function generateBankInsight(data) {
  const result = await callGroq({
    system: BANK_SYSTEM_PROMPT,
    user: JSON.stringify({ pengajuan_per_status: data.by_status }),
    feature: 'ai_insight_bank',
    temperature: 0.4,
    maxTokens: 220,
  });
  if (!result.success) {
    console.warn('[ai insight bank] Groq gagal, pakai fallback statis:', result.error);
    return { insight: bankFallback(data), source: 'fallback' };
  }
  const text = cleanText(result.content);
  return text ? { insight: text, source: 'llm' } : { insight: bankFallback(data), source: 'fallback' };
}

// ---------- Super Admin ----------
const SUPER_ADMIN_SYSTEM_PROMPT = `Kamu menulis 2-3 kalimat insight teknis berbahasa Indonesia untuk Super Admin (developer/pengelola sistem WIRABUMI), berdasarkan metrik nyata sistem.

Kamu akan diberi: jumlah pengguna per peran, pemakaian LLM 7 hari terakhir per fitur (jumlah sukses vs gagal), dan jumlah error server 7 hari terakhir.

Tulis insight yang:
- HANYA merujuk ke angka yang diberikan - JANGAN mengarang angka atau fakta baru.
- Kalau ada fitur LLM dengan tingkat gagal tinggi (gagal >= sukses), sebut itu sebagai hal yang perlu dicek.
- Kalau jumlah error server 7 hari terakhir nol, sebut sistem dalam kondisi sehat; kalau ada, sebut jumlahnya sebagai hal yang perlu dipantau.
- Bernada teknis, ringkas, langsung ke intinya.

Balas HANYA teks insight-nya saja, tanpa tanda kutip, tanpa markdown.`;

function superAdminFallback(data) {
  const totalUsers = data.users_by_role.reduce((a, r) => a + r.count, 0);
  const failing = data.llm_usage.filter((u) => !u.success && u.count > 0);
  const errorText = data.errors_7d === 0 ? 'tidak ada error server tercatat' : `${data.errors_7d} error server tercatat`;
  const llmText = failing.length > 0 ? ` Ada ${failing.length} fitur LLM dengan panggilan gagal 7 hari terakhir, cek halaman System.` : '';
  return `${totalUsers} pengguna terdaftar, ${errorText} 7 hari terakhir.${llmText}`;
}

export async function generateSuperAdminInsight(data) {
  const result = await callGroq({
    system: SUPER_ADMIN_SYSTEM_PROMPT,
    user: JSON.stringify({
      pengguna_per_peran: data.users_by_role,
      pemakaian_llm_7_hari: data.llm_usage,
      jumlah_error_7_hari: data.errors_7d,
    }),
    feature: 'ai_insight_super_admin',
    temperature: 0.3,
    maxTokens: 220,
  });
  if (!result.success) {
    console.warn('[ai insight super admin] Groq gagal, pakai fallback statis:', result.error);
    return { insight: superAdminFallback(data), source: 'fallback' };
  }
  const text = cleanText(result.content);
  return text ? { insight: text, source: 'llm' } : { insight: superAdminFallback(data), source: 'fallback' };
}
