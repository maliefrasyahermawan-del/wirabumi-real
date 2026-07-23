import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';
import { api } from '../../lib/apiClient';
import { rupiah, formatDateID } from '../../lib/format';

const STATUS_LABELS = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const COLS = '1.5fr 1.1fr 0.8fr 1.2fr 1fr 100px';

function statusBadge(status) {
  const cls = status === 'approved' ? 'high' : status === 'rejected' ? '' : 'medium';
  return <span className={`status-badge ${cls}`}>{STATUS_LABELS[status] || status}</span>;
}

export default function Bank() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.get('/bank/consenting').then(setData).catch((err) => setError(err.message));
  }

  useEffect(() => { load(); }, []);

  async function setStatus(userId, status) {
    setBusy(true);
    try {
      await api.patch(`/bank/${userId}/status`, { status, notes });
      setExpanded(null);
      setNotes('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="wrap-1180"><div className="alert-error mt-26">{error}</div></div>;
  if (!data) return <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>;

  const { applications } = data;
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const a of applications) counts[a.review_status] = (counts[a.review_status] || 0) + 1;

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>DASHBOARD BANK</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>Pengajuan KUR</h1>
        <p className="page-sub" style={{ marginBottom: 24 }}>
          Hanya UMKM yang sudah memberi izin ("consent") yang tampil di sini — nama usaha, kategori, kecamatan,
          skor kelayakan, dan simulasi KUR terakhir. Transaksi dan chat mentah tidak pernah dibagikan.
        </p>

        <div className="kpi-grid" style={{ marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="stat-label">Menunggu</div>
            <div className="kpi-value">{counts.pending}</div>
          </div>
          <div className="kpi-card">
            <div className="stat-label">Disetujui</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>{counts.approved}</div>
          </div>
          <div className="kpi-card">
            <div className="stat-label">Ditolak</div>
            <div className="kpi-value" style={{ color: 'var(--red)' }}>{counts.rejected}</div>
          </div>
          <div className="kpi-card">
            <div className="stat-label">Total Mengizinkan</div>
            <div className="kpi-value">{applications.length}</div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: COLS }}>
            <div>NAMA USAHA</div><div>KATEGORI</div><div>SKOR</div><div>PLAFON KUR</div><div>STATUS</div><div>AKSI</div>
          </div>
          {applications.length === 0 ? (
            <div className="empty-state">Belum ada UMKM yang mengizinkan profilnya dilihat mitra Bank.</div>
          ) : applications.map((a) => (
            <div key={a.user_id}>
              <div className="table-row" style={{ gridTemplateColumns: COLS }}>
                <div style={{ fontWeight: 700 }}>{a.business_name}</div>
                <div className="muted">{a.business_category}</div>
                <div style={{ fontWeight: 700, color: a.skor >= 60 ? 'var(--green)' : 'var(--red)' }}>{a.skor}</div>
                <div className="muted">{a.plafon ? rupiah(a.plafon) : '— belum ada simulasi'}</div>
                <div>{statusBadge(a.review_status)}</div>
                <div>
                  <span
                    onClick={() => { setExpanded(expanded === a.user_id ? null : a.user_id); setNotes(a.notes || ''); }}
                    style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--blue-dark)', fontSize: 12.5 }}
                  >
                    {expanded === a.user_id ? 'Tutup' : 'Review'}
                  </span>
                </div>
              </div>
              {expanded === a.user_id && (
                <div style={{ padding: '14px 20px', background: 'var(--blue-lighter)', borderTop: '1px solid var(--border)' }}>
                  <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                    Kecamatan: {a.kecamatan || '—'} · Tenor: {a.tenor_bulan ? `${a.tenor_bulan} bulan` : '—'} · Simulasi dibuat: {a.kur_generated_at ? formatDateID(a.kur_generated_at) : '—'}
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan review (opsional)"
                    rows={2}
                    style={{ width: '100%', resize: 'vertical', marginBottom: 10, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  ></textarea>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff', border: 'none' }} disabled={busy} onClick={() => setStatus(a.user_id, 'approved')}>✓ Setujui</button>
                    <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff', border: 'none' }} disabled={busy} onClick={() => setStatus(a.user_id, 'rejected')}>✕ Tolak</button>
                    <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setStatus(a.user_id, 'pending')}>Kembalikan ke Menunggu</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
