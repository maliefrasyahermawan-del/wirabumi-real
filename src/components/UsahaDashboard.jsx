import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { rupiah } from '../lib/format';
import AiInsightCard from './AiInsightCard';

function monthRangeISO() {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const until = now.toISOString().slice(0, 10);
  return { since, until };
}

const PERIODS = [
  { key: '1w', label: '1 Minggu', noun: 'minggu' },
  { key: '3w', label: '3 Minggu', noun: '3 minggu' },
  { key: '1m', label: '1 Bulan', noun: 'bulan' },
  { key: '3m', label: '3 Bulan', noun: '3 bulan' },
];

function startOfDay(d) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function buildTrendBuckets(txns, periodKey) {
  const today = startOfDay(new Date());
  const buckets = [];

  if (periodKey === '1w') {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      buckets.push({ start: d, end: d, label: d.toLocaleDateString('id-ID', { weekday: 'short' }), total: 0 });
    }
  } else if (periodKey === '3w') {
    for (let i = 2; i >= 0; i--) {
      const end = new Date(today); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      buckets.push({ start, end, label: `Mgu ${3 - i}`, total: 0 });
    }
  } else if (periodKey === '1m') {
    for (let i = 3; i >= 0; i--) {
      const end = new Date(today); end.setDate(end.getDate() - i * 7);
      const start = new Date(end); start.setDate(start.getDate() - 6);
      buckets.push({ start, end, label: `Mgu ${4 - i}`, total: 0 });
    }
  } else {
    for (let i = 2; i >= 0; i--) {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      buckets.push({ start, end, label: start.toLocaleDateString('id-ID', { month: 'short' }), total: 0 });
    }
  }

  for (const t of txns || []) {
    const d = startOfDay(new Date(t.tanggal + 'T00:00:00'));
    for (const b of buckets) {
      if (d >= b.start && d <= b.end) { b.total += Number(t.harga); break; }
    }
  }
  return buckets;
}

function trendInsight(trend, periodKey) {
  const noun = PERIODS.find((p) => p.key === periodKey)?.noun || 'periode';
  const cur = trend[trend.length - 1].total;
  const prev = trend[trend.length - 2].total;
  if (prev === 0) {
    return cur > 0
      ? `Omzet ${noun} ini mulai tercatat. Pertahankan supaya trennya makin jelas terlihat.`
      : `Belum ada omzet tercatat pada periode ini.`;
  }
  const pct = Math.round(((cur - prev) / prev) * 100);
  return pct >= 0
    ? `Omzet ${noun} ini naik ${pct}% dibanding periode sebelumnya. Pertahankan ya!`
    : `Omzet ${noun} ini turun ${Math.abs(pct)}% dibanding periode sebelumnya. Coba tingkatkan promosi atau catat transaksi lebih rutin.`;
}

function formatBucketRange(bucket, periodKey) {
  if (periodKey === '1w') {
    return bucket.start.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  if (periodKey === '3m') {
    return bucket.start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  const fmt = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  return `${fmt(bucket.start)} – ${fmt(bucket.end)}`;
}

function topProductsInRange(txns, start, end) {
  const byProduct = {};
  for (const t of txns || []) {
    const d = startOfDay(new Date(t.tanggal + 'T00:00:00'));
    if (d >= start && d <= end) {
      byProduct[t.produk] = (byProduct[t.produk] || 0) + Number(t.harga);
    }
  }
  return Object.entries(byProduct)
    .map(([produk, total]) => ({ produk, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function QuestCard({ quest, onStart }) {
  const isAuto = quest.estimasi_waktu === 'Otomatis terdeteksi';
  const metaParts = [`+${quest.poin} poin`, quest.estimasi_waktu];
  if (quest.category === 'legal') metaParts.push(quest.gratis ? 'Gratis' : 'Berbayar');
  return (
    <div className="quest-card">
      <div className="quest-card-title">{quest.title}</div>
      <div className="quest-card-meta">{metaParts.join(' · ')}</div>
      {quest.dampak_finansial && <div className="quest-card-impact">→ {quest.dampak_finansial}</div>}
      <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => onStart(quest)}>
        {isAuto ? 'Catat Transaksi →' : 'Mulai Sekarang'}
      </button>
    </div>
  );
}

export default function UsahaDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('1m');
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [quests, setQuests] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  function choosePeriod(key) {
    setPeriod(key);
    setSelectedBucket(null);
  }

  useEffect(() => {
    async function load() {
      const { since, until } = monthRangeISO();
      const [score, offer, laba, txns, questsRes] = await Promise.all([
        api.get('/score'),
        api.get('/kur/offer?tenor=24'),
        api.get(`/report/laba-rugi?since=${since}&until=${until}`),
        api.get('/transactions'),
        api.get('/quests'),
      ]);
      setQuests(questsRes);

      const now = new Date();
      const monthTxns = (txns || []).filter((t) => {
        const d = new Date(t.tanggal + 'T00:00:00');
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      const monthTotal = monthTxns.reduce((a, t) => a + Number(t.harga), 0);

      const byProduct = {};
      for (const t of txns || []) byProduct[t.produk] = (byProduct[t.produk] || 0) + Number(t.harga);
      const topProducts = Object.entries(byProduct)
        .map(([produk, total]) => ({ produk, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      setData({ score, offer, laba, monthTotal, monthCount: monthTxns.length, topProducts, txns: txns || [] });
    }
    load();
  }, []);

  const trend = useMemo(() => (data ? buildTrendBuckets(data.txns, period) : []), [data, period]);

  if (!data) {
    return (
      <div className="wrap-1180" style={{ paddingTop: 30 }}>
        <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>
      </div>
    );
  }

  const { score, offer, laba, monthTotal, monthCount, topProducts } = data;
  const legal = [
    { label: 'NIB', done: !!profile?.legal_nib },
    { label: 'P-IRT / Merek', done: !!profile?.legal_pirt },
    { label: 'Sertifikasi Halal', done: !!profile?.legal_halal },
  ];
  const legalDoneCount = legal.filter((l) => l.done).length;
  const maxTrend = Math.max(1, ...trend.map((b) => b.total));
  const activeBucket = selectedBucket !== null ? trend[selectedBucket] : null;
  const bucketTopProducts = activeBucket ? topProductsInRange(data.txns, activeBucket.start, activeBucket.end) : null;

  return (
    <div className="wrap-1180" style={{ paddingTop: 26 }}>
      <div className="flex" style={{ alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div className="muted" style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Dashboard Usaha</div>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 28, letterSpacing: '-0.5px', margin: 0 }}>{profile?.business_name || 'Usahaku'}</h1>
        </div>
        <span className="connected-badge"><span className="connected-dot"></span>Data real dari pembukuanmu</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <AiInsightCard endpoint="/insight/umkm" title="AI Insight Usaha" />
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="stat-label">Skor Kelayakan</div>
          <div className="kpi-value" style={{ color: 'var(--blue-dark)' }}>{score.total_score}</div>
          <div className="kpi-delta-flat">{score.status}</div>
        </div>
        <div className="kpi-card">
          <div className="stat-label">Omzet Bulan Ini</div>
          <div className="kpi-value">{rupiah(monthTotal)}</div>
          <div className="kpi-delta-flat">{monthCount} transaksi</div>
        </div>
        <div className="kpi-card">
          <div className="stat-label">Laba Bersih Bulan Ini</div>
          <div className="kpi-value" style={{ color: laba.laba_bersih >= 0 ? 'var(--green)' : 'var(--red)' }}>{rupiah(laba.laba_bersih)}</div>
          <div className="kpi-delta-flat">Pendapatan dikurangi beban</div>
        </div>
        <div className="kpi-card">
          <div className="stat-label">Plafon KUR Tersedia</div>
          <div className="kpi-value">{rupiah(offer.plafon)}</div>
          <div className="kpi-delta-flat">tenor {offer.tenor_bulan} bulan</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) minmax(220px, 1fr)', gap: 16, marginTop: 16, alignItems: 'start' }}>
        {quests && (
          <div className="card-lg">
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 4 }}>
              LANGKAH YANG DIREKOMENDASIKAN ({quests.active_quests.length})
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 16px' }}>
              Langkah berikutnya yang paling berdampak buat skormu, dipilih otomatis dari faktor yang paling lemah.
            </p>
            {quests.active_quests.length === 0 ? (
              <div className="empty-state">Semua langkah yang tersedia sudah kamu selesaikan. Mantap!</div>
            ) : (
              <div className="quest-grid">
                {quests.active_quests.map((q) => (
                  <QuestCard key={q.key} quest={q} onStart={(quest) => navigate(quest.target)} />
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <span onClick={() => setShowCompleted((s) => !s)} style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
                ✓ Langkah Selesai ({quests.completed_quests.length}) {showCompleted ? '▴' : '▾'}
              </span>
              {showCompleted && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  {quests.completed_quests.length === 0 ? (
                    <div className="empty-state">Belum ada langkah yang selesai.</div>
                  ) : quests.completed_quests.map((q) => (
                    <div key={q.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 13.5 }}>
                      <span>{q.title}</span>
                      <span className="muted" style={{ fontWeight: 700 }}>+{q.poin} poin</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="card-lg" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>Mau lihat rincian skor, simulasi KUR, atau laporan laba rugi lengkap?</div>
          <button className="btn btn-secondary" style={{ fontSize: 14, padding: '11px 20px', borderRadius: 10, width: '100%' }} onClick={() => navigate('/skor')}>Skor Kelayakan</button>
          <button className="btn btn-primary" style={{ fontSize: 14, padding: '11px 20px', borderRadius: 10, width: '100%' }} onClick={() => navigate('/kur')}>Ajukan KUR →</button>
        </div>
      </div>

      <div className="card-lg" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px' }}>TREN OMZET</div>
          <div className="mode-tabs" style={{ margin: 0 }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                className={`mode-tab ${period === p.key ? 'active' : 'inactive'}`}
                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                onClick={() => choosePeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '10px 0 20px', maxWidth: 560 }}>{trendInsight(trend, period)}</p>
        <div className="trend-bars" style={{ height: 130 }}>
          {trend.map((b, i) => (
            <div
              className="trend-col clickable"
              key={i}
              title={`${rupiah(b.total)} (klik untuk lihat produk terlaris)`}
              onClick={() => setSelectedBucket(selectedBucket === i ? null : i)}
            >
              <div className={`trend-fill ${selectedBucket === i ? 'selected' : ''}`} style={{ height: `${(b.total / maxTrend) * 100}%` }}></div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-faint)', fontWeight: 600, marginTop: 8 }}>
          {trend.map((b, i) => <span key={i}>{b.label}</span>)}
        </div>

        {activeBucket && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Produk terlaris: {formatBucketRange(activeBucket, period)}</div>
              <span onClick={() => setSelectedBucket(null)} style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--text-faint)', fontWeight: 600 }}>Tutup ×</span>
            </div>
            {bucketTopProducts.length === 0 ? (
              <div className="empty-state">Tidak ada transaksi pada periode ini.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bucketTopProducts.map((p) => (
                  <div key={p.produk} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.produk}</div>
                    <div className="serif" style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap' }}>{rupiah(p.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="dinkop-grid">
        <div className="card-lg">
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 18 }}>PRODUK TERLARIS</div>
          {topProducts.length === 0 ? (
            <div className="empty-state">Belum ada data produk. Catat transaksimu dulu di menu Pembukuan.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topProducts.map((p) => (
                <div key={p.produk} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.produk}</div>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap' }}>{rupiah(p.total)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-lg">
          <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-faint)', letterSpacing: '0.3px', marginBottom: 18 }}>KELENGKAPAN LEGALITAS ({legalDoneCount}/3)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {legal.map((l) => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: 999, flex: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800,
                  background: l.done ? 'var(--green-bg)' : 'var(--blue-lighter)',
                  color: l.done ? 'var(--green)' : 'var(--text-disabled)',
                }}>{l.done ? '✓' : '–'}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{l.label}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => navigate('/kur')}>Lengkapi di halaman KUR →</button>
        </div>
      </div>
    </div>
  );
}
