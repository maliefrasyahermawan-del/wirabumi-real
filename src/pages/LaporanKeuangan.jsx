import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { rupiah, formatDateID } from '../lib/format';

const BULAN_NAMA = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const TAX_STATUS_CONFIG = {
  di_bawah_ambang: { label: 'Di bawah ambang bebas pajak', color: 'var(--green)', bg: 'var(--green-bg)' },
  kena_pajak: { label: 'Kena PPh Final 0,5%', color: 'var(--blue-dark)', bg: 'var(--blue-light)' },
  mendekati_batas_4_8m: { label: 'Mendekati batas Rp4,8 miliar', color: 'var(--amber)', bg: 'var(--amber-bg)' },
  melebihi_batas_4_8m: { label: 'Melebihi batas Rp4,8 miliar — konsultasikan ke konsultan pajak', color: 'var(--red)', bg: 'var(--red-bg)' },
};

const TAX_DISCLAIMER = 'Estimasi ini dihitung otomatis dari data pembukuanmu berdasarkan skema PPh Final UMKM (PP 55/2022 jo. PP 20/2026) dan bersifat perkiraan, bukan perhitungan resmi. Aturan pajak dapat berubah dan setiap usaha punya kondisi berbeda (mis. jenis usaha, masa berlaku fasilitas). Untuk kewajiban pajak resmi, konsultasikan ke akuntan atau konsultan pajak terdaftar, atau cek langsung ke pajak.go.id / Coretax.';

function monthRange(year, month) {
  const since = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const until = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { since, until };
}

export default function LaporanKeuangan() {
  const { profile } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [report, setReport] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [taxEstimate, setTaxEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const { since, until } = monthRange(year, month);
    setLoading(true);
    Promise.all([
      api.get(`/report/laba-rugi?since=${since}&until=${until}`),
      api.get(`/transactions?since=${since}&until=${until}`),
      api.get(`/expenses?since=${since}&until=${until}`),
      api.get(`/report/tax-estimate?year=${year}&month=${month + 1}`),
    ])
      .then(([reportData, txnData, expData, taxData]) => {
        setReport(reportData);
        setTransactions(txnData || []);
        setExpenses(expData || []);
        setTaxEstimate(taxData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [year, month]);

  function downloadPdf() {
    if (!report) return;
    const doc = new jsPDF();
    const businessName = profile?.business_name || 'Usaha Saya';
    const periodeLabel = `${BULAN_NAMA[month]} ${year}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(businessName, pageWidth / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(12);
    doc.text('LAPORAN LABA RUGI', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(`Untuk Periode ${periodeLabel}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // ---- Rincian Pendapatan (itemized sales table) ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RINCIAN PENDAPATAN (PENJUALAN)', 14, y);
    y += 4;

    if (transactions.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(130);
      doc.text('Tidak ada transaksi penjualan tercatat pada periode ini.', 14, y + 5);
      doc.setTextColor(0);
      y += 12;
    } else {
      autoTable(doc, {
        startY: y + 2,
        head: [['Tanggal', 'Produk', 'Jumlah', 'Pelanggan', 'Harga']],
        body: transactions.map((t) => [
          formatDateID(t.tanggal), t.produk, `${t.qty} ${t.satuan}`, t.pelanggan || '-', rupiah(t.harga),
        ]),
        foot: [['', '', '', 'Total Pendapatan', rupiah(report.pendapatan)]],
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        columnStyles: { 4: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // ---- Rincian Beban (itemized expense table) ----
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RINCIAN BEBAN USAHA', 14, y);
    y += 4;

    if (expenses.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(130);
      doc.text('Tidak ada beban tercatat pada periode ini.', 14, y + 5);
      doc.setTextColor(0);
      y += 12;
    } else {
      autoTable(doc, {
        startY: y + 2,
        head: [['Tanggal', 'Kategori', 'Keterangan', 'Jumlah']],
        body: expenses.map((e) => [formatDateID(e.tanggal), e.kategori, e.keterangan, rupiah(e.jumlah)]),
        foot: [['', '', 'Total Beban', `(${rupiah(report.total_beban)})`]],
        theme: 'grid',
        styles: { fontSize: 8.5, cellPadding: 3, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.2 },
        columnStyles: { 3: { halign: 'right' } },
        margin: { left: 14, right: 14 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // ---- Ringkasan Laba Rugi ----
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RINGKASAN LABA RUGI', 14, y);
    y += 2;

    autoTable(doc, {
      startY: y + 2,
      body: [
        ['Total Pendapatan', rupiah(report.pendapatan)],
        ['Total Beban', `(${rupiah(report.total_beban)})`],
        [report.laba_bersih >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH', rupiah(Math.abs(report.laba_bersih))],
      ],
      theme: 'grid',
      styles: { fontSize: 10.5, cellPadding: 4, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
      columnStyles: { 1: { halign: 'right' } },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 12;
          data.cell.styles.fillColor = [235, 235, 235];
          data.cell.styles.lineWidth = 0.3;
        }
      },
      margin: { left: 14, right: 14 },
      tableWidth: 120,
    });
    y = doc.lastAutoTable.finalY + 12;

    // ---- Estimasi Kewajiban Pajak (PPh Final UMKM) ----
    if (taxEstimate) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('ESTIMASI KEWAJIBAN PAJAK (PPh FINAL UMKM)', 14, y);
      y += 2;

      autoTable(doc, {
        startY: y + 2,
        body: [
          ['Kategori Wajib Pajak', taxEstimate.kategori_wajib_pajak === 'badan_usaha' ? 'Badan Usaha' : 'Orang Pribadi'],
          ['Omzet Kumulatif Tahun Ini', rupiah(taxEstimate.omzet_kumulatif_tahun_ini)],
          ['Status', TAX_STATUS_CONFIG[taxEstimate.status_ambang]?.label || taxEstimate.status_ambang],
          ['Estimasi PPh Final Bulan Ini', rupiah(taxEstimate.estimasi_pajak_bulan_ini)],
          ['Estimasi PPh Final Kumulatif Tahun Ini', rupiah(taxEstimate.estimasi_pajak_kumulatif_tahun_ini)],
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 14, right: 14 },
        tableWidth: 140,
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text('Dibuat otomatis oleh WIRABUMI dari data pembukuan (penjualan) dan pengeluaran yang dicatat pengguna.', 14, y);
    y += 4;
    doc.text('Format mengacu pada struktur Laporan Laba Rugi SAK EMKM — bukan laporan yang diaudit/diverifikasi akuntan.', 14, y);
    if (taxEstimate) {
      y += 4;
      const disclaimerLines = doc.splitTextToSize(TAX_DISCLAIMER, 182);
      doc.text(disclaimerLines, 14, y);
    }
    doc.setTextColor(0);

    doc.save(`Laporan-Laba-Rugi-${businessName.replace(/\s+/g, '-')}-${periodeLabel.replace(' ', '-')}.pdf`);
  }

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1240" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <header className="subheader">
          <div>
            <h1 className="page-title md">Laporan Laba Rugi</h1>
            <p className="page-sub">Ringkasan pendapatan dan beban usahamu, format mengacu pada SAK EMKM.</p>
          </div>
        </header>

        <div className="flex-center gap-12" style={{ margin: '16px 0 22px', flexWrap: 'wrap' }}>
          <div className="field" style={{ width: 160 }}>
            <label>Bulan</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {BULAN_NAMA.map((b, i) => <option key={b} value={i}>{b}</option>)}
            </select>
          </div>
          <div className="field" style={{ width: 120 }}>
            <label>Tahun</label>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || now.getFullYear())} />
          </div>
          <button className="btn btn-primary btn-md" style={{ alignSelf: 'flex-end' }} disabled={!report || loading} onClick={downloadPdf}>
            Unduh PDF →
          </button>
        </div>

        {error && <div className="alert-error mt-16">{error}</div>}

        {loading ? (
          <div className="loading-center" style={{ minHeight: 300 }}><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>
        ) : report && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="center-text card-lg">
              <div style={{ fontWeight: 800, fontSize: 15 }}>{profile?.business_name}</div>
              <div className="serif" style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>Laporan Laba Rugi</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>Untuk Periode {BULAN_NAMA[month]} {year}</div>
            </div>

            <div style={{ border: '1px solid #000', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid #000', fontWeight: 800, fontSize: 13, color: '#000', letterSpacing: '0.4px' }}>RINCIAN PENDAPATAN (PENJUALAN)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.6fr 0.9fr 1fr 1fr', gap: 12, padding: '10px 20px', background: '#fff', borderBottom: '1px solid #000', fontSize: 12, fontWeight: 700, color: '#000' }}>
                <div>TANGGAL</div><div>PRODUK</div><div>JUMLAH</div><div>PELANGGAN</div><div style={{ textAlign: 'right' }}>HARGA</div>
              </div>
              {transactions.length === 0 ? (
                <div className="empty-state">Tidak ada transaksi penjualan tercatat pada periode ini.</div>
              ) : transactions.map((t) => (
                <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.6fr 0.9fr 1fr 1fr', gap: 12, padding: '10px 20px', borderBottom: '1px solid #000', fontSize: 13, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{formatDateID(t.tanggal)}</div>
                  <div style={{ fontWeight: 600 }}>{t.produk}</div>
                  <div>{t.qty} {t.satuan}</div>
                  <div>{t.pelanggan || '-'}</div>
                  <div style={{ fontWeight: 700, textAlign: 'right' }}>{rupiah(t.harga)}</div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 20px', background: '#f0f0f0', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Total Pendapatan</div>
                <div className="serif" style={{ fontWeight: 700, fontSize: 18 }}>{rupiah(report.pendapatan)}</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid #000', fontWeight: 800, fontSize: 13, color: '#000', letterSpacing: '0.4px' }}>RINCIAN BEBAN USAHA</div>
              <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.3fr 1.6fr 1fr', gap: 12, padding: '10px 20px', background: '#fff', borderBottom: '1px solid #000', fontSize: 12, fontWeight: 700, color: '#000' }}>
                <div>TANGGAL</div><div>KATEGORI</div><div>KETERANGAN</div><div style={{ textAlign: 'right' }}>JUMLAH</div>
              </div>
              {expenses.length === 0 ? (
                <div className="empty-state">Tidak ada beban tercatat pada periode ini.</div>
              ) : expenses.map((e) => (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.3fr 1.6fr 1fr', gap: 12, padding: '10px 20px', borderBottom: '1px solid #000', fontSize: 13, alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{formatDateID(e.tanggal)}</div>
                  <div>{e.kategori}</div>
                  <div style={{ fontWeight: 600 }}>{e.keterangan}</div>
                  <div style={{ fontWeight: 700, textAlign: 'right' }}>{rupiah(e.jumlah)}</div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '12px 20px', background: '#f0f0f0', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Total Beban</div>
                <div className="serif" style={{ fontWeight: 700, fontSize: 18 }}>({rupiah(report.total_beban)})</div>
              </div>
            </div>

            <div style={{ border: '1px solid #000', borderRadius: 8, padding: '18px 20px' }}>
              <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.4px', marginBottom: 14 }}>RINGKASAN LABA RUGI</div>
              <div className="flex between" style={{ padding: '8px 0', borderBottom: '1px solid #000' }}>
                <div>Total Pendapatan</div>
                <div style={{ fontWeight: 600 }}>{rupiah(report.pendapatan)}</div>
              </div>
              <div className="flex between" style={{ padding: '8px 0', borderBottom: '1px solid #000' }}>
                <div>Total Beban</div>
                <div style={{ fontWeight: 600 }}>({rupiah(report.total_beban)})</div>
              </div>
              <div className="flex between" style={{ padding: '10px 0 0', fontWeight: 800, fontSize: 18 }}>
                <div>{report.laba_bersih >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</div>
                <div>{rupiah(Math.abs(report.laba_bersih))}</div>
              </div>
            </div>

            {taxEstimate && (
              <div className="card-lg">
                <div className="flex between" style={{ flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '0.4px', color: 'var(--text-faint)' }}>ESTIMASI KEWAJIBAN PAJAK</div>
                  <span
                    className="status-badge"
                    style={{
                      color: TAX_STATUS_CONFIG[taxEstimate.status_ambang]?.color,
                      background: TAX_STATUS_CONFIG[taxEstimate.status_ambang]?.bg,
                    }}
                  >
                    {TAX_STATUS_CONFIG[taxEstimate.status_ambang]?.label || taxEstimate.status_ambang}
                  </span>
                </div>

                <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Omzet kumulatif tahun {year}</div>
                <div className="serif" style={{ fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{rupiah(taxEstimate.omzet_kumulatif_tahun_ini)}</div>

                <div className="flex between" style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13.5 }}>
                  <div>Estimasi PPh Final bulan ini</div>
                  <div style={{ fontWeight: 700 }}>{rupiah(taxEstimate.estimasi_pajak_bulan_ini)}</div>
                </div>
                <div className="flex between" style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13.5 }}>
                  <div>Estimasi kumulatif tahun ini</div>
                  <div style={{ fontWeight: 700 }}>{rupiah(taxEstimate.estimasi_pajak_kumulatif_tahun_ini)}</div>
                </div>

                <p className="muted" style={{ fontSize: 11.5, marginTop: 14, marginBottom: 0, lineHeight: 1.5 }}>{TAX_DISCLAIMER}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
