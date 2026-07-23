import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ total_umkm: 0, kur_docs_count: 0, avg_score: 0 });

  useEffect(() => {
    api.get('/platform-stats').then(setStats).catch(() => {});
  }, []);

  function goStart() {
    navigate(user ? '/pembukuan' : '/daftar');
  }

  return (
    <div className="page full-h">
      <TopNav />

      <main className="hero-main">
        <div className="wrap-1240 hero-grid">
          <div style={{ animation: 'wbFade .5s ease' }}>
            <div className="eyebrow"><span className="eyebrow-dot"></span>UNTUK UMKM SOLO RAYA</div>
            <h1 className="hero-title">Usahamu laku tiap hari,<br />tapi nggak punya "bukti" buat bank?</h1>
            <p className="hero-sub">WIRABUMI ubah itu tanpa kamu ubah cara jualan.</p>
            <div className="hero-ctas">
              <button className="btn btn-primary btn-md" onClick={goStart}>{user ? 'Buka Pembukuan' : 'Daftar Gratis'} →</button>
              <button className="btn btn-ghost-dark btn-md" onClick={() => navigate('/dashboard')}>Lihat Dashboard</button>
            </div>
            <div className="hero-stats">
              <div><div className="hero-stat-num">{stats.total_umkm.toLocaleString('id-ID')}</div><div className="hero-stat-label">UMKM TERHUBUNG</div></div>
              <span className="hero-divider"></span>
              <div><div className="hero-stat-num">{stats.kur_docs_count.toLocaleString('id-ID')}</div><div className="hero-stat-label">BERKAS KUR DIBUAT</div></div>
              <span className="hero-divider"></span>
              <div><div className="hero-stat-num" style={{ color: 'var(--blue-dark)' }}>{stats.avg_score}</div><div className="hero-stat-label">SKOR RATA-RATA</div></div>
            </div>
          </div>

          <div className="hero-card" style={{ animation: 'wbFade .5s .1s ease', padding: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative', height: 210, overflow: 'hidden' }}>
              <img src="/umkm-hero.jpg" alt="Pedagang UMKM Solo Raya" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ background: 'rgba(15,27,42,0.75)', color: '#fff', padding: '4px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 700, backdropFilter: 'blur(6px)' }}>
                  PEDAGANG PASAR SOLO RAYA
                </span>
                <span className="hero-card-badge">Skor 72 · Layak KUR</span>
              </div>
            </div>
            <div style={{ padding: '18px 20px 20px' }}>
              <div className="hero-chat-bubble">Bu, bumbu soto &amp; ikan asin masih ada? mau 2 bungkus</div>
              <div className="hero-chat-bubble">Masih Bu, totalnya 45rb ya</div>
              <div className="hero-chat-bubble">Oke sudah tak transfer 45rb lunas 🙏</div>
              <div className="hero-reading"><span className="spinner-sm"></span>WIRABUMI membaca…</div>
              <div className="hero-fields">
                <div className="hero-field"><div className="hero-field-label">Produk</div><div className="hero-field-val">Bumbu &amp; Ikan Asin</div></div>
                <div className="hero-field"><div className="hero-field-label">Jumlah</div><div className="hero-field-val">2 bungkus</div></div>
                <div className="hero-field"><div className="hero-field-label">Total</div><div className="hero-field-val">Rp 45.000</div></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', padding: '48px 0' }}>
        <div className="wrap-1240" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44, alignItems: 'center' }}>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 16px 40px rgba(15,27,42,0.08)' }}>
            <img src="/umkm-hero.jpg" alt="Pelaku Usaha UMKM Solo Raya" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 14 }}><span className="eyebrow-dot"></span>NYATA &amp; MUDAH</div>
            <h2 className="serif" style={{ fontSize: 28, fontWeight: 600, margin: '0 0 14px', lineHeight: 1.25, letterSpacing: '-0.4px' }}>
              Dari Pedagang Pasar Tradisional sampai Olshop WhatsApp
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
              WIRABUMI dirancang khusus untuk pedagang dan wirausaha lokal Solo Raya. Cukup tempel pesan chat jualan harianmu, sistem otomatis menyusun pembukuan kas, mengukur skor kesiapan KUR, hingga mencetak dokumen pengajuan bank secara instan.
            </p>
            <div style={{ marginTop: 22 }}>
              <button className="btn btn-primary btn-md" onClick={goStart}>Mulai Pembukuan Gratis →</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
