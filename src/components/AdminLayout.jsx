import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../lib/roles';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import ProfileDropdown from './ProfileDropdown';

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function ImpactIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </svg>
  );
}

function BankIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21" /><line x1="5" y1="21" x2="5" y2="10" /><line x1="19" y1="21" x2="19" y2="10" />
      <polygon points="12 3 21 9 3 9" /><line x1="9" y1="21" x2="9" y2="10" /><line x1="15" y1="21" x2="15" y2="10" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="6" rx="1.5" /><rect x="4" y="14" width="16" height="6" rx="1.5" />
      <line x1="8" y1="7" x2="8.01" y2="7" /><line x1="8" y1="17" x2="8.01" y2="17" />
    </svg>
  );
}

function MonitoringIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const NAV_ITEMS = {
  government: [
    { to: '/dinkop', label: 'Dashboard', Icon: DashboardIcon },
    { to: '/admin/monitoring', label: 'Monitoring Aktivitas', Icon: MonitoringIcon },
    { to: '/admin/impact', label: 'Dashboard Dampak', Icon: ImpactIcon },
  ],
  bank_officer: [
    { to: '/bank', label: 'Dashboard', Icon: BankIcon },
  ],
  super_admin: [
    { to: '/dinkop', label: 'Dashboard', Icon: DashboardIcon },
    { to: '/admin/monitoring', label: 'Monitoring Aktivitas', Icon: MonitoringIcon },
    { to: '/admin/impact', label: 'Dashboard Dampak', Icon: ImpactIcon },
    { to: '/bank', label: 'Dashboard Bank', Icon: BankIcon },
    { to: '/admin/pengguna', label: 'Kelola Pengguna', Icon: UsersIcon },
    { to: '/admin/system', label: 'System', Icon: SystemIcon },
  ],
};


export default function AdminLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile?.role || 'government';
  const items = NAV_ITEMS[role] || [];
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`admin-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {sidebarOpen && (
        <div className="admin-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand" onClick={() => navigate('/')}>
          <div className="brand-mark small">W</div>
          <span className="admin-sidebar-brand-name">WIRABUMI</span>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); }}
            aria-label="Tutup sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="admin-sidebar-user">
          {profile?.avatar_url ? (
            <img className="nav-avatar" src={profile.avatar_url} alt="" />
          ) : (
            <span className="nav-avatar-fallback">{(profile?.business_name || 'S')[0].toUpperCase()}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div className="admin-sidebar-user-name">{profile?.business_name || 'Staf'}</div>
            <div className="admin-sidebar-user-role">{ROLE_LABELS[role] || role}</div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          {items.map(({ to, label, Icon }) => (
            <button
              key={to}
              className={`admin-nav-item ${location.pathname === to ? 'active' : ''}`}
              onClick={() => navigate(to)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="admin-hamburger"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Buka/tutup menu"
          >
            <HamburgerIcon />
          </button>
          <button className="admin-topbar-link" onClick={() => navigate('/')}>Beranda</button>
          <div className="flex-center gap-12" style={{ marginLeft: 'auto' }}>
            <div className="topnav-toolbar">
              <NotificationBell />
              <ThemeToggle />
              <span className="topnav-toolbar-divider" />
              <ProfileDropdown />
            </div>
          </div>
        </header>
        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
