import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const KECAMATAN_OPTIONS = ['Pasar Kliwon', 'Serengan', 'Laweyan', 'Jebres', 'Banjarsari'];

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    businessName: '', businessCategory: '', kecamatan: KECAMATAN_OPTIONS[0],
    email: '', password: '', securityFood: '', securityBand: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (!form.securityFood.trim() || !form.securityBand.trim()) {
      setError('Makanan favorit dan band favorit wajib diisi - dipakai untuk reset kata sandi kalau lupa nanti.');
      return;
    }
    setSubmitting(true);
    const { error: signUpError } = await signUp({
      email: form.email,
      password: form.password,
      businessName: form.businessName,
      businessCategory: form.businessCategory || 'Umum',
      kecamatan: form.kecamatan,
      securityFood: form.securityFood,
      securityBand: form.securityBand,
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    navigate('/pembukuan');
  }

  return (
    <div className="auth-wrap">
      <div className="wrap-480">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="brand-mark">W</div><span className="brand-name">WIRABUMI</span>
        </div>
        <div className="auth-card">
          <h1 className="serif" style={{ fontSize: 24, margin: 0 }}>Daftarkan usahamu</h1>
          <p className="muted" style={{ fontSize: 14, margin: '6px 0 20px' }}>Gratis. Butuh kurang dari satu menit.</p>

          {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Nama usaha</label>
              <input required value={form.businessName} onChange={(e) => set('businessName', e.target.value)} placeholder="mis. Batik Kliwon Jaya" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Kategori usaha</label>
                <input value={form.businessCategory} onChange={(e) => set('businessCategory', e.target.value)} placeholder="mis. Tekstil & Batik" />
              </div>
              <div className="field">
                <label>Kecamatan</label>
                <select value={form.kecamatan} onChange={(e) => set('kecamatan', e.target.value)}>
                  {KECAMATAN_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Email</label>
              <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@email.com" />
            </div>
            <div className="field">
              <label>Kata sandi</label>
              <input required type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Minimal 6 karakter" />
            </div>

            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 14, marginTop: 2 }}>
              <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px' }}>
                Dipakai untuk reset kata sandi kalau lupa nanti - jawabanmu tidak perlu formal, yang penting kamu ingat.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Makanan favorit</label>
                  <input required value={form.securityFood} onChange={(e) => set('securityFood', e.target.value)} placeholder="mis. Nasi Goreng" />
                </div>
                <div className="field">
                  <label>Band/musisi favorit</label>
                  <input required value={form.securityBand} onChange={(e) => set('securityBand', e.target.value)} placeholder="mis. Sheila On 7" />
                </div>
              </div>
            </div>

            <button className="btn btn-primary btn-lg btn-block mt-16" disabled={submitting} type="submit">
              {submitting ? 'Memproses…' : 'Daftar & Mulai'}
            </button>
          </form>

          <div className="center-text muted" style={{ fontSize: 13.5, marginTop: 18 }}>
            Sudah punya akun? <Link to="/masuk" style={{ color: 'var(--blue-dark)', fontWeight: 700 }}>Masuk</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
