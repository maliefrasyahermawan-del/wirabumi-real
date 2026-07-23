import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/apiClient';
import { ROLE_HOME } from '../lib/roles';

function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  return `${days} hari lalu`;
}

const NOTIF_TARGETS = {
  capture_daily: '/pembukuan',
  low_confidence: '/pembukuan',
  monthly_recap: '/laporan',
  weekly_drop: '/dashboard',
};

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  async function load() {
    try {
      const data = await api.get('/notifications');
      setItems(data.notifications || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // notifications are a nicety, not a critical path — fail silently
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function openNotif(n) {
    if (!n.read_at) {
      const readAt = new Date().toISOString();
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: readAt } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      api.post(`/notifications/${n.id}/read`, {}).catch(() => {});
    }
    setOpen(false);
    navigate(NOTIF_TARGETS[n.type] || '/dashboard');
  }

  async function markAllRead() {
    const readAt = new Date().toISOString();
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || readAt })));
    setUnreadCount(0);
    api.post('/notifications/read-all', {}).catch(() => {});
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => { setOpen((o) => !o); load(); }}
        title="Notifikasi"
      >
        <BellIcon />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="nav-dropdown nav-dropdown-end notif-panel">
          <div className="nav-dropdown-user" style={{ justifyContent: 'space-between', padding: '6px 10px' }}>
            <span className="nav-dropdown-user-name">Notifikasi</span>
            {unreadCount > 0 && (
              <span onClick={markAllRead} style={{ cursor: 'pointer', fontSize: 12, color: 'var(--blue-dark)', fontWeight: 700 }}>Tandai semua dibaca</span>
            )}
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">Belum ada notifikasi.</div>
          ) : (
            items.map((n) => (
              <button key={n.id} className={`notif-item ${!n.read_at ? 'unread' : ''}`} onClick={() => openNotif(n)}>
                {n.title}
                <span className="notif-item-time">{timeAgo(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

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

function AdminDropdown({ current, role }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const links = [
    { to: '/admin/monitoring', label: 'Monitoring Aktivitas', desc: 'Pengguna aktif & log aktivitas' },
    { to: '/admin/impact', label: 'Dashboard Dampak', desc: 'Metrik & daftar UMKM binaan' },
    ...(role === 'super_admin' ? [
      { to: '/bank', label: 'Dashboard Bank', desc: 'Review pengajuan KUR' },
      { to: '/admin/pengguna', label: 'Kelola Pengguna', desc: 'Atur peran UMKM/Pemerintah/Bank' },
      { to: '/admin/system', label: 'System', desc: 'Storage, LLM usage, error log' },
    ] : []),
  ];
  const isActive = links.some((l) => l.to === current);

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
        Admin {open ? '▴' : '▾'}
      </button>
      {open && (
        <div className="nav-dropdown">
          {links.map((l) => (
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

function ProfileDropdown() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(section) {
    navigate(`/profil?section=${section}`);
    setOpen(false);
  }

  const initial = (profile?.business_name || 'U')[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`nav-avatar-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Profil & pengaturan"
      >
        {profile?.avatar_url ? (
          <img className="nav-avatar" src={profile.avatar_url} alt="" />
        ) : (
          <span className="nav-avatar-fallback">{initial}</span>
        )}
      </button>
      {open && (
        <div className="nav-dropdown nav-dropdown-end">
          <div className="nav-dropdown-user">
            {profile?.avatar_url ? (
              <img className="nav-avatar md" src={profile.avatar_url} alt="" />
            ) : (
              <span className="nav-avatar-fallback md">{initial}</span>
            )}
            <div>
              <div className="nav-dropdown-user-name">{profile?.business_name || 'Usahaku'}</div>
              <div className="nav-dropdown-user-email">{profile?.email}</div>
            </div>
          </div>
          <button className="nav-dropdown-item" onClick={() => go('profil')}>Lihat Profil</button>
          <button className="nav-dropdown-item" onClick={() => go('akun')}>Pengaturan Akun</button>
          <button className="nav-dropdown-item" onClick={() => { navigate('/tentang'); setOpen(false); }}>Tentang</button>
          <button className="nav-dropdown-item" onClick={() => { navigate('/ulasan'); setOpen(false); }}>Berikan Ulasan</button>
          <div className="nav-dropdown-divider" />
          <button className="nav-dropdown-item" onClick={() => signOut()}>Keluar</button>
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
            {(role === 'government' || role === 'super_admin') && (
              <AdminDropdown current={location.pathname} role={role} />
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
