import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { rupiah, formatDateID, todayISO, formatThousands, parseThousands } from '../lib/format';
import { parseChatToTransactions } from '../lib/chatParser';
import { parseReceiptText } from '../lib/receiptParser';

const STATUS_OPTIONS = ['Lunas', 'DP 50%', 'Belum Lunas'];
const SATUAN_OPTIONS = ['pcs', 'lusin', 'gros', 'kodi', 'pack', 'box', 'dus', 'kg', 'liter'];
const SAMPLE_CHAT = "Bu, batik tulis motif Sidomukti yg kemarin msh ada?\nMasih Bu, ready 2 pcs. 320rb/pcs ya\nOke saya ambil 2. Total 640rb kan?\nBetul Bu, 640rb. Sudah saya transfer ya\nSudah masuk Bu, terima kasih barang dikirim sore ini";

export default function PembukuanTambah() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('manual'); // 'manual' | 'chat' | 'photo'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ tanggal: todayISO(), produk: '', qty: '1', satuan: 'pcs', harga: '', pelanggan: '', status: 'Lunas' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [chatText, setChatText] = useState('');
  const [draft, setDraft] = useState(null); // array of parsed rows pending review
  const [draftSource, setDraftSource] = useState('chat_parse');
  const [importDate, setImportDate] = useState(todayISO());
  const [importing, setImporting] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');
  const [ocrRawText, setOcrRawText] = useState('');

  async function loadRows() {
    setLoading(true);
    const data = await api.get('/transactions');
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { loadRows(); }, [user.id]);

  function setField(f, v) { setForm((s) => ({ ...s, [f]: v })); }

  async function handleAddManual(e) {
    e.preventDefault();
    setError('');
    const harga = parseThousands(form.harga);
    if (!form.produk.trim() || !harga || harga <= 0) {
      setError('Isi nama produk dan harga yang valid.');
      return;
    }
    setSaving(true);
    try {
      await api.post('/transactions', {
        tanggal: form.tanggal,
        produk: form.produk.trim(),
        qty: parseFloat(form.qty) || 1,
        satuan: form.satuan.trim() || 'pcs',
        harga,
        pelanggan: form.pelanggan.trim() || null,
        status: form.status,
        source: 'manual',
      });
    } catch (err) {
      setSaving(false);
      setError(err.message);
      return;
    }
    setSaving(false);
    setForm({ tanggal: todayISO(), produk: '', qty: '1', satuan: 'pcs', harga: '', pelanggan: '', status: 'Lunas' });
    loadRows();
  }

  async function handleDelete(id) {
    await api.delete(`/transactions/${id}`);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  function runParse() {
    const parsed = parseChatToTransactions(chatText);
    setDraftSource('chat_parse');
    setDraft(parsed.map((p) => ({ ...p, pelanggan: '', include: true })));
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setOcrRawText('');
    setError('');
  }

  async function runOcr() {
    if (!photoFile) return;
    setOcrBusy(true);
    setError('');
    setOcrStatus('Menyiapkan mesin OCR…');
    try {
      const Tesseract = await import('tesseract.js');
      const { data } = await Tesseract.recognize(photoFile, 'ind', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrStatus(`Membaca gambar… ${Math.round((m.progress || 0) * 100)}%`);
          } else if (m.status) {
            setOcrStatus(m.status.charAt(0).toUpperCase() + m.status.slice(1) + '…');
          }
        },
      });
      const text = data.text || '';
      setOcrRawText(text);
      const parsed = parseReceiptText(text);
      setDraftSource('photo_ocr');
      setDraft([{
        produk: parsed.produk,
        qty: 1,
        satuan: 'transfer',
        harga: parsed.harga,
        status: 'Lunas',
        confidence: parsed.confidence,
        include: true,
        pelanggan: parsed.namaPenerima || '',
      }]);
      if (parsed.tanggal) setImportDate(parsed.tanggal);
    } catch (err) {
      setError('Gagal membaca gambar: ' + err.message);
    } finally {
      setOcrBusy(false);
      setOcrStatus('');
    }
  }

  function resetPhotoMode() {
    setPhotoFile(null);
    setPhotoPreviewUrl(null);
    setOcrRawText('');
  }

  function updateDraftRow(idx, field, value) {
    setDraft((d) => d.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  }

  async function saveDraft() {
    const toSave = draft.filter((d) => d.include && d.produk && d.harga > 0);
    if (toSave.length === 0) return;
    setImporting(true);
    const payload = toSave.map((d) => ({
      tanggal: importDate,
      produk: d.produk,
      qty: d.qty,
      satuan: d.satuan,
      harga: d.harga,
      pelanggan: d.pelanggan || null,
      status: d.status,
      confidence: d.confidence || null,
    }));
    try {
      await api.post('/transactions/bulk', { rows: payload, source: draftSource });
    } catch (err) {
      setImporting(false);
      setError(err.message);
      return;
    }
    setImporting(false);
    setDraft(null);
    setChatText('');
    resetPhotoMode();
    setMode('manual');
    loadRows();
  }

  const total = rows.reduce((a, r) => a + Number(r.harga), 0);

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-1180" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <button className="navlink" style={{ marginBottom: 14 }} onClick={() => navigate('/pembukuan')}>← Kembali ke Pembukuan</button>

        <div className="flex between" style={{ alignItems: 'baseline', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <h1 className="serif" style={{ fontWeight: 600, fontSize: 30, letterSpacing: '-0.5px', margin: 0 }}>Tambah Transaksi</h1>
          <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{rows.length} transaksi tercatat</span>
        </div>
        <p className="page-sub" style={{ fontSize: 15, marginBottom: 22, maxWidth: 720 }}>Catat transaksi manual, tempel chat penjualan, atau unggah foto bukti transfer untuk diproses otomatis. Semua data ini yang jadi dasar skor kelayakan &amp; berkas KUR-mu.</p>

        <datalist id="satuan-options">
          {SATUAN_OPTIONS.map((s) => <option key={s} value={s} />)}
        </datalist>

        <div className="mode-tabs">
          <button className={`mode-tab ${mode === 'manual' ? 'active' : 'inactive'}`} onClick={() => setMode('manual')}>Input Manual</button>
          <button className={`mode-tab ${mode === 'chat' ? 'active' : 'inactive'}`} onClick={() => setMode('chat')}>Tempel Chat</button>
          <button className={`mode-tab ${mode === 'photo' ? 'active' : 'inactive'}`} onClick={() => setMode('photo')}>Unggah Foto</button>
        </div>

        {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {mode === 'manual' && (
          <div style={{ display: 'grid', gridTemplateColumns: '0.75fr 1.25fr', gap: 24, alignItems: 'start' }}>
            <form onSubmit={handleAddManual} className="card-lg" style={{ background: 'var(--blue-lighter)' }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--blue-dark)', letterSpacing: '0.4px', marginBottom: 16 }}>TAMBAH TRANSAKSI</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <div className="field"><label>Tanggal</label><input type="date" value={form.tanggal} onChange={(e) => setField('tanggal', e.target.value)} /></div>
                <div className="field"><label>Produk / keterangan</label><input value={form.produk} onChange={(e) => setField('produk', e.target.value)} placeholder="mis. Batik Cap Truntum" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field"><label>Jumlah</label><input type="number" min="0" step="any" value={form.qty} onChange={(e) => setField('qty', e.target.value)} /></div>
                  <div className="field"><label>Satuan</label><input list="satuan-options" value={form.satuan} onChange={(e) => setField('satuan', e.target.value)} placeholder="pcs" /></div>
                </div>
                <div className="field"><label>Harga total (Rp)</label><input inputMode="numeric" value={form.harga} onChange={(e) => setField('harga', formatThousands(e.target.value))} placeholder="mis. 290.000" /></div>
                <div className="field"><label>Nama pelanggan (opsional)</label><input value={form.pelanggan} onChange={(e) => setField('pelanggan', e.target.value)} placeholder="Membantu skor pelanggan tetap" /></div>
                <div className="field">
                  <label>Status pembayaran</label>
                  <select value={form.status} onChange={(e) => setField('status', e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <button className="btn btn-primary btn-block" style={{ padding: 13, borderRadius: 10, marginTop: 4 }} disabled={saving} type="submit">
                  {saving ? 'Menyimpan…' : '+ Tambah ke Pembukuan'}
                </button>
              </div>
              <div style={{ borderTop: '1px dashed var(--bar-track)', marginTop: 20, paddingTop: 16 }}>
                <div className="stat-label">Total tercatat</div>
                <div className="serif" style={{ fontSize: 30, fontWeight: 600, color: 'var(--blue-dark)', marginTop: 2 }}>{rupiah(total)}</div>
                <div className="stat-label" style={{ marginTop: 2 }}>dari {rows.length} transaksi</div>
              </div>
            </form>

            <div className="table-card">
              <div className="table-head" style={{ gridTemplateColumns: '0.7fr 1.7fr 0.7fr 1fr 0.8fr 40px' }}>
                <div>TANGGAL</div><div>PRODUK</div><div>JUMLAH</div><div style={{ textAlign: 'right' }}>HARGA</div><div>STATUS</div><div></div>
              </div>
              {loading ? (
                <div className="empty-state">Memuat…</div>
              ) : rows.length === 0 ? (
                <div className="empty-state">Belum ada transaksi. Tambahkan lewat form di kiri atau tempel chat penjualanmu.</div>
              ) : rows.map((r) => (
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
              {!loading && rows.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, padding: '16px 20px', borderTop: '2px solid var(--border)', background: 'var(--blue-lighter)', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Total Omzet Tercatat</div>
                  <div className="serif" style={{ fontWeight: 600, fontSize: 20, color: 'var(--blue-dark)' }}>{rupiah(total)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'chat' && (
          <div>
            {!draft ? (
              <div style={{ animation: 'wbFade .4s ease' }}>
                <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 640 }}>
                  Tempel percakapan WhatsApp atau caption Instagram penjualanmu. WIRABUMI akan mencoba mengenali produk, jumlah, dan harga secara otomatis. Kamu tetap bisa mengoreksi hasilnya sebelum disimpan.
                </p>
                <textarea
                  className="capture-input"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Contoh:  Bu, batik motif Sidomukti masih ada?  Masih, 320rb/pcs ya…"
                />
                <div className="flex between mt-16" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <button className="btn btn-secondary btn-md" onClick={() => setChatText(SAMPLE_CHAT)}>Isi contoh chat</button>
                  <button className="btn btn-primary btn-lg" disabled={!chatText.trim()} onClick={runParse}>Proses dengan WIRABUMI →</button>
                </div>
              </div>
            ) : (
              <DraftReview
                draft={draft} updateDraftRow={updateDraftRow}
                importDate={importDate} setImportDate={setImportDate}
                importing={importing} saveDraft={saveDraft}
                onBack={() => setDraft(null)}
                emptyHint='Coba tempel chat yang berisi harga penjualan (mis. "320rb", "Rp 320.000").'
              />
            )}
          </div>
        )}

        {mode === 'photo' && (
          <div>
            {!draft ? (
              <div style={{ animation: 'wbFade .4s ease' }}>
                <p style={{ fontSize: 15, color: 'var(--text-muted)', maxWidth: 640 }}>
                  Unggah foto/screenshot bukti transfer bank (mis. konfirmasi m-Transfer BCA/BNI). WIRABUMI membaca teks di gambar itu memakai OCR di browser (tanpa dikirim ke server manapun), lalu mencoba mengenali nominal &amp; keterangannya. Kamu tetap bisa mengoreksi hasilnya sebelum disimpan.
                </p>
                <div className="card" style={{ marginTop: 16, padding: 20 }}>
                  <input type="file" accept="image/*" onChange={handlePhotoSelect} />
                  {photoPreviewUrl && (
                    <div style={{ marginTop: 14 }}>
                      <img src={photoPreviewUrl} alt="Pratinjau bukti transfer" style={{ maxWidth: 260, maxHeight: 400, borderRadius: 10, border: '1px solid var(--border)' }} />
                    </div>
                  )}
                </div>
                <div className="flex between mt-16" style={{ flexWrap: 'wrap', gap: 12 }}>
                  <span className="muted" style={{ fontSize: 13 }}>{ocrBusy ? ocrStatus : 'Format: JPG/PNG, hasil pembacaan bisa dikoreksi sebelum disimpan.'}</span>
                  <button className="btn btn-primary btn-lg" disabled={!photoFile || ocrBusy} onClick={runOcr}>
                    {ocrBusy ? 'Membaca gambar…' : 'Proses dengan WIRABUMI →'}
                  </button>
                </div>
              </div>
            ) : (
              <DraftReview
                draft={draft} updateDraftRow={updateDraftRow}
                importDate={importDate} setImportDate={setImportDate}
                importing={importing} saveDraft={saveDraft}
                onBack={() => { setDraft(null); resetPhotoMode(); }}
                emptyHint="Sistem tidak menemukan nominal transfer pada gambar ini. Coba foto lain yang lebih jelas, atau isi manual."
                extra={ocrRawText && (
                  <details style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-faint)' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Lihat teks hasil OCR (untuk verifikasi)</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--blue-lighter)', padding: 10, borderRadius: 8, marginTop: 6 }}>{ocrRawText}</pre>
                  </details>
                )}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DraftReview({ draft, updateDraftRow, importDate, setImportDate, importing, saveDraft, onBack, emptyHint, extra }) {
  return (
    <div style={{ animation: 'wbFade .4s ease' }}>
      <div className="done-flag">{draft.length === 0 ? 'Tidak ada transaksi terdeteksi' : `${draft.length} transaksi terdeteksi, periksa & koreksi sebelum disimpan`}</div>
      {draft.length === 0 ? (
        <div className="empty-state">{emptyHint}</div>
      ) : (
        <>
          <div className="field" style={{ maxWidth: 220, marginBottom: 14 }}>
            <label>Tanggal untuk batch ini</label>
            <input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)} />
          </div>
          <div className="table-card">
            <div className="table-head" style={{ gridTemplateColumns: '28px 1.3fr 0.7fr 0.9fr 1fr 0.8fr 0.6fr' }}>
              <div></div><div>PRODUK</div><div>JUMLAH</div><div>PELANGGAN</div><div>HARGA</div><div>STATUS</div><div>YAKIN</div>
            </div>
            {draft.map((d, i) => (
              <div className="table-row" style={{ gridTemplateColumns: '28px 1.3fr 0.7fr 0.9fr 1fr 0.8fr 0.6fr' }} key={i}>
                <input type="checkbox" checked={d.include} onChange={(e) => updateDraftRow(i, 'include', e.target.checked)} />
                <input value={d.produk} onChange={(e) => updateDraftRow(i, 'produk', e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13.5 }} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="number" value={d.qty} onChange={(e) => updateDraftRow(i, 'qty', parseFloat(e.target.value) || 0)} style={{ width: 50, border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13.5 }} />
                  <input list="satuan-options" value={d.satuan} onChange={(e) => updateDraftRow(i, 'satuan', e.target.value)} style={{ width: 50, border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13.5 }} />
                </div>
                <input value={d.pelanggan || ''} onChange={(e) => updateDraftRow(i, 'pelanggan', e.target.value)} placeholder="opsional" style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13.5 }} />
                <input type="number" value={d.harga} onChange={(e) => updateDraftRow(i, 'harga', parseFloat(e.target.value) || 0)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', fontSize: 13.5, fontWeight: 700 }} />
                <select value={d.status} onChange={(e) => updateDraftRow(i, 'status', e.target.value)} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '6px 4px', fontSize: 12.5 }}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className={`status-badge ${d.confidence}`}>{d.confidence}</span>
              </div>
            ))}
          </div>
          {extra}
        </>
      )}
      <div className="flex between mt-16">
        <button className="btn btn-secondary btn-md" onClick={onBack}>← Ulangi</button>
        {draft.length > 0 && (
          <button className="btn btn-primary btn-lg" disabled={importing} onClick={saveDraft}>
            {importing ? 'Menyimpan…' : 'Simpan ke Pembukuan →'}
          </button>
        )}
      </div>
    </div>
  );
}
