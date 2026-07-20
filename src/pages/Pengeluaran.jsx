import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { rupiah, formatDateID, todayISO, formatThousands, parseThousands } from '../lib/format';

const KATEGORI_OPTIONS = [
  'Pembelian Bahan Baku/Stok', 'Gaji & Upah Karyawan', 'Sewa Tempat',
  'Listrik, Air & Utilitas', 'Transportasi & BBM', 'Perlengkapan & Peralatan',
  'Pemasaran & Promosi', 'Lain-lain',
];

export default function Pengeluaran() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ tanggal: todayISO(), kategori: KATEGORI_OPTIONS[0], keterangan: '', jumlah: '' });

  async function loadRows() {
    setLoading(true);
    const data = await api.get('/expenses');
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { loadRows(); }, [user.id]);

  function setField(f, v) { setForm((s) => ({ ...s, [f]: v })); }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const jumlah = parseThousands(form.jumlah);
    if (!form.keterangan.trim() || !jumlah || jumlah <= 0) {
      setError('Isi keterangan dan jumlah yang valid.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/expenses', {
        tanggal: form.tanggal,
        kategori: form.kategori,
        keterangan: form.keterangan.trim(),
        jumlah,
      });
    } catch (err) {
      setSaving(false);
      setError(err.message);
      return;
    }
    setSaving(false);
    setForm({ tanggal: todayISO(), kategori: KATEGORI_OPTIONS[0], keterangan: '', jumlah: '' });
    loadRows();
  }

  async function handleDelete(id) {
    await api.delete(`/expenses/${id}`);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  const total = rows.reduce((a, r) => a + Number(r.jumlah), 0);

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1240" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div className="flex between" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 30, letterSpacing: '-0.5px', margin: 0 }}>Pengeluaran</h1>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{rows.length} pengeluaran tercatat</span>
        </div>
        <p className="page-sub" style={{ fontSize: 15, marginBottom: 22 }}>Catat beban/pengeluaran usahamu di sini. Data ini dipakai bersama data penjualan untuk menyusun Laporan Laba Rugi.</p>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 22, alignItems: 'start' }}>
          <form onSubmit={handleAdd} className="card-lg" style={{ background: 'var(--blue-lighter)' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--blue-dark)', letterSpacing: '0.4px', marginBottom: 16 }}>TAMBAH PENGELUARAN</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div className="field"><label>Tanggal</label><input type="date" value={form.tanggal} onChange={(e) => setField('tanggal', e.target.value)} /></div>
              <div className="field">
                <label>Kategori</label>
                <select value={form.kategori} onChange={(e) => setField('kategori', e.target.value)}>
                  {KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="field"><label>Keterangan</label><input value={form.keterangan} onChange={(e) => setField('keterangan', e.target.value)} placeholder="mis. Beli kain mori & pewarna" /></div>
              <div className="field"><label>Jumlah (Rp)</label><input inputMode="numeric" value={form.jumlah} onChange={(e) => setField('jumlah', formatThousands(e.target.value))} placeholder="mis. 500.000" /></div>
              <button className="btn btn-primary btn-block" style={{ padding: 13, borderRadius: 10, marginTop: 4 }} disabled={saving} type="submit">
                {saving ? 'Menyimpan…' : '+ Tambah Pengeluaran'}
              </button>
            </div>
            <div style={{ borderTop: '1px dashed var(--bar-track)', marginTop: 20, paddingTop: 16 }}>
              <div className="stat-label">Total tercatat</div>
              <div className="serif" style={{ fontSize: 30, fontWeight: 600, color: 'var(--red)', marginTop: 2 }}>{rupiah(total)}</div>
              <div className="stat-label" style={{ marginTop: 2 }}>dari {rows.length} pengeluaran</div>
            </div>
          </form>

          <div className="table-card">
            <div className="table-head" style={{ gridTemplateColumns: '0.7fr 1.1fr 1.6fr 1fr 40px' }}>
              <div>TANGGAL</div><div>KATEGORI</div><div>KETERANGAN</div><div style={{ textAlign: 'right' }}>JUMLAH</div><div></div>
            </div>
            {loading ? (
              <div className="empty-state">Memuat…</div>
            ) : rows.length === 0 ? (
              <div className="empty-state">Belum ada pengeluaran tercatat. Tambahkan lewat form di kiri.</div>
            ) : rows.map((r) => (
              <div className="table-row" style={{ gridTemplateColumns: '0.7fr 1.1fr 1.6fr 1fr 40px' }} key={r.id}>
                <div className="muted" style={{ fontWeight: 600 }}>{formatDateID(r.tanggal)}</div>
                <div style={{ fontSize: 13 }}>{r.kategori}</div>
                <div style={{ fontWeight: 600 }}>{r.keterangan}</div>
                <div style={{ fontWeight: 700, textAlign: 'right', color: 'var(--red)' }}>{rupiah(r.jumlah)}</div>
                <div style={{ textAlign: 'right' }}>
                  <span onClick={() => handleDelete(r.id)} style={{ cursor: 'pointer', color: 'var(--red)', fontWeight: 800, fontSize: 16 }}>×</span>
                </div>
              </div>
            ))}
            {!loading && rows.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '16px 20px', borderTop: '2px solid var(--border)', background: 'var(--blue-lighter)', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Total Pengeluaran Tercatat</div>
                <div className="serif" style={{ fontWeight: 600, fontSize: 20, color: 'var(--red)' }}>{rupiah(total)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="banner">
          <div style={{ fontSize: 14, color: 'var(--blue-dark)', lineHeight: 1.5, maxWidth: 620 }}>Data penjualan dan pengeluaranmu digabung jadi <b>Laporan Laba Rugi</b> yang bisa diunduh sebagai PDF.</div>
          <button className="btn btn-primary" style={{ fontSize: 14, padding: '11px 20px', borderRadius: 10, whiteSpace: 'nowrap' }} onClick={() => navigate('/laporan')}>Lihat Laporan Laba Rugi</button>
        </div>
      </div>
    </div>
  );
}
