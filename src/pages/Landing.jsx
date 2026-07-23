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

      <main className="hero-main" style={{ backgroundImage: "url('/umkm-hero.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="hero-main-overlay" />
        <div className="wrap-1240 hero-grid" style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ animation: 'wbFade .5s ease' }}>
            <div className="eyebrow eyebrow-light"><span className="eyebrow-dot"></span>UNTUK UMKM SOLO RAYA</div>
            <h1 className="hero-title hero-title-light">Usahamu laku tiap hari,<br />tapi nggak punya "bukti" buat bank?</h1>
            <p className="hero-sub hero-sub-light">WIRABUMI ubah itu tanpa kamu ubah cara jualan.</p>
            <div className="hero-ctas">
              <button className="btn btn-primary btn-md" onClick={goStart}>{user ? 'Buka Pembukuan' : 'Daftar Gratis'} →</button>
              <button className="btn btn-ghost-light btn-md" onClick={() => navigate('/dashboard')}>Lihat Dashboard</button>
            </div>
            <div className="hero-stats">
              <div><div className="hero-stat-num hero-stat-num-light">{stats.total_umkm.toLocaleString('id-ID')}</div><div className="hero-stat-label hero-stat-label-light">UMKM TERHUBUNG</div></div>
              <span className="hero-divider hero-divider-light"></span>
              <div><div className="hero-stat-num hero-stat-num-light">{stats.kur_docs_count.toLocaleString('id-ID')}</div><div className="hero-stat-label hero-stat-label-light">BERKAS KUR DIBUAT</div></div>
              <span className="hero-divider hero-divider-light"></span>
              <div><div className="hero-stat-num hero-stat-num-light">{stats.avg_score}</div><div className="hero-stat-label hero-stat-label-light">SKOR RATA-RATA</div></div>
            </div>
          </div>

          <div className="hero-card" style={{ animation: 'wbFade .5s .1s ease' }}>
            <div className="hero-card-head">
              <span className="hero-card-label">CONTOH: BUMBU &amp; IKAN ASIN</span>
              <span className="hero-card-badge">Skor 72</span>
            </div>
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
      </main>
    </div>
  );
}
