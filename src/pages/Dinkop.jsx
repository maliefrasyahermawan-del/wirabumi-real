import { useEffect, useState } from 'react';
import TopNav from '../components/TopNav';
import UsahaDashboard from '../components/UsahaDashboard';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

function ChartIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function DinkopTeaser({ data, onReveal }) {
  return (
    <div className="wrap-1180" style={{ marginTop: 36 }}>
      <div className="card-lg" style={{ textAlign: 'center', padding: '46px 32px', background: 'var(--blue-lighter)' }}>
        <div style={{ width: 62, height: 62, borderRadius: 16, background: 'var(--blue)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <ChartIcon />
        </div>
        <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Lihat performa UMKM se-Solo Raya</h2>
        <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
          {data.total_umkm.toLocaleString('id-ID')} UMKM sudah terhubung, skor rata-rata {data.avg_score}.
        </p>
        <button className="btn btn-primary btn-md" style={{ marginTop: 20 }} onClick={onReveal}>Lihat Dashboard Dinkop →</button>
      </div>
    </div>
  );
}

export default function Dinkop() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showDinkop, setShowDinkop] = useState(false);

  useEffect(() => {
    api.get('/dinkop-dashboard').then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="wrap-900"><div className="alert-error mt-26">{error}</div></div>;
  if (!data) return <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>;

  const maxKec = Math.max(1, ...data.per_kecamatan.map((k) => k.skor));
  const maxTrend = Math.max(1, ...data.monthly_trend.map((m) => m.umkm_aktif));

  const dinkopContent = (
    <div className="wrap-1180" style={{ marginTop: user ? 36 : 0 }}>
      {user && (
        <button className="navlink" style={{ marginBottom: 14 }} onClick={() => setShowDinkop(false)}>← Sembunyikan</button>
      )}

      <div className="flex" style={{ alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 0 20px', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Dashboard Dinkop UKM Perindustrian · Solo Raya</div>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 28, letterSpacing: '-0.5px', margin: 0 }}>Persebaran Kelayakan UMKM</h1>
        </div>
        <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Data agregat real-time · tanpa data individu</span>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="stat-label">UMKM Terhubung</div><div className="kpi-value">{data.total_umkm.toLocaleString('id-ID')}</div></div>
        <div className="kpi-card"><div className="stat-label">Rata-rata Skor</div><div className="kpi-value" style={{ color: 'var(--blue-dark)' }}>{data.avg_score}</div></div>
        <div className="kpi-card"><div className="stat-label">Layak Ajukan KUR</div><div className="kpi-value">{data.layak_pct}%</div><div className="kpi-delta-flat">{data.layak_count} UMKM</div></div>
        <div className="kpi-card"><div className="stat-label">Berkas KUR Dibuat</div><div className="kpi-value">{data.kur_docs_count.toLocaleString('id-ID')}</div></div>
      </div>

      <div className="dinkop-grid">
        <div className="card-lg">
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 18 }}>SKOR RATA-RATA PER KECAMATAN</div>
          {data.per_kecamatan.length === 0 ? (
            <div className="empty-state">Belum ada data kecamatan.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {data.per_kecamatan.map((k) => (
                <div className="kec-row" key={k.nama}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{k.nama}</div>
                  <div className="kec-bar-track"><div className="kec-bar-fill" style={{ width: `${(k.skor / maxKec) * 100}%` }}></div></div>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 17, textAlign: 'right' }}>{k.skor}</div>
                  <div className="muted" style={{ fontSize: 12, textAlign: 'right' }}>{k.umkm}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-lg">
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px' }}>UMKM AKTIF PER BULAN</div>
          <div className="serif" style={{ fontSize: 15, color: 'var(--text-muted)', margin: '4px 0 20px' }}>7 bulan terakhir</div>
          <div className="trend-bars">
            {data.monthly_trend.map((m, i) => (
              <div className="trend-col" key={i}><div className="trend-fill" style={{ height: `${(m.umkm_aktif / maxTrend) * 100}%` }}></div></div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 600, marginTop: 8 }}>
            {data.monthly_trend.map((m, i) => <span key={i}>{m.bulan}</span>)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page full-h">
      <TopNav />

      {user ? (
        <>
          <UsahaDashboard />
          {showDinkop ? dinkopContent : <DinkopTeaser data={data} onReveal={() => setShowDinkop(true)} />}
        </>
      ) : dinkopContent}
    </div>
  );
}
