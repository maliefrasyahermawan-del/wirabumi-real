import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: signInError } = await signIn({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    const dest = location.state?.from || '/pembukuan';
    navigate(dest, { replace: true });
  }

  return (
    <div className="auth-wrap">
      <div className="wrap-480">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: 20, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div className="brand-mark">W</div><span className="brand-name">WIRABUMI</span>
        </div>
        <div className="auth-card">
          <h1 className="serif" style={{ fontSize: 24, margin: 0 }}>Masuk ke akunmu</h1>
          <p className="muted" style={{ fontSize: 14, margin: '6px 0 20px' }}>Lanjutkan mengelola pembukuan usahamu.</p>

          {error && <div className="alert-error" style={{ marginBottom: 14 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Email</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@email.com" />
            </div>
            <div className="field">
              <label>Kata sandi</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <button className="btn btn-primary btn-lg btn-block mt-16" disabled={submitting} type="submit">
              {submitting ? 'Memproses…' : 'Masuk'}
            </button>
          </form>

          <div className="center-text muted" style={{ fontSize: 13.5, marginTop: 18 }}>
            Belum punya akun? <Link to="/daftar" style={{ color: 'var(--blue-dark)', fontWeight: 700 }}>Daftar gratis</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
