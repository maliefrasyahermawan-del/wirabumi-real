import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../lib/roles';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import ProfileDropdown from './ProfileDropdown';

const KEUANGAN_LINKS = [
  { to: '/pembukuan', label: 'Pembukuan', desc: 'Catat penjualan' },
  { to: '/pengeluaran', label: 'Pengeluaran', desc: 'Catat beban usaha' },
  { to: '/laporan', label: 'Laporan Laba Rugi', desc: 'Ringkasan & PDF' },
  { to: '/kur', label: 'Ajukan KUR', desc: 'Simulasi plafon & unduh berkas' },
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
  const { user, profile } = useAuth();
  const role = profile?.role || 'umkm_owner';
  const dashboardHome = ROLE_HOME[role] || '/dashboard';

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <div className="brand" onClick={() => navigate('/')}>
          <div className={variant === 'compact' ? 'brand-mark small' : 'brand-mark'}>W</div>
          <span className={variant === 'compact' ? 'brand-name small' : 'brand-name'}>WIRABUMI</span>
          {variant === 'full' && <span className="brand-badge">SOLO RAYA</span>}
        </div>

        {variant === 'full' && user && (
          <nav className="navlinks">
            <button className={`navlink ${location.pathname === dashboardHome ? 'current' : ''}`} onClick={() => navigate(dashboardHome)}>Dashboard</button>
            <button className={`navlink ${location.pathname === '/' ? 'current' : ''}`} onClick={() => navigate('/')}>Beranda</button>
            {role === 'umkm_owner' && (
              <>
                <button className={`navlink ${location.pathname === '/cara-kerja' ? 'current' : ''}`} onClick={() => navigate('/cara-kerja')}>Cara Kerja</button>
                <KeuanganDropdown current={location.pathname} />
                <button className={`navlink ${location.pathname === '/asisten' ? 'current' : ''}`} onClick={() => navigate('/asisten')}>Mas Sido</button>
              </>
            )}
          </nav>
        )}

        {variant === 'full' && !user && (
          <nav className="navlinks">
            <button className={`navlink ${location.pathname === '/' ? 'current' : ''}`} onClick={() => navigate('/')}>Beranda</button>
            <button className={`navlink ${location.pathname === '/cara-kerja' ? 'current' : ''}`} onClick={() => navigate('/cara-kerja')}>Cara Kerja</button>
          </nav>
        )}

        <div className="flex-center gap-12 topnav-actions">
          {user ? (
            <div className="topnav-toolbar">
              <NotificationBell />
              <ThemeToggle />
              <span className="topnav-toolbar-divider" />
              <ProfileDropdown />
            </div>
          ) : (
            <>
              <ThemeToggle />
              <button className="navlink" onClick={() => navigate('/masuk')}>Masuk</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/daftar')}>Daftar Gratis</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
