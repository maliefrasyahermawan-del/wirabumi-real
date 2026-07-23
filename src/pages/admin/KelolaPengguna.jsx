import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = { user: 'User', admin: 'Admin', super_admin: 'Super Admin' };
const COLS = '1.4fr 1.3fr 0.9fr 140px';

export default function KelolaPengguna() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.get('/admin/users').then(setUsers).catch((err) => setError(err.message));
  }

  useEffect(() => { load(); }, []);

  async function toggleRole(u) {
    if (u.role === 'super_admin') return; // not togglable via API, by design
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}/role`, { role: nextRole });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>KHUSUS SUPER ADMIN</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>Kelola Pengguna</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>
          Jadikan pengguna sebagai Admin (bisa lihat Monitoring &amp; Dashboard Dampak) atau kembalikan jadi User biasa.
          Peran "Super Admin" sengaja tidak bisa diberikan lewat halaman ini — hanya lewat akses database langsung.
        </p>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {!users ? (
          <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>
        ) : (
          <div className="table-card">
            <div className="table-head" style={{ gridTemplateColumns: COLS }}>
              <div>NAMA USAHA</div><div>EMAIL</div><div>PERAN</div><div>AKSI</div>
            </div>
            {users.map((u) => (
              <div className="table-row" style={{ gridTemplateColumns: COLS }} key={u.id}>
                <div style={{ fontWeight: 700 }}>{u.business_name || '—'}</div>
                <div className="muted">{u.email}</div>
                <div><span className="status-badge">{ROLE_LABELS[u.role] || u.role}</span></div>
                <div>
                  {u.role === 'super_admin' ? (
                    <span className="muted" style={{ fontSize: 12 }}>— tetap —</span>
                  ) : u.id === user.id ? (
                    <span className="muted" style={{ fontSize: 12 }}>Akun kamu</span>
                  ) : (
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={busyId === u.id}
                      onClick={() => toggleRole(u)}
                    >
                      {busyId === u.id ? '…' : u.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
