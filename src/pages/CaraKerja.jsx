import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';

const STEPS = [
  {
    title: 'Kumpulkan bukti jualan', short: 'Chat WA atau caption IG penjualanmu.',
    detailTitle: 'Tempel obrolan penjualanmu',
    detailBody: 'Salin percakapan WhatsApp atau caption Instagram penjualan. Kamu tidak perlu mengetik ulang, BUMIRA mencoba membaca bahasa sehari-hari seperti "640rb ya bu" dan mengubahnya jadi transaksi.',
    points: ['Baca chat WA / caption IG', 'Tanpa ubah cara jualanmu', 'Bisa juga catat manual'],
    ctaLabel: 'Coba tempel chat', target: '/pembukuan',
  },
  {
    title: 'BUMIRA merapikan', short: 'Sistem menyusun jadi pembukuan otomatis.',
    detailTitle: 'Pembukuan tersusun otomatis',
    detailBody: 'BUMIRA mengenali produk, jumlah, dan harga dari obrolanmu (bisa kamu koreksi sebelum disimpan), lalu menyusunnya jadi tabel penjualan rapi lengkap dengan total dan rata-rata.',
    points: ['Produk, jumlah & harga dikenali otomatis', 'Kamu tetap bisa mengoreksi hasilnya', 'Total & rata-rata langsung terhitung'],
    ctaLabel: 'Lihat pembukuan', target: '/pembukuan',
  },
  {
    title: 'Lihat skor kelayakan', short: 'Tahu posisimu & cara menaikkannya.',
    detailTitle: 'Skor kelayakan usaha dihitung real',
    detailBody: 'Dari data transaksimu, BUMIRA menghitung skor 0 - 100 berdasarkan konsistensi, volume penjualan, rasio pelanggan tetap, dan legalitas, plus saran konkret untuk menaikkannya.',
    points: ['Skor 0 - 100 dengan rincian faktornya', 'Saran konkret menaikkan skor', 'Dihitung ulang tiap kali data berubah'],
    ctaLabel: 'Lihat skorku', target: '/skor',
  },
  {
    title: 'Ajukan KUR', short: 'Berkas pinjaman tersusun, siap dibawa.',
    detailTitle: 'Berkas KUR siap diunduh',
    detailBody: 'Semua data dirangkum jadi paket dokumen PDF: profil usaha, laporan transaksi, dan simulasi cicilan dengan bunga & tenor sesuai pilihanmu. Tinggal unduh dan bawa ke bank.',
    points: ['Profil usaha + laporan transaksi', 'Simulasi plafon & angsuran KUR', 'Diunduh langsung sebagai PDF'],
    ctaLabel: 'Lihat berkas KUR', target: '/kur',
  },
];

export default function CaraKerja() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const cur = STEPS[step];

  function goProtected(target) {
    navigate(user ? target : '/daftar');
  }

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1240" style={{ paddingTop: 40, paddingBottom: 56 }}>
        <div className="center-text" style={{ maxWidth: 640, margin: '0 auto 36px' }}>
          <div className="eyebrow">PANDUAN INTERAKTIF</div>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 38, lineHeight: 1.1, letterSpacing: '-0.7px', margin: '16px 0 0' }}>Cara kerja BUMIRA</h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--text-muted)', margin: '12px 0 0' }}>Klik tiap langkah untuk melihat apa yang terjadi. Kamu tetap jualan seperti biasa. BUMIRA yang merapikan semuanya jadi berkas yang diakui bank.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 28, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STEPS.map((s, i) => (
              <button key={s.title} className={`ck-card ${i === step ? 'active' : ''}`} onClick={() => setStep(i)}>
                <div className={`ck-num ${i === step ? 'active' : ''}`}>{i + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 3 }}>{s.short}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="ck-detail" style={{ animation: 'bumiraFade .4s ease' }}>
            <div className="eyebrow" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>LANGKAH {step + 1}</div>
            <h2 className="serif" style={{ fontWeight: 600, fontSize: 27, letterSpacing: '-0.4px', margin: '16px 0 0' }}>{cur.detailTitle}</h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--text-muted)', margin: '12px 0 22px' }}>{cur.detailBody}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cur.points.map((p) => (
                <div className="ck-point" key={p}>
                  <div className="ck-check">✓</div>
                  <div style={{ fontSize: 14, lineHeight: 1.45, color: 'var(--text)' }}>{p}</div>
                </div>
              ))}
            </div>
            <div className="mt-22">
              <button className="btn btn-primary btn-md" onClick={() => goProtected(cur.target)}>{cur.ctaLabel} →</button>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 32 }}>
          <button className="ck-promo" onClick={() => goProtected('/pembukuan')}>
            <div className="ck-promo-icon">✎</div>
            <div><div style={{ fontWeight: 700, fontSize: 16 }}>Pembukuan Manual</div><div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 3 }}>Mau catat sendiri? Isi transaksi langsung untuk keperluan pengajuan pinjaman.</div></div>
          </button>
          <button className="ck-promo" onClick={() => goProtected('/asisten')}>
            <div className="ck-promo-icon">◍</div>
            <div><div style={{ fontWeight: 700, fontSize: 16 }}>Mira, Asisten Keuangan</div><div style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 3 }}>Tanya apa saja soal usahamu, Mira menjawab dari data penjualanmu sendiri.</div></div>
          </button>
        </div>
      </div>
    </div>
  );
}
