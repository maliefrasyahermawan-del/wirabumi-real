import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';

const GUIDES = [
  {
    key: 'nib',
    title: 'NIB — Nomor Induk Berusaha',
    tag: 'GRATIS',
    site: 'oss.go.id',
    url: 'https://oss.go.id/id',
    intro: 'NIB adalah dasar dari semua izin usaha lain — urus ini duluan sebelum P-IRT atau Sertifikasi Halal.',
    dokumen: ['KTP elektronik (e-KTP) yang masih berlaku', 'NPWP pribadi (buat dulu online kalau belum punya)'],
    steps: [
      'Buka oss.go.id, klik "Daftar" untuk buat akun baru.',
      'Pilih jenis pelaku usaha: Perorangan (untuk sebagian besar UMKM).',
      'Verifikasi akun lewat tautan di email dan kode OTP yang dikirim ke WhatsApp.',
      'Lengkapi profil usaha: pilih skala usaha (Mikro/Kecil/Menengah) dan isi KBLI (kode klasifikasi bidang usaha) sesuai jenis usahamu.',
      'Kirim permohonan — untuk usaha risiko rendah (kebanyakan UMKM), NIB biasanya langsung terbit dalam hitungan menit.',
    ],
    waktu: 'Beberapa menit (risiko rendah) — 1-3 hari kerja (risiko menengah/tinggi)',
  },
  {
    key: 'pirt',
    title: 'P-IRT — Sertifikat Produksi Pangan Rumahan',
    tag: 'GRATIS',
    site: 'sppirt.pom.go.id',
    url: 'https://sppirt.pom.go.id/',
    intro: 'WAJIB sudah punya NIB dulu — sistemnya memang mensyaratkan itu, jadi urus NIB duluan kalau belum punya.',
    dokumen: ['NIB yang sudah terbit', 'Data & foto produk yang mau didaftarkan', 'Desain label kemasan'],
    steps: [
      'Login ke oss.go.id memakai akun usaha yang NIB-nya sudah terbit.',
      'Di dashboard OSS, buka menu Perizinan Berusaha → pilih PB-UMKU.',
      'Cari dan pilih "SPP-IRT" (Sertifikat Pemenuhan Komitmen Industri Rumah Tangga) — sistem otomatis mengarahkanmu ke sppirt.pom.go.id.',
      'Lengkapi data usaha (kalau belum terdaftar di sana), lalu isi data produk dan unggah desain label.',
      'Isi pernyataan komitmen keamanan pangan, lalu kirim permohonan.',
    ],
    waktu: 'Sekitar 1 hari kerja setelah data lengkap (validasi sistem otomatis)',
  },
  {
    key: 'halal',
    title: 'Sertifikasi Halal (jalur Self Declare)',
    tag: 'GRATIS untuk UMK',
    site: 'ptsp.halal.go.id',
    url: 'https://ptsp.halal.go.id/login',
    intro: 'Jalur "Self Declare" khusus untuk UMK dengan produk sederhana & 100% bahan halal — tanpa audit, prosesnya online semua.',
    dokumen: ['NIB', 'KTP', 'Alamat usaha', 'Foto produk', 'Daftar bahan baku & proses produksi'],
    steps: [
      'Buka ptsp.halal.go.id, klik "Create an Account".',
      'Pilih Type of User: "Pelaku Usaha", lalu isi nama, email, dan kata sandi.',
      'Lengkapi data usaha & produk: NIB, KTP, alamat, foto produk, daftar bahan baku, dan proses produksi.',
      'Unggah dokumen pendukung dan isi formulir pendaftaran sesuai jenis produkmu.',
      'Tunggu kunjungan verifikasi dari Pendamping PPH (Pendamping Proses Produk Halal) untuk memastikan produkmu memenuhi kriteria halal.',
      'Sertifikat terbit dari BPJPH setelah kehalalan produk ditetapkan oleh Komisi Fatwa MUI.',
    ],
    waktu: 'Bervariasi, tergantung jadwal kunjungan Pendamping PPH dan sidang Komisi Fatwa',
  },
];

export default function PanduanSertifikat() {
  const navigate = useNavigate();

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-900" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <button className="navlink" style={{ marginBottom: 14, padding: 0 }} onClick={() => navigate('/kur')}>← Kembali ke Berkas KUR</button>

        <h1 className="page-title md">Panduan Daftar Sertifikat Usaha</h1>
        <p className="page-sub" style={{ marginBottom: 8, maxWidth: 640 }}>
          Belum pernah urus NIB, P-IRT, atau Sertifikasi Halal? Ini ringkasan langkah-langkahnya supaya kamu tidak bingung
          begitu buka website resminya.
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-faint)', marginBottom: 28 }}>
          Catatan jujur: langkah &amp; syarat di bawah dirangkum dari panduan publik yang tersedia saat ini — proses
          pemerintah bisa berubah sewaktu-waktu, jadi anggap ini peta kasar, bukan pengganti instruksi resmi di
          situsnya langsung.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {GUIDES.map((g) => (
            <div key={g.key} className="card-lg">
              <div className="flex between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h2 className="serif" style={{ fontWeight: 600, fontSize: 19, margin: 0 }}>{g.title}</h2>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '6px 0 0', maxWidth: 560 }}>{g.intro}</p>
                </div>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                  background: 'var(--green-bg)', color: 'var(--green)',
                }}>
                  {g.tag}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 18 }}>
                <div>
                  <div className="stat-label" style={{ marginBottom: 8 }}>LANGKAH-LANGKAH</div>
                  <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.steps.map((s, i) => (
                      <li key={i} style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text)' }}>{s}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="stat-label" style={{ marginBottom: 8 }}>DOKUMEN YANG DIBUTUHKAN</div>
                  <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {g.dokumen.map((d, i) => (
                      <li key={i} style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>{d}</li>
                    ))}
                  </ul>
                  <div className="stat-label" style={{ marginTop: 16, marginBottom: 4 }}>ESTIMASI WAKTU</div>
                  <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>{g.waktu}</p>
                </div>
              </div>

              <a
                href={g.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-md"
                style={{ marginTop: 18, display: 'inline-flex' }}
              >
                Buka {g.site} →
              </a>
            </div>
          ))}
        </div>

        <div className="flex between mt-26">
          <button className="btn btn-secondary btn-md" onClick={() => navigate('/kur')}>← Ke Berkas KUR</button>
        </div>
      </div>
    </div>
  );
}
