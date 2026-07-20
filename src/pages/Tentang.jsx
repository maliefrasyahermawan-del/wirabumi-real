import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';

export default function Tentang() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-940" style={{ paddingTop: 40, paddingBottom: 70 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>TENTANG WIRABUMI</div>
        <h1 className="serif" style={{ fontWeight: 600, fontSize: 36, letterSpacing: '-0.6px', margin: '16px 0 0' }}>
          Jualan yang sudah jalan, layak diakui bank.
        </h1>
        <p className="page-sub" style={{ fontSize: 17, maxWidth: 'none', marginTop: 16 }}>
          WIRABUMI adalah aplikasi pembukuan dan kesiapan pengajuan KUR untuk pelaku UMKM
          di kawasan Solo Raya, dibangun untuk pedagang yang jualannya sudah jalan lewat
          chat WhatsApp, tapi belum punya bentuk yang bisa "dibaca" oleh bank.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, marginTop: 40 }}>
          <section>
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Asal nama WIRABUMI</h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-muted)', marginTop: 10 }}>
              WIRABUMI singkatan dari Wirausaha Bumi Solo Raya. "Wira" diambil dari kata
              wirausaha, dan "Bumi" merujuk pada wilayah atau tanah Solo Raya. Namanya sendiri
              sudah nyambung dengan filosofi produknya: platform untuk para wirausaha (pelaku
              UMKM) di bumi (tanah) Solo Raya.
            </p>
          </section>

          <section>
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Kenapa WIRABUMI dibuat</h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-muted)', marginTop: 10 }}>
              Banyak pedagang kecil di Solo Raya, mulai dari penjual batik, makanan rumahan,
              kerajinan, sampai jasa titip, sebenarnya sudah punya usaha yang jalan dan
              pelanggan yang rutin membeli. Masalahnya, catatan penjualan mereka tersebar di
              kepala, buku tulis, atau berserakan di riwayat chat WhatsApp. Saat ingin
              mengajukan KUR (Kredit Usaha Rakyat), bank butuh bukti: berapa omzet bulanan,
              seberapa konsisten usahanya, dan apakah legalitasnya lengkap. Tanpa catatan yang
              rapi, usaha yang sebenarnya sehat bisa terlihat "tidak layak" di atas kertas,
              padahal bukan karena usahanya buruk, melainkan karena belum tercatat.
            </p>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-muted)', marginTop: 12 }}>
              WIRABUMI dibuat untuk menjembatani itu: mengubah bukti jualan yang sudah ada
              (chat, foto transfer, atau catatan manual) menjadi pembukuan yang terstruktur,
              tanpa mewajibkan pedagang belajar akuntansi dulu.
            </p>
          </section>

          <section>
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Apa yang sebenarnya dilakukan</h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-muted)', marginTop: 10 }}>
              Setiap transaksi yang dicatat, baik manual, dari tempel chat, maupun dari foto
              bukti transfer, tersimpan sungguhan ke database milikmu sendiri. Dari data itu,
              WIRABUMI menghitung skor kelayakan usaha (dari konsistensi mencatat, tren
              omzet, pelanggan tetap, dan kelengkapan legalitas), lalu menyusunnya jadi
              simulasi plafon &amp; cicilan KUR memakai rumus anuitas yang sama dipakai bank,
              sampai ke berkas PDF yang bisa langsung kamu bawa. Bagian pencocokan teks
              (tempel chat dan pembacaan foto) memakai aturan sederhana, bukan AI, supaya
              hasilnya tetap bisa kamu koreksi dan pertanggungjawabkan sendiri, bukan tebakan
              mesin yang tidak bisa dijelaskan.
            </p>
          </section>

          <section>
            <h2 className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Harapan di baliknya</h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-muted)', marginTop: 10 }}>
              Harapannya sederhana: makin banyak pedagang Solo Raya yang usahanya diakui
              formal, bukan karena mengubah cara mereka berjualan, tapi karena akhirnya ada
              yang mencatatkan apa yang sudah mereka kerjakan setiap hari. WIRABUMI tidak
              menggantikan peran bank, akuntan, atau dinas koperasi. Posisinya adalah langkah
              pertama: membantu pedagang datang ke pintu itu dengan data di tangan, bukan
              dengan tangan kosong.
            </p>
          </section>
        </div>

        <div className="banner" style={{ marginTop: 40 }}>
          <div style={{ fontSize: 14, color: 'var(--blue-dark)', lineHeight: 1.5, maxWidth: 560 }}>
            Ingin lihat bagaimana ini bekerja dengan datamu sendiri?
          </div>
          <button
            className="btn btn-primary"
            style={{ fontSize: 14, padding: '11px 20px', borderRadius: 10, whiteSpace: 'nowrap' }}
            onClick={() => navigate(user ? '/pembukuan' : '/daftar')}
          >
            {user ? 'Buka Pembukuan' : 'Daftar Gratis'} →
          </button>
        </div>
      </div>
    </div>
  );
}
