import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../../components/TopNav';
import { api } from '../../lib/apiClient';

const PERMISSION_MATRIX = [
  { route: '/dashboard (dashboard pribadi)', roles: 'UMKM' },
  { route: '/dinkop (dashboard agregat)', roles: 'Pemerintah, Bank, Super Admin' },
  { route: '/admin/monitoring (monitoring aktivitas)', roles: 'Pemerintah, Super Admin' },
  { route: '/admin/impact (dashboard dampak)', roles: 'Pemerintah, Super Admin' },
  { route: '/bank (review pengajuan KUR)', roles: 'Bank, Super Admin' },
  { route: '/admin/pengguna (kelola pengguna)', roles: 'Super Admin' },
  { route: '/admin/system (halaman ini)', roles: 'Super Admin' },
];

function formatBytes(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function timeAgo(dateStr) {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

export default function System() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/system').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="wrap-1180"><div className="alert-error mt-26">{error}</div></div>;
  if (!data) return <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>;

  const maxLlm = Math.max(1, ...data.llm_usage_7d.map((l) => l.success + l.failed));

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>KHUSUS SUPER ADMIN</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>System</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>
          Metrik nyata dari database &amp; log server - bukan angka karangan. Kalau belum ada data (mis. belum ada
          error tercatat), kartunya menampilkan kosong, bukan dipalsukan.
        </p>

        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="stat-label">Total Pengguna</div>
            <div className="kpi-value">{data.total_users}</div>
          </div>
          <div className="kpi-card">
            <div className="stat-label">Total UMKM</div>
            <div className="kpi-value" style={{ color: 'var(--blue-dark)' }}>{data.total_umkm}</div>
          </div>
          <div className="kpi-card">
            <div className="stat-label">Ukuran Database</div>
            <div className="kpi-value">{formatBytes(data.db_size_bytes)}</div>
          </div>
          <div className="kpi-card">
            <div className="stat-label">Status Database</div>
            <div className="kpi-value" style={{ color: data.db_healthy ? 'var(--green)' : 'var(--red)', fontSize: 22 }}>
              {data.db_healthy ? '● Sehat' : '● Bermasalah'}
            </div>
          </div>
        </div>

        <div className="dinkop-grid" style={{ marginTop: 0 }}>
          <div className="card-lg">
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
              PEMAKAIAN LLM (7 HARI TERAKHIR)
            </div>
            {data.llm_usage_7d.length === 0 ? (
              <div className="empty-state">Belum ada panggilan Groq tercatat.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.llm_usage_7d.map((l) => {
                  return (
                    <div key={l.feature}>
                      <div className="flex between" style={{ fontSize: 13, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>{l.feature}</span>
                        <span className="muted tabular">{l.success} sukses / {l.failed} gagal</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--bar-track)', borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
                        <div style={{ height: '100%', width: `${(l.success / maxLlm) * 100}%`, background: 'var(--green)' }}></div>
                        <div style={{ height: '100%', width: `${(l.failed / maxLlm) * 100}%`, background: 'var(--red)' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card-lg">
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
              ERROR LOG TERBARU
            </div>
            {data.recent_errors.length === 0 ? (
              <div className="empty-state">Belum ada error server tercatat.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                {data.recent_errors.map((e) => (
                  <div key={e.id} style={{ fontSize: 12.5, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: 'var(--red)' }}>{e.message}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{e.route || ' - '} · {timeAgo(e.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card-lg" style={{ marginTop: 16 }}>
          <div className="flex between" style={{ marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px' }}>ROLE MANAGEMENT</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/admin/pengguna')}>Kelola Pengguna →</button>
          </div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>
            Ubah peran akun (UMKM/Pemerintah/Bank) di halaman Kelola Pengguna. Peran Super Admin hanya bisa
            diberikan lewat akses database langsung, tidak lewat aplikasi.
          </p>
        </div>

        <div className="card-lg" style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 16 }}>
            PERMISSION MANAGEMENT (REFERENSI)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PERMISSION_MATRIX.map((p) => (
              <div key={p.route} className="flex between" style={{ fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{p.route}</span>
                <span className="muted" style={{ textAlign: 'right' }}>{p.roles}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
