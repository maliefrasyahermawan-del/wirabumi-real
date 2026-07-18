import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/', label: 'Beranda' },
  { to: '/cara-kerja', label: 'Cara Kerja' },
];

const KEUANGAN_LINKS = [
  { to: '/pembukuan', label: 'Pembukuan', desc: 'Catat penjualan' },
  { to: '/pengeluaran', label: 'Pengeluaran', desc: 'Catat beban usaha' },
  { to: '/laporan', label: 'Laporan Laba Rugi', desc: 'Ringkasan & PDF' },
];

const TAIL_LINKS = [
  { to: '/asisten', label: 'Asisten AI' },
];

function KeuanganDropdown({ current }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const isActive = KEUANGAN_LINKS.some((l) => l.to === current);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`navlink ${isActive ? 'current' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        Keuangan {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="nav-dropdown">
          {KEUANGAN_LINKS.map((l) => (
            <button
              key={l.to}
              className={`nav-dropdown-item ${current === l.to ? 'current' : ''}`}
              onClick={() => { navigate(l.to); setOpen(false); }}
            >
              <span className="nav-dropdown-label">{l.label}</span>
              <span className="nav-dropdown-desc">{l.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
            <KeuanganDropdown current={location.pathname} />
            {TAIL_LINKS.map((l) => (
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
