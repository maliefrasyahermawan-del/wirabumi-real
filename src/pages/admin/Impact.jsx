import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../lib/apiClient';
import { formatDateID } from '../../lib/format';

const KECAMATAN_OPTIONS = ['Pasar Kliwon', 'Serengan', 'Laweyan', 'Jebres', 'Banjarsari'];
const STATUS_OPTIONS = ['Layak Diajukan', 'Perlu Peningkatan'];
const COLS = '1.6fr 1.1fr 1fr 0.8fr 0.9fr 90px';

function prioritasChip(p) {
  const cfg = { Tinggi: ['var(--red)', 'var(--red-bg)'], Sedang: ['var(--amber)', 'var(--amber-bg)'], Rendah: ['var(--green)', 'var(--green-bg)'] }[p] || ['var(--text-muted)', 'var(--blue-lighter)'];
  return <span className="status-badge" style={{ color: cfg[0], background: cfg[1] }}>{p}</span>;
}

export default function Impact() {
  const [kecamatan, setKecamatan] = useState('');
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (kecamatan) params.set('kecamatan', kecamatan);
    if (status) params.set('status', status);
    api.get(`/admin/impact?${params.toString()}`).then(setData).catch((err) => setError(err.message));
  }, [kecamatan, status]);

  if (error) return <div className="wrap-1180"><div className="alert-error mt-26">{error}</div></div>;

  return (
    <AdminLayout>
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>KHUSUS ADMIN</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>Dashboard Dampak</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>Ringkasan dampak WIRABUMI ke UMKM binaan, dan daftar yang paling perlu ditindaklanjuti.</p>

        {!data ? (
          <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>
        ) : (
          <>
            <div className="kpi-grid" style={{ marginBottom: 20 }}>
              <div className="kpi-card">
                <div className="stat-label">Total UMKM</div>
                <div className="kpi-value" style={{ color: 'var(--blue-dark)' }}>{data.metrics.total_umkm}</div>
                <div className="kpi-delta-flat">{kecamatan || status ? 'Sesuai filter aktif' : 'Semua UMKM terdaftar'}</div>
              </div>
              <div className="kpi-card">
                <div className="stat-label">Skor Rata-rata</div>
                <div className="kpi-value">{data.metrics.avg_score}</div>
                <div className="kpi-delta-flat">dari 100</div>
              </div>
              <div className="kpi-card">
                <div className="stat-label">% Layak KUR</div>
                <div className="kpi-value" style={{ color: 'var(--green)' }}>{data.metrics.layak_pct}%</div>
                <div className="kpi-delta-flat">Skor kelayakan &gt;= 60</div>
              </div>
              <div className="kpi-card">
                <div className="stat-label">Berkas KUR Dibuat</div>
                <div className="kpi-value">{data.metrics.kur_docs_count}</div>
                <div className="kpi-delta-flat">Total unduhan PDF</div>
              </div>
            </div>

            <div className="flex" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <select value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="">Semua Kecamatan</option>
                {KECAMATAN_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="">Semua Status</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="table-card">
              <div className="table-head" style={{ gridTemplateColumns: COLS }}>
                <div>NAMA USAHA</div><div>KATEGORI</div><div>STATUS</div><div>PRIORITAS</div><div>WAKTU</div><div>AKSI</div>
              </div>
              {data.rows.length === 0 ? (
                <div className="empty-state">Tidak ada UMKM yang cocok dengan filter ini.</div>
              ) : data.rows.map((r) => (
                <div key={r.user_id}>
                  <div className="table-row" style={{ gridTemplateColumns: COLS }}>
                    <div style={{ fontWeight: 700 }}>{r.nama_usaha}</div>
                    <div className="muted">{r.kategori}</div>
                    <div><span className={`status-badge ${r.status === 'Layak Diajukan' ? '' : 'dp'}`}>{r.status}</span></div>
                    <div>{prioritasChip(r.prioritas)}</div>
                    <div className="muted">{r.waktu ? formatDateID(r.waktu) : '—'}</div>
                    <div>
                      <span onClick={() => setExpanded(expanded === r.user_id ? null : r.user_id)} style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--blue-dark)', fontSize: 12.5 }}>
                        {expanded === r.user_id ? 'Tutup' : 'Detail'}
                      </span>
                    </div>
                  </div>
                  {expanded === r.user_id && (
                    <div style={{ padding: '12px 20px', background: 'var(--blue-lighter)', borderTop: '1px solid var(--border)', fontSize: 13, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      <div><span className="muted">Kecamatan:</span> {r.kecamatan || '—'}</div>
                      <div><span className="muted">Skor kelayakan:</span> {r.skor}/100</div>
                      <div><span className="muted">Transaksi terakhir:</span> {r.waktu ? formatDateID(r.waktu) : 'Belum ada'}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
