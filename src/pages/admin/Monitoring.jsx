import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../lib/apiClient';
import { ROLE_LABELS } from '../../lib/roles';

const ACTION_LABELS = {
  register: 'Daftar', login: 'Masuk', transaction_create: 'Catat Transaksi',
  transaction_bulk: 'Impor Transaksi', expense_create: 'Catat Pengeluaran',
  kur_document_create: 'Buat PDF KUR', legal_update: 'Update Legalitas',
  role_change: 'Ubah Peran', bank_consent_toggle: 'Ubah Izin Bank', bank_review_status: 'Review KUR Bank',
};

const RANK_COLORS = ['#D4AF37', '#9AA5B1', '#B08D57', 'var(--text-faint)'];
const LOG_COLS = '110px 1.6fr 0.9fr 1.6fr';

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Kemarin' : `${days} hari lalu`;
}

function BarList({ rows, valueKey, maxValue, labelFor, tone = 'var(--blue)' }) {
  if (rows.length === 0) return <div className="empty-state">Belum ada data.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {rows.map((r) => (
        <div key={r.role}>
          <div className="flex between" style={{ fontSize: 13, marginBottom: 6 }}>
            <span style={{ fontWeight: 700 }}>{labelFor(r)}</span>
            <span className="muted tabular">{r[valueKey]}</span>
          </div>
          <div style={{ height: 8, background: 'var(--bar-track)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(r[valueKey] / maxValue) * 100}%`, background: tone, borderRadius: 999 }}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Monitoring() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/monitoring').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="wrap-900"><div className="alert-error mt-26">{error}</div></div>;
  if (!data) return <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>;

  const isSuperAdmin = Array.isArray(data.users_by_role);
  const maxRoleActivity = Math.max(1, ...data.activity_by_role.map((r) => r.count));
  const maxRoleUsers = isSuperAdmin ? Math.max(1, ...data.users_by_role.map((r) => r.count)) : 1;
  const maxActiveUser = isSuperAdmin ? Math.max(1, ...data.most_active_users.map((u) => u.count)) : 1;

  return (
    <AdminLayout>
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>{isSuperAdmin ? 'KHUSUS SUPER ADMIN' : 'KHUSUS ADMIN'}</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>Monitoring Aktivitas</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>Data real dari log aktivitas seluruh pengguna — bukan tampilan statis.</p>

        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          {isSuperAdmin && (
            <div className="kpi-card">
              <div className="stat-label">Pengguna Terdaftar</div>
              <div className="kpi-value">{data.registered_users_count}</div>
              <div className="kpi-delta-flat">Seluruh peran</div>
            </div>
          )}
          <div className="kpi-card">
            <div className="stat-label">Pengguna Aktif</div>
            <div className="kpi-value" style={{ color: 'var(--blue-dark)' }}>{data.active_users_count}</div>
            <div className="kpi-delta-flat">Ada aktivitas dalam 24 jam terakhir</div>
          </div>
          <div className="kpi-card">
            <div className="stat-label">Aktivitas Hari Ini</div>
            <div className="kpi-value">{data.today_activity_count}</div>
            <div className="kpi-delta-flat">Sejak tengah malam</div>
          </div>
          {isSuperAdmin && (
            <div className="kpi-card">
              <div className="stat-label">Peran Terdaftar</div>
              <div className="kpi-value">{data.users_by_role.length}</div>
              <div className="kpi-delta-flat">UMKM, Pemerintah, Bank, Super Admin</div>
            </div>
          )}
        </div>

        {data.today_activity_by_type.length > 0 && (
          <div className="card-lg" style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 14 }}>
              RINCIAN AKTIVITAS HARI INI
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {data.today_activity_by_type.map((t) => (
                <span key={t.action_type} className="status-badge" style={{ fontSize: 12.5 }}>
                  {t.count} {ACTION_LABELS[t.action_type] || t.action_type}
                </span>
              ))}
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div className="dinkop-grid" style={{ marginTop: 0, marginBottom: 20 }}>
            <div className="card-lg">
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
                DISTRIBUSI PERAN PENGGUNA TERDAFTAR
              </div>
              <BarList
                rows={data.users_by_role}
                valueKey="count"
                maxValue={maxRoleUsers}
                labelFor={(r) => ROLE_LABELS[r.role] || r.role}
                tone="var(--green)"
              />
            </div>

            <div className="card-lg">
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
                PENGGUNA PALING AKTIF (30 HARI)
              </div>
              {data.most_active_users.length === 0 ? (
                <div className="empty-state">Belum ada aktivitas tercatat.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.most_active_users.map((u, i) => (
                    <div key={u.user_id} className="flex between" style={{ alignItems: 'center', gap: 10 }}>
                      <div className="flex" style={{ alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 999, flex: 'none', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 800,
                          color: '#fff', background: RANK_COLORS[i] || 'var(--text-faint)',
                        }}>{i + 1}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                          <span className="status-badge" style={{ fontSize: 10, padding: '1px 7px' }}>{ROLE_LABELS[u.role] || u.role}</span>
                        </div>
                      </div>
                      <div style={{ width: 90, flex: 'none' }}>
                        <div style={{ height: 6, background: 'var(--bar-track)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(u.count / maxActiveUser) * 100}%`, background: 'var(--blue)', borderRadius: 999 }}></div>
                        </div>
                      </div>
                      <span className="muted tabular" style={{ fontSize: 13, fontWeight: 700, flex: 'none' }}>{u.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card-lg" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
            DISTRIBUSI AKTIVITAS PER PERAN (30 HARI)
          </div>
          <BarList
            rows={data.activity_by_role}
            valueKey="count"
            maxValue={maxRoleActivity}
            labelFor={(r) => ROLE_LABELS[r.role] || r.role}
          />
        </div>

        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: LOG_COLS }}>
            <div>WAKTU</div><div>PENGGUNA</div><div>PERAN</div><div>AKSI</div>
          </div>
          {data.recent_activities.length === 0 ? (
            <div className="empty-state">Belum ada aktivitas tercatat.</div>
          ) : data.recent_activities.map((a) => (
            <div className="table-row" style={{ gridTemplateColumns: LOG_COLS }} key={a.id}>
              <div className="muted" style={{ whiteSpace: 'nowrap' }}>{timeAgo(a.created_at)}</div>
              <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.business_name || a.email}</div>
              <div><span className="status-badge" style={{ fontSize: 10.5, padding: '1px 8px' }}>{ROLE_LABELS[a.role_at_time] || a.role_at_time}</span></div>
              <div className="muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.description}</div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
