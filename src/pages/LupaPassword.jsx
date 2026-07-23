import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LupaPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();
  const [form, setForm] = useState({ email: '', securityFood: '', securityBand: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    setSubmitting(true);
    const { error: resetError } = await resetPassword({
      email: form.email,
      securityFood: form.securityFood,
      securityBand: form.securityBand,
      newPassword: form.newPassword,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setDone(true);
  }

  return (
    <div className="auth-wrap">
      <div className="wrap-480">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="brand-mark">W</div><span className="brand-name">WIRABUMI</span>
        </div>
        <div className="auth-card">
          {done ? (
            <>
              <h1 className="serif" style={{ fontSize: 24, margin: 0 }}>Kata sandi berhasil diganti</h1>
              <p className="muted" style={{ fontSize: 14, margin: '6px 0 20px' }}>Silakan masuk lagi pakai kata sandi barumu.</p>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/masuk')}>Ke halaman Masuk →</button>
            </>
          ) : (
            <>
              <h1 className="serif" style={{ fontSize: 24, margin: 0 }}>Lupa kata sandi</h1>
              <p className="muted" style={{ fontSize: 14, margin: '6px 0 20px' }}>
                Jawab 2 pertanyaan keamanan yang kamu isi saat daftar untuk ganti kata sandi.
              </p>

              {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Email</label>
                  <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@email.com" />
                </div>
                <div className="field">
                  <label>Makanan favorit</label>
                  <input required value={form.securityFood} onChange={(e) => set('securityFood', e.target.value)} placeholder="Jawaban saat daftar" />
                </div>
                <div className="field">
                  <label>Band/musisi favorit</label>
                  <input required value={form.securityBand} onChange={(e) => set('securityBand', e.target.value)} placeholder="Jawaban saat daftar" />
                </div>
                <div className="field">
                  <label>Kata sandi baru</label>
                  <input required type="password" value={form.newPassword} onChange={(e) => set('newPassword', e.target.value)} placeholder="Minimal 6 karakter" />
                </div>
                <div className="field">
                  <label>Konfirmasi kata sandi baru</label>
                  <input required type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} placeholder="Ulangi kata sandi baru" />
                </div>
                <button className="btn btn-primary btn-lg btn-block mt-16" disabled={submitting} type="submit">
                  {submitting ? 'Memproses…' : 'Ganti Kata Sandi'}
                </button>
              </form>
            </>
          )}

          <div className="center-text muted" style={{ fontSize: 13.5, marginTop: 18 }}>
            <Link to="/masuk" style={{ color: 'var(--blue-dark)', fontWeight: 700 }}>← Kembali ke halaman Masuk</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
