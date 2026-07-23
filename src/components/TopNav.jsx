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

const ADMIN_COMMON_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard Utama', icon: '⊞' },
  { to: '/dinkop', label: 'Dashboard Agregat', icon: '◫' },
  { to: '/admin/monitoring', label: 'Monitoring Aktivitas', icon: '▣' },
  { to: '/admin/impact', label: 'Dashboard Dampak', icon: '◎' },
  { to: '/bank', label: 'Dashboard Bank', icon: '⬛' },
];

const ADMIN_NAV = {
  government: ADMIN_COMMON_NAV,
  bank_officer: ADMIN_COMMON_NAV,
  super_admin: [
    ...ADMIN_COMMON_NAV,
    { to: '/admin/pengguna', label: 'Kelola Pengguna', icon: '◉' },
    { to: '/admin/system', label: 'System', icon: '⚙' },
  ],
};

const ADMIN_ROLES = ['government', 'bank_officer', 'super_admin'];

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

/* ─── Admin Sidebar ─── */
function AdminSidebar({ open, onClose, role, profile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const items = ADMIN_NAV[role] || [];

  return (
    <>
      {open && <div className="admin-sidebar-overlay" onClick={onClose} />}
      <aside className={`admin-sidebar topnav-sidebar ${open ? 'sidebar-active' : ''}`}>
        {/* Brand + close */}
        <div className="admin-sidebar-brand" onClick={() => { navigate('/'); onClose(); }}>
          <div className="brand-mark small">W</div>
          <span className="admin-sidebar-brand-name">WIRABUMI</span>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            aria-label="Tutup sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* User info */}
        <div className="admin-sidebar-user">
          {profile?.avatar_url ? (
            <img className="nav-avatar" src={profile.avatar_url} alt="" />
          ) : (
            <span className="nav-avatar-fallback">{(profile?.business_name || 'S')[0].toUpperCase()}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="admin-sidebar-user-name">{profile?.business_name || 'Admin'}</div>
            <div className="admin-sidebar-user-role" style={{ textTransform: 'capitalize' }}>
              {role === 'super_admin' ? 'Super Admin' : role === 'government' ? 'Pemerintah' : 'Bank Officer'}
            </div>
          </div>
        </div>

        {/* Section label */}
        <div style={{ padding: '14px 20px 6px', fontSize: 10.5, fontWeight: 700, color: '#576070', letterSpacing: 1, textTransform: 'uppercase' }}>
          Dashboard
        </div>

        {/* Nav items */}
        <nav className="admin-sidebar-nav">
          {items.map(({ to, label }) => (
            <button
              key={to}
              className={`admin-nav-item ${location.pathname === to ? 'active' : ''}`}
              onClick={() => { navigate(to); onClose(); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {to === '/admin/dashboards' && <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>}
                {to === '/dinkop' && <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>}
                {to === '/admin/monitoring' && <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>}
                {to === '/admin/impact' && <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/></>}
                {to === '/bank' && <><line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><polygon points="12 3 21 9 3 9"/></>}
                {to === '/admin/pengguna' && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                {to === '/admin/system' && <><rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><line x1="8" y1="7" x2="8.01" y2="7"/><line x1="8" y1="17" x2="8.01" y2="17"/></>}
              </svg>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default function TopNav({ variant = 'full' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const role = profile?.role || 'umkm_owner';
  const isAdmin = ADMIN_ROLES.includes(role);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Hamburger — hanya untuk admin/super_admin */}
            {user && isAdmin && (
              <button
                type="button"
                className="admin-hamburger"
                onClick={() => setSidebarOpen((o) => !o)}
                aria-label="Buka menu dashboard"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>
                </svg>
              </button>
            )}

            <div className="brand" onClick={() => navigate('/')}>
              <div className={variant === 'compact' ? 'brand-mark small' : 'brand-mark'}>W</div>
              <span className={variant === 'compact' ? 'brand-name small' : 'brand-name'}>WIRABUMI</span>
              {variant === 'full' && <span className="brand-badge">SOLO RAYA</span>}
            </div>
          </div>

          {variant === 'full' && user && role === 'umkm_owner' && (
            <nav className="navlinks">
              <button className={`navlink ${location.pathname === '/dashboard' ? 'current' : ''}`} onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button className={`navlink ${location.pathname === '/' ? 'current' : ''}`} onClick={() => navigate('/')}>Beranda</button>
              <button className={`navlink ${location.pathname === '/cara-kerja' ? 'current' : ''}`} onClick={() => navigate('/cara-kerja')}>Cara Kerja</button>
              <KeuanganDropdown current={location.pathname} />
              <button className={`navlink ${location.pathname === '/asisten' ? 'current' : ''}`} onClick={() => navigate('/asisten')}>Mas Sido</button>
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

      {/* Admin sidebar — muncul di atas semua halaman untuk admin */}
      {user && isAdmin && (
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          role={role}
          profile={profile}
        />
      )}
    </>
  );
}
