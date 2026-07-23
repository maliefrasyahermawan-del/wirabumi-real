import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import { api } from '../../lib/apiClient';
import { ROLE_LABELS } from '../../lib/roles';

const ACTION_LABELS = {
  register: 'Daftar', login: 'Masuk', transaction_create: 'Catat Transaksi',
  transaction_bulk: 'Impor Transaksi', expense_create: 'Catat Pengeluaran',
  kur_document_create: 'Buat PDF KUR', legal_update: 'Update Legalitas',
  role_change: 'Ubah Peran', bank_consent_toggle: 'Ubah Izin Bank', bank_review_status: 'Review KUR Bank',
};

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Kemarin' : `${days} hari lalu`;
}

export default function Monitoring() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/monitoring').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="wrap-900"><div className="alert-error mt-26">{error}</div></div>;
  if (!data) return <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>;

  const maxRoleCount = Math.max(1, ...data.activity_by_role.map((r) => r.count));

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>KHUSUS ADMIN</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>Monitoring Aktivitas</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>Data real dari log aktivitas seluruh pengguna — bukan tampilan statis.</p>

        <div className="kpi-grid" style={{ marginBottom: 24 }}>
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

        <div className="dinkop-grid" style={{ marginTop: 0 }}>
          <div className="card-lg">
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
              DISTRIBUSI AKTIVITAS PER PERAN (30 HARI)
            </div>
            {data.activity_by_role.length === 0 ? (
              <div className="empty-state">Belum ada aktivitas tercatat.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.activity_by_role.map((r) => (
                  <div key={r.role}>
                    <div className="flex between" style={{ fontSize: 13, marginBottom: 6 }}>
                      <span style={{ fontWeight: 700 }}>{ROLE_LABELS[r.role] || r.role}</span>
                      <span className="muted tabular">{r.count}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--bar-track)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(r.count / maxRoleCount) * 100}%`, background: 'var(--blue)', borderRadius: 999 }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-lg">
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
              AKTIVITAS TERBARU
            </div>
            {data.recent_activities.length === 0 ? (
              <div className="empty-state">Belum ada aktivitas tercatat.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 360, overflowY: 'auto' }}>
                {data.recent_activities.map((a) => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.description}</div>
                      <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>
                        {a.business_name || a.email} · <span className="status-badge" style={{ fontSize: 10, padding: '1px 7px' }}>{ROLE_LABELS[a.role_at_time] || a.role_at_time}</span>
                      </div>
                    </div>
                    <span className="muted" style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}>{timeAgo(a.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
