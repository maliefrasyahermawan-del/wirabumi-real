import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/', label: 'Beranda' },
  { to: '/cara-kerja', label: 'Cara Kerja' },
  { to: '/pembukuan', label: 'Pembukuan' },
  { to: '/asisten', label: 'Asisten AI' },
];

export default function TopNav({ variant = 'full' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <div className="brand" onClick={() => navigate('/')}>
          <div className={variant === 'compact' ? 'brand-mark small' : 'brand-mark'}>W</div>
          <span className={variant === 'compact' ? 'brand-name small' : 'brand-name'}>WIRABUMI</span>
          {variant === 'full' && <span className="brand-badge">SOLO RAYA</span>}
        </div>

        {variant === 'full' && (
          <nav className="navlinks">
            {LINKS.map((l) => (
              <button key={l.to} className={`navlink ${location.pathname === l.to ? 'current' : ''}`} onClick={() => navigate(l.to)}>{l.label}</button>
            ))}
          </nav>
        )}

        <div className="flex-center gap-12" style={{ flex: 'none' }}>
          {user ? (
            <>
              <button
                className={`navlink ${location.pathname === '/profil' ? 'current' : ''}`}
                style={{ fontSize: 13 }}
                onClick={() => navigate('/profil')}
                title="Lihat & ubah profil usaha"
              >
                {profile?.business_name || 'Usahaku'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => signOut()}>Keluar</button>
            </>
          ) : (
            <>
              <button className="navlink" onClick={() => navigate('/masuk')}>Masuk</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/daftar')}>Daftar Gratis</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
