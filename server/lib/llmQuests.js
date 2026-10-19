import { callGroq, extractJson } from './groqClient.js';

/**
 * Meminta LLM (Groq) untuk mempersonalisasi daftar "Langkah yang Direkomendasikan" (quests)
 * agar bahasanya lebih relevan dengan jenis usaha UMKM tersebut.
 * 
 * @param {object} profile - Profil UMKM (nama usaha, kategori, dll)
 * @param {Array} quests - Daftar 3 quest yang sudah dipilih oleh algoritma rule-based
 * @returns {Promise<Array>} - Daftar quest dengan title dan syarat yang sudah dipersonalisasi, atau quest asli jika gagal
 */
export async function personalizeQuests(profile, quests) {
  if (!quests || quests.length === 0) return quests;

  const system = `Kamu adalah asisten AI untuk aplikasi BUMIRA (pencatatan keuangan UMKM).
Tugasmu adalah mempersonalisasi teks rekomendasi langkah (quests) untuk UMKM.
Ubah 'title' (judul) dan 'syarat' (penjelasan) agar terasa sangat personal dan relevan dengan kategori usaha mereka, tapi TETAP mempertahankan inti instruksinya.

Aturan:
1. Gunakan bahasa santai tapi profesional (seperti asisten bisnis).
2. Sebutkan nama usaha atau produk yang relevan dengan kategori mereka jika memungkinkan.
3. Kembalikan HANYA array JSON dengan struktur:
[
  { "key": "quest-key", "title": "Judul baru", "syarat": "Penjelasan baru" }
]
Jangan tambahkan teks apapun di luar JSON.`;

  const user = `Profil UMKM:
Nama Usaha: ${profile.business_name || 'UMKM'}
Kategori: ${profile.business_category || 'Umum'}

Quests asli:
${JSON.stringify(quests.map(q => ({ key: q.key, title: q.title, syarat: q.syarat })), null, 2)}`;

  const res = await callGroq({
    system,
    user,
    feature: 'personalize_quests',
    temperature: 0.7,
    maxTokens: 1000
  });

  if (!res.success) {
    console.error('[llmQuests] Gagal memanggil LLM:', res.error);
    return quests; // Fallback ke teks asli
  }

  try {
    const aiData = extractJson(res.content);
    if (!Array.isArray(aiData)) throw new Error('Format JSON dari LLM bukan array');
    
    // Merge hasil AI ke array quest asli
    return quests.map(q => {
      const aiQuest = aiData.find(a => a.key === q.key);
      if (aiQuest && aiQuest.title && aiQuest.syarat) {
        return { ...q, title: aiQuest.title, syarat: aiQuest.syarat };
      }
      return q;
    });
  } catch (err) {
    console.error('[llmQuests] Gagal memparsing JSON dari LLM:', err.message);
    return quests; // Fallback
  }
}
