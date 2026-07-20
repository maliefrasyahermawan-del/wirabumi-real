import { useState } from 'react';
import TopNav from '../components/TopNav';
import { api } from '../lib/apiClient';

const MAX_LEN = 500;

function FeedbackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function Ulasan() {
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!message.trim()) {
      setError('Tulis dulu ulasanmu sebelum dikirim.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/feedback', { message: message.trim() });
      setSent(true);
      setMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-940" style={{ paddingTop: 40, paddingBottom: 70 }}>
        <div className="card-lg card-glow" style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--blue)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <FeedbackIcon />
            </div>
            <div>
              <h1 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Berikan Ulasan</h1>
              <p className="muted" style={{ fontSize: 13.5, margin: '2px 0 0' }}>Bantu kami membuat WIRABUMI lebih baik.</p>
            </div>
          </div>

          {sent ? (
            <div className="alert-ok mt-16">Terima kasih! Ulasanmu sudah kami terima dan akan jadi bahan perbaikan WIRABUMI.</div>
          ) : (
            <form onSubmit={handleSubmit} style={{ marginTop: 22 }}>
              <div className="field">
                <label>Kirim saran, ide, atau komentarmu</label>
                <textarea
                  className="capture-input"
                  style={{ minHeight: 150 }}
                  value={message}
                  maxLength={MAX_LEN}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tulis ulasanmu di sini..."
                />
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{message.length} / {MAX_LEN} karakter</div>

              {error && <div className="alert-error mt-16">{error}</div>}

              <button className="btn btn-primary btn-lg" style={{ marginTop: 16 }} disabled={saving} type="submit">
                {saving ? 'Mengirim…' : 'Kirim Ulasan'}
              </button>
            </form>
          )}

          <p className="muted" style={{ fontSize: 12.5, marginTop: 24, lineHeight: 1.6 }}>
            Butuh bantuan teknis? Form ini khusus untuk masukan umum, bukan untuk kendala akun atau laporan bug mendesak.
          </p>
        </div>
      </div>
    </div>
  );
}
