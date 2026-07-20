import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { api } from '../lib/apiClient';

export default function Skor() {
  const navigate = useNavigate();
  const [score, setScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/score')
      .then(setScore)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>;
  if (error) return <div className="wrap-900"><div className="alert-error mt-26">{error}</div></div>;

  const total = score.total_score;
  const isLayak = score.status === 'Layak Diajukan';
  const conicDeg = Math.round((total / 100) * 360);

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-900">
        <header className="subheader">
          <div className="brand" onClick={() => navigate('/')}>
            <div className="brand-mark small">W</div>
            <span className="brand-name small">WIRABUMI</span>
          </div>
        </header>

        <div className="score-panel" style={{ animation: 'wbFade .5s ease' }}>
          <div className="center-text">
            <div className="score-ring" style={{ background: `conic-gradient(var(--blue) 0 ${conicDeg}deg, var(--blue-light) ${conicDeg}deg 360deg)` }}>
              <div className="score-ring-inner">
                <div className="score-num">{total}</div>
                <div className="score-of">dari 100</div>
              </div>
            </div>
            <div className={`score-status ${isLayak ? 'ok' : 'warn'}`}>{isLayak ? '● Layak Diajukan' : '● Perlu Peningkatan'}</div>
          </div>
          <div>
            <div className="score-eyebrow">SKOR KELAYAKAN USAHA</div>
            <h1 className="serif" style={{ fontWeight: 600, fontSize: 30, letterSpacing: '-0.5px', margin: '8px 0 0', lineHeight: 1.15 }}>
              {isLayak ? 'Usahamu sudah di jalur yang tepat' : 'Masih ada ruang untuk berkembang'}
            </h1>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-muted)', margin: '14px 0 0' }}>
              {isLayak
                ? `Dengan skor ${total}, usahamu sudah masuk kriteria layak untuk mengajukan KUR mikro. Naikkan sedikit lagi dengan melengkapi dokumen legalitas.`
                : `Skormu saat ini ${total}. Catat transaksi lebih rutin dan lengkapi dokumen legalitas usahamu untuk menaikkan skor ke atas 60.`}
            </p>
          </div>
        </div>

        <h2 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: '34px 0 16px', letterSpacing: '-0.3px' }}>Apa yang membentuk skormu</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {score.factors.map((f) => (
            <div className="factor-card" key={f.key}>
              <div className="factor-head">
                <div className="factor-name">{f.name}</div>
                <div className="factor-val">{f.val}</div>
              </div>
              <div className="factor-track"><div className="factor-fill" style={{ width: `${f.val}%` }}></div></div>
              <div className="factor-tip">{f.tip}</div>
            </div>
          ))}
        </div>

        <div className="flex between mt-26">
          <button className="btn btn-secondary btn-md" onClick={() => navigate('/pembukuan')}>← Ke Pembukuan</button>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/kur')}>Siapkan Berkas KUR →</button>
        </div>
      </div>
    </div>
  );
}
