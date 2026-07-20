import { useEffect, useRef, useState } from 'react';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { rupiah } from '../lib/format';

const SUGGESTIONS = [
  'Berapa omzet bulan ini?',
  'Berapa skor kelayakan usahaku?',
  'Berapa plafon & angsuran KUR-ku?',
  'Produk apa yang paling laris?',
  'Bagaimana cara menaikkan skor?',
];

function buildAnswer(qRaw, ctx) {
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

export default function Chatbot() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [txnCount, setTxnCount] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    async function load() {
      const [score, offer, allTxns] = await Promise.all([
        api.get('/score'),
        api.get('/kur/offer?tenor=24'),
        api.get('/transactions'),
      ]);

      const now = new Date();
      const monthTxns = (allTxns || []).filter((t) => {
        const d = new Date(t.tanggal + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const monthTotal = monthTxns.reduce((a, t) => a + Number(t.harga), 0);

      const byProduct = {};
      for (const t of allTxns || []) {
        byProduct[t.produk] = (byProduct[t.produk] || 0) + Number(t.harga);
      }
      const topProducts = Object.entries(byProduct)
        .map(([produk, total]) => ({ produk, total }))
        .sort((a, b) => b.total - a.total);

      const legal = [
        { label: 'NIB', done: !!profile?.legal_nib },
        { label: 'P-IRT/merek', done: !!profile?.legal_pirt },
        { label: 'Sertifikasi Halal', done: !!profile?.legal_halal },
      ];

      setTxnCount((allTxns || []).length);
      setCtx({ score, offer, monthTotal, monthCount: monthTxns.length, topProducts, legal });

      const history = await api.get('/chat-messages');

      if (history && history.length > 0) {
        setMessages(history.map((h) => ({ role: h.role, text: h.text })));
      } else {
        // A session-start nicety only — intentionally not persisted, so there's
        // no first-load race to double-insert it (StrictMode's double effect
        // invocation would otherwise write it twice).
        const greeting = 'Halo, kenalin aku Mas Sido 👋 Aku asisten keuangan WIRABUMI, tugasku bantu jawab pertanyaan soal usahamu langsung dari data pembukuanmu sendiri: omzet, skor kelayakan, sampai simulasi KUR. Namaku diambil dari kata "sido" pada motif batik Sidomukti, yang dalam bahasa Jawa berarti "jadi" atau "tercapai", doa supaya usahamu jadi dan tercapai. Coba tanya apa saja, atau klik salah satu pertanyaan di bawah.';
        setMessages([{ role: 'bot', text: greeting }]);
      }
    }
    load();
  }, [user.id]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  async function pushUser(text) {
    const t = (text || '').trim();
    if (!t || typing || !ctx) return;
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    setTyping(true);
    await api.post('/chat-messages', { role: 'user', text: t });
    setTimeout(async () => {
      const answer = buildAnswer(t, ctx);
      setMessages((m) => [...m, { role: 'bot', text: answer }]);
      setTyping(false);
      await api.post('/chat-messages', { role: 'bot', text: answer });
    }, 900);
  }

  return (
    <div className="page full-h" style={{ height: '100vh', overflow: 'hidden' }}>
      <TopNav />
      <div className="wrap-1240" style={{ padding: '26px 40px 32px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="flex-center gap-12" style={{ gap: 13, marginBottom: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', fontSize: 22 }}>◍</div>
          <div>
            <div className="flex-center gap-8" style={{ gap: 9 }}>
              <h1 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: 0 }}>Mas Sido</h1>
              <span className="connected-badge"><span className="connected-dot"></span>Terhubung ke data usahamu</span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Asisten Keuangan WIRABUMI · Menjawab dari {txnCount} transaksi · {profile?.business_name}</div>
          </div>
        </div>

        <div className="chat-window" ref={scrollRef}>
          {messages.map((m, i) => (
            <div className={`chat-row ${m.role === 'bot' ? 'bot' : 'user'}`} key={i}>
              {m.role === 'bot' && <div className="chat-avatar">◍</div>}
              <div className={`chat-bubble ${m.role === 'bot' ? 'bot' : 'user'}`}>{m.text}</div>
            </div>
          ))}
          {typing && (
            <div className="chat-row bot">
              <div className="chat-avatar">◍</div>
              <div className="typing-dots">
                <span className="typing-dot"></span>
                <span className="typing-dot" style={{ animationDelay: '.2s' }}></span>
                <span className="typing-dot" style={{ animationDelay: '.4s' }}></span>
              </div>
            </div>
          )}
        </div>

        <div className="chat-suggests">
          {SUGGESTIONS.map((s) => (
            <span key={s} className="chat-suggest" onClick={() => pushUser(s)}>{s}</span>
          ))}
        </div>

        <div className="chat-inputrow">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); pushUser(input); } }}
            placeholder="Tanya Mas Sido soal omzet, skor, KUR, angsuran…"
          />
          <button className="btn btn-primary" style={{ fontSize: 15, padding: '14px 24px', borderRadius: 12 }} onClick={() => pushUser(input)}>Kirim</button>
        </div>
      </div>
    </div>
  );
}
