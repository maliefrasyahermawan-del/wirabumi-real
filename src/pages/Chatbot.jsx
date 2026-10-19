import { useEffect, useRef, useState } from 'react';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

const SUGGESTIONS = [
  'Berapa omzet bulan ini?',
  'Berapa skor kelayakan usahaku?',
  'Berapa plafon & angsuran KUR-ku?',
  'Produk apa yang paling laris?',
  'Bagaimana cara menaikkan skor?',
];

export default function Chatbot() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [ctx, setCtx] = useState(null);
  const [txnCount, setTxnCount] = useState(0);
  const [javaMode, setJavaMode] = useState(() => localStorage.getItem('bumira_mira_jawa') === '1');
  const scrollRef = useRef(null);

  function toggleJavaMode() {
    setJavaMode((prev) => {
      const next = !prev;
      localStorage.setItem('bumira_mira_jawa', next ? '1' : '0');
      return next;
    });
  }

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
        // A session-start nicety only - intentionally not persisted, so there's
        // no first-load race to double-insert it (StrictMode's double effect
        // invocation would otherwise write it twice).
        const greeting = 'Halo, kenalin aku Mira 👋 Aku asisten usaha BUMIRA. Aku membantu membaca data pembukuanmu, mulai dari omzet, skor kesiapan, produk terlaris, sampai simulasi KUR. Coba tanya apa saja, atau klik salah satu pertanyaan di bawah.';
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
    try {
      const res = await api.post('/chat-messages/ask', { question: t, ctx, bahasa: javaMode ? 'jawa' : 'id' });
      setMessages((m) => [...m, { role: 'bot', text: res.answer }]);
      await api.post('/chat-messages', { role: 'bot', text: res.answer });
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: 'Maaf, ada gangguan saat memproses jawaban. Coba lagi ya.' }]);
    } finally {
      setTyping(false);
    }
  }

  return (
    <div className="page full-h" style={{ height: '100vh', overflow: 'hidden' }}>
      <TopNav />
      <div className="wrap-1240" style={{ padding: '26px 40px 32px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div className="flex-center gap-12" style={{ gap: 13, marginBottom: 16 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', fontSize: 22 }}>◍</div>
          <div style={{ flex: 1 }}>
            <div className="flex-center gap-8" style={{ gap: 9 }}>
              <h1 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: 0 }}>Mira</h1>
              <span className="connected-badge"><span className="connected-dot"></span>Terhubung ke data usahamu</span>
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Asisten Keuangan BUMIRA · Menjawab dari {txnCount} transaksi · {profile?.business_name}</div>
          </div>
          <button
            type="button"
            className={`jawa-toggle-pill ${javaMode ? 'active' : ''}`}
            onClick={toggleJavaMode}
            title={javaMode ? 'Mode Bahasa Jawa aktif - klik untuk kembali ke Bahasa Indonesia' : 'Aktifkan mode Bahasa Jawa'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>
            </svg>
            Mode Jawa
          </button>
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
            placeholder="Tanya Mira soal omzet, skor, KUR, angsuran…"
          />
          <button className="btn btn-primary" style={{ fontSize: 15, padding: '14px 24px', borderRadius: 12 }} onClick={() => pushUser(input)}>Kirim</button>
        </div>
      </div>
    </div>
  );
}
