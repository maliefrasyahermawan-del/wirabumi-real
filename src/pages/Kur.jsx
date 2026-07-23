import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { rupiah, formatDateID } from '../lib/format';

const LEGAL_ITEMS = [
  {
    key: 'legal_nib', title: 'NIB: Nomor Induk Berusaha', shortLabel: 'NIB',
    desc: 'Gratis via OSS. Dasar semua izin usaha.',
    url: 'https://oss.go.id/id', linkLabel: 'Daftar NIB lewat OSS →',
  },
  {
    key: 'legal_pirt', title: 'Sertifikat P-IRT / merek', shortLabel: 'P-IRT',
    desc: 'Perkuat kredibilitas produk di mata bank.',
    url: 'https://sppirt.pom.go.id/', linkLabel: 'Daftar P-IRT →',
    // P-IRT registration requires an NIB first — steer the user there instead
    // of sending them to a form they can't actually complete yet.
    requires: 'legal_nib',
  },
  {
    key: 'legal_halal', title: 'Sertifikasi Halal', shortLabel: 'Sertifikasi Halal',
    desc: 'Nilai tambah untuk pasar lebih luas & ekspor.',
    url: 'https://ptsp.halal.go.id/login', linkLabel: 'Daftar Sertifikasi Halal →',
  },
];

export default function Kur() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [tenor, setTenor] = useState(24);
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [transactions, setTransactions] = useState([]);

  async function loadOffer(t) {
    setLoading(true);
    const data = await api.get(`/kur/offer?tenor=${t}`);
    setOffer(data);
    setLoading(false);
  }

  useEffect(() => { loadOffer(tenor); }, [tenor]);

  useEffect(() => {
    const since = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
    api.get(`/transactions?since=${since}`).then((rows) => setTransactions([...rows].reverse()));
  }, [user.id]);

  async function toggleLegal(key) {
    const next = !profile[key];
    await api.patch('/profile', { [key]: next });
    await refreshProfile();
    loadOffer(tenor); // legal completeness feeds the score, which feeds the offer
  }

  async function handleGenerate() {
    setGenerating(true);
    await api.post('/kur/documents', {
      plafon: offer.plafon,
      tenor_bulan: offer.tenor_bulan,
      cicilan_bulanan: offer.cicilan_bulanan,
      skor_saat_itu: offer.skor_saat_ini,
    });
    downloadPdf();
    setGenerating(false);
    setGenerated(true);
  }

  function downloadPdf() {
    const doc = new jsPDF();
    const businessName = profile?.business_name || 'Usaha Saya';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Paket Dokumen Pengajuan KUR', 14, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dibuat oleh WIRABUMI · ${new Date().toLocaleDateString('id-ID')}`, 14, 27);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Profil Usaha', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Nama usaha: ${businessName}`, 14, 48);
    doc.text(`Kategori: ${profile?.business_category || '-'}`, 14, 55);
    doc.text(`Kecamatan: ${profile?.kecamatan || '-'}`, 14, 62);
    doc.text(`Alamat: ${profile?.business_address || '-'}`, 14, 69);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan Keuangan (6 bulan terakhir)', 14, 82);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Omzet 6 bulan: ${rupiah(offer.omzet_6_bulan)}`, 14, 90);
    doc.text(`Rata-rata / bulan: ${rupiah(offer.rata_rata_bulan)}`, 14, 97);
    doc.text(`Skor kelayakan: ${offer.skor_saat_ini} / 100`, 14, 104);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Simulasi Pinjaman KUR', 14, 117);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Plafon disarankan: ${rupiah(offer.plafon)}`, 14, 125);
    doc.text(`Tenor: ${offer.tenor_bulan} bulan · Bunga ${(offer.suku_bunga_tahunan * 100).toFixed(0)}% efektif/tahun`, 14, 132);
    doc.text(`Angsuran per bulan: ${rupiah(offer.cicilan_bulanan)} (${offer.rasio_cicilan_omzet}% dari omzet bulanan)`, 14, 139);

    if (transactions.length > 0) {
      autoTable(doc, {
        startY: 150,
        head: [['Tanggal', 'Produk', 'Jumlah', 'Harga', 'Status']],
        body: transactions.map((t) => [formatDateID(t.tanggal), t.produk, `${t.qty} ${t.satuan}`, rupiah(t.harga), t.status]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [26, 95, 168] },
      });
    }

    doc.save(`Berkas-KUR-${businessName.replace(/\s+/g, '-')}.pdf`);
  }

  const legalCount = LEGAL_ITEMS.filter((it) => profile?.[it.key]).length;
  const legalPct = Math.round((legalCount / 3) * 100);

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

        <div style={{ animation: 'wbFade .5s ease' }}>
          <h1 className="page-title md">Berkas KUR-mu</h1>
          <p className="page-sub" style={{ marginBottom: 24 }}>Dihitung dari data pembukuanmu sendiri: omzet 6 bulan terakhir dan skor kelayakan saat ini.</p>

          {loading || !offer ? (
            <div className="kur-loading"><span className="spinner-lg"></span></div>
          ) : offer.omzet_6_bulan <= 0 ? (
            <div className="kur-idle">
              <div className="kur-icon">📄</div>
              <h2 className="serif" style={{ fontWeight: 600, fontSize: 22, margin: '20px 0 6px' }}>Belum ada data transaksi</h2>
              <p style={{ fontSize: 14.5, color: 'var(--text-muted)', margin: '0 auto 22px', maxWidth: 380, lineHeight: 1.55 }}>
                Catat dulu transaksi penjualanmu di menu Pembukuan supaya WIRABUMI bisa menghitung plafon KUR yang sesuai.
              </p>
              <button className="btn btn-primary btn-xl" onClick={() => navigate('/pembukuan')}>Ke Pembukuan</button>
            </div>
          ) : (
            <div style={{ animation: 'wbFade .5s ease' }}>
              {generated && <div className="done-flag">✓ Berkas berhasil dibuat &amp; diunduh</div>}
              <div className="doc-grid">
                <div className="doc-card">
                  <div className="doc-card-head">
                    <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.3px' }}>PROFIL &amp; LAPORAN USAHA</div>
                    <span className="muted" style={{ fontSize: 11.5, fontWeight: 600 }}>{transactions.length} transaksi</span>
                  </div>
                  <div className="doc-card-body">
                    <div className="serif" style={{ fontSize: 20, fontWeight: 600 }}>{profile?.business_name}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{profile?.business_category} · {profile?.kecamatan || '-'}</div>
                    <div className="doc-stats">
                      <div><div className="stat-label">Omzet 6 bulan</div><div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{rupiah(offer.omzet_6_bulan)}</div></div>
                      <div><div className="stat-label">Rata-rata / bulan</div><div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{rupiah(offer.rata_rata_bulan)}</div></div>
                      <div><div className="stat-label">Total transaksi</div><div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{transactions.length} order</div></div>
                      <div><div className="stat-label">Skor kelayakan</div><div style={{ fontWeight: 700, fontSize: 15, marginTop: 2, color: 'var(--blue-dark)' }}>{offer.skor_saat_ini} / 100</div></div>
                    </div>
                  </div>
                </div>

                <div className="sim-card">
                  <div className="sim-label">SIMULASI CICILAN KUR</div>
                  <div className="sim-plafon">{rupiah(offer.plafon)}</div>
                  <div className="muted" style={{ fontSize: 12.5 }}>Plafon disarankan (maks. Rp 100.000.000)</div>
                  <div className="tenor-tabs">
                    {[12, 24, 36].map((t) => (
                      <button key={t} className={`tenor-tab ${tenor === t ? 'active' : ''}`} onClick={() => setTenor(t)}>{t} bln</button>
                    ))}
                  </div>
                  <div className="sim-box">
                    <div className="stat-label">Angsuran per bulan</div>
                    <div className="sim-monthly">{rupiah(offer.cicilan_bulanan)}</div>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>bunga {(offer.suku_bunga_tahunan * 100).toFixed(0)}% efektif / tahun</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 14 }}>
                    Angsuran ≈ {offer.rasio_cicilan_omzet}% dari omzet bulananmu, {offer.rasio_cicilan_omzet < 30 ? 'masih ringan dan aman.' : 'cukup berat, pertimbangkan tenor lebih panjang.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: 15, padding: 14 }} disabled={generating} onClick={handleGenerate}>
                  {generating ? 'Menyusun…' : 'Buat & Unduh Paket Dokumen (PDF)'}
                </button>
              </div>
            </div>
          )}

          <div className="card-lg mt-22">
            <div className="flex between" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 className="serif" style={{ fontWeight: 600, fontSize: 20, margin: 0 }}>Jalur Legalitas Usaha</h2>
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: '6px 0 0' }}>Lengkapi dokumen ini untuk menaikkan skormu &amp; memperbesar plafon KUR.</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="muted" style={{ fontSize: 12, fontWeight: 600 }}>{legalCount} dari 3 selesai</div>
                <div style={{ width: 130, height: 8, background: 'var(--bar-track)', borderRadius: 999, marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${legalPct}%`, background: 'var(--blue)', borderRadius: 999, transition: 'width .4s ease' }}></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              {LEGAL_ITEMS.map((it) => {
                const done = !!profile?.[it.key];
                const blockedByNib = it.requires && !profile?.[it.requires];
                return (
                  <div key={it.key} className="legal-item" style={{ cursor: 'default' }}>
                    <button
                      type="button"
                      className={`legal-check ${done ? 'done' : 'pending'}`}
                      style={{ cursor: 'pointer', border: 'none' }}
                      onClick={() => toggleLegal(it.key)}
                      title={done ? 'Tandai belum punya' : 'Tandai sudah punya'}
                    >
                      {done ? '✓' : ''}
                    </button>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{it.title}</div>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
                          background: done ? 'var(--green-bg)' : 'var(--amber-bg)',
                          color: done ? 'var(--green)' : 'var(--amber)',
                        }}>
                          {done ? 'Lengkap' : 'Belum Punya'}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{it.desc}</div>
                      {!done && (
                        blockedByNib ? (
                          <div style={{ fontSize: 12.5, color: 'var(--amber)', marginTop: 6, fontWeight: 600 }}>
                            Urus NIB dulu sebelum bisa daftar {it.shortLabel}
                          </div>
                        ) : (
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-block', marginTop: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--blue-dark)' }}
                          >
                            {it.linkLabel}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => navigate('/panduan-sertifikat')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 14,
                padding: '12px 16px', borderRadius: 12, border: '1px dashed var(--border)',
                background: 'var(--blue-lighter)', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18 }}>📖</span>
              <span style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--blue-dark)' }}>Belum tahu cara daftarnya?</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Lihat Panduan Daftar Sertifikat — langkah demi langkah untuk NIB, P-IRT, dan Halal.</div>
              </span>
              <span style={{ color: 'var(--blue-dark)', fontWeight: 700 }}>→</span>
            </button>
          </div>

          <div className="flex between mt-26">
            <button className="btn btn-secondary btn-md" onClick={() => navigate('/skor')}>← Ke Skor</button>
            <button className="btn btn-secondary btn-md" onClick={() => navigate('/')}>Selesai, kembali ke Beranda</button>
          </div>
        </div>
      </div>
    </div>
  );
}
