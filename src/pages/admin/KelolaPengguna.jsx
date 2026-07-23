import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/roles';

const ASSIGNABLE_ROLES = ['umkm_owner', 'government', 'bank_officer'];
const COLS = '1.4fr 1.3fr 0.9fr 180px';

export default function KelolaPengguna() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.get('/admin/users').then(setUsers).catch((err) => setError(err.message));
  }

  useEffect(() => { load(); }, []);

  async function changeRole(u, nextRole) {
    if (nextRole === u.role) return;
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
    <AdminLayout>
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>KHUSUS SUPER ADMIN</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>Kelola Pengguna</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>
          Atur peran akun: UMKM, Pemerintah (Dinkop), atau Bank. Peran "Super Admin" sengaja tidak bisa
          diberikan lewat halaman ini — hanya lewat akses database langsung.
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
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => changeRole(u, e.target.value)}
                      style={{ padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13 }}
                    >
                      {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
