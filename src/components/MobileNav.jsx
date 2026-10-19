import { useLocation, useNavigate } from 'react-router-dom';

const items = [
  { to: '/dashboard/umkm', label: 'Beranda', icon: 'home' },
  { to: '/pembukuan', label: 'Catat', icon: 'book' },
  { to: '/pembukuan/tambah', label: 'Tambah', icon: 'plus', primary: true },
  { to: '/skor', label: 'Insight', icon: 'chart' },
  { to: '/asisten', label: 'Mira', icon: 'spark' },
];

function Icon({ name }) {
  if (name === 'plus') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
  if (name === 'book') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17.5H7.5A2.5 2.5 0 0 0 5 22zM5 4.5v15" /><path d="M9 6h7M9 10h7" /></svg>;
  if (name === 'chart') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>;
  if (name === 'spark') return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>;
}

export default function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="mobile-nav" aria-label="Navigasi aplikasi mobile">
      {items.map((item) => {
        const active = item.to === '/dashboard/umkm'
          ? location.pathname === '/dashboard' || location.pathname === '/dashboard/umkm'
          : location.pathname === item.to || (item.to === '/pembukuan' && location.pathname.startsWith('/pembukuan/'));
        return (
          <button
            type="button"
            key={item.to}
            className={`mobile-nav-item ${active ? 'active' : ''} ${item.primary ? 'primary' : ''}`}
            onClick={() => navigate(item.to)}
            aria-current={active ? 'page' : undefined}
          >
            <span className="mobile-nav-icon"><Icon name={item.icon} /></span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
