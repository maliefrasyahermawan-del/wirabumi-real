import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { rupiah, formatDateID } from '../lib/format';

const COLUMNS = [
  { key: 'tanggal', label: 'TANGGAL', defaultDir: 'desc' },
  { key: 'produk', label: 'PRODUK', defaultDir: 'asc' },
  { key: 'jumlah', label: 'JUMLAH', defaultDir: 'desc' },
  { key: 'harga', label: 'HARGA', defaultDir: 'desc', align: 'right' },
  { key: 'status', label: 'STATUS', defaultDir: 'asc' },
];

function compareRows(a, b, key) {
  switch (key) {
    case 'tanggal': return new Date(a.tanggal) - new Date(b.tanggal);
    case 'produk': return a.produk.localeCompare(b.produk, 'id');
    case 'jumlah': return Number(a.qty) - Number(b.qty);
    case 'harga': return Number(a.harga) - Number(b.harga);
    case 'status': return a.status.localeCompare(b.status, 'id');
    default: return 0;
  }
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function Pembukuan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('tanggal');
  const [sortDir, setSortDir] = useState('desc');

  async function loadRows() {
    setLoading(true);
    const data = await api.get('/transactions');
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { loadRows(); }, [user.id]);

  async function handleDelete(id) {
    await api.delete(`/transactions/${id}`);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  function toggleSort(key, defaultDir) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(defaultDir);
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.produk.toLowerCase().includes(q)) : rows;
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const cmp = compareRows(a, b, sortKey);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredRows, sortKey, sortDir]);

  const total = filteredRows.reduce((a, r) => a + Number(r.harga), 0);

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1240" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <div className="flex between" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 30, letterSpacing: '-0.5px', margin: 0 }}>Pembukuan</h1>
          <button className="btn btn-primary btn-md" onClick={() => navigate('/pembukuan/tambah')}>+ Tambah Transaksi</button>
        </div>
        <p className="page-sub" style={{ fontSize: 15, marginBottom: 22, maxWidth: 720 }}>Catat transaksi manual, tempel chat penjualan, atau unggah foto bukti transfer untuk diproses otomatis. Semua data ini yang jadi dasar skor kelayakan &amp; berkas KUR-mu.</p>

        <div className="flex between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div className="search-bar">
            <span className="search-bar-icon"><SearchIcon /></span>
            <input placeholder="Cari nama produk…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>
            {search ? `${filteredRows.length} dari ${rows.length} transaksi` : `${rows.length} transaksi tercatat`}
          </span>
        </div>

        <div className="table-card">
          <div className="table-head" style={{ gridTemplateColumns: '0.7fr 1.7fr 0.7fr 1fr 0.8fr 40px' }}>
            {COLUMNS.map((col) => (
              <div key={col.key} style={col.align === 'right' ? { textAlign: 'right' } : undefined}>
                <button
                  className={`th-sort ${sortKey === col.key ? 'active' : ''}`}
                  style={col.align === 'right' ? { flexDirection: 'row-reverse' } : undefined}
                  onClick={() => toggleSort(col.key, col.defaultDir)}
                >
                  {col.label}
                  {sortKey === col.key && <span className="th-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </div>
            ))}
            <div></div>
          </div>

          {loading ? (
            <div className="empty-state">Memuat…</div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              Belum ada transaksi tercatat.
              <div style={{ marginTop: 12 }}>
                <button className="btn btn-primary btn-md" onClick={() => navigate('/pembukuan/tambah')}>+ Tambah transaksi pertamamu</button>
              </div>
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="empty-state">Tidak ada produk yang cocok dengan "{search}".</div>
          ) : sortedRows.map((r) => (
            <div className="table-row" style={{ gridTemplateColumns: '0.7fr 1.7fr 0.7fr 1fr 0.8fr 40px' }} key={r.id}>
              <div className="muted" style={{ fontWeight: 600 }}>{formatDateID(r.tanggal)}</div>
              <div style={{ fontWeight: 600 }}>{r.produk}</div>
              <div style={{ color: 'var(--text-muted)' }}>{r.qty} {r.satuan}</div>
              <div style={{ fontWeight: 700, textAlign: 'right' }}>{rupiah(r.harga)}</div>
              <div><span className="status-badge">{r.status}</span></div>
              <div style={{ textAlign: 'right' }}>
                <span onClick={() => handleDelete(r.id)} style={{ cursor: 'pointer', color: 'var(--red)', fontWeight: 800, fontSize: 16 }}>×</span>
              </div>
            </div>
          ))}

          {!loading && sortedRows.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '16px 20px', borderTop: '2px solid var(--border)', background: 'var(--blue-lighter)', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{search ? 'Total (hasil pencarian)' : 'Total Omzet Tercatat'}</div>
              <div className="serif" style={{ fontWeight: 600, fontSize: 20, color: 'var(--blue-dark)' }}>{rupiah(total)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
