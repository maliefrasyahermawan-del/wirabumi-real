import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';

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

export default function NotificationBell() {
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
      // notifications are a nicety, not a critical path - fail silently
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
