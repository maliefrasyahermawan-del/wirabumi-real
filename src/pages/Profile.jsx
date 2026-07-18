import { useState } from 'react';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

const KECAMATAN_OPTIONS = ['Pasar Kliwon', 'Serengan', 'Laweyan', 'Jebres', 'Banjarsari'];

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    business_name: user.business_name || '',
    business_category: user.business_category || '',
    business_address: user.business_address || '',
    kecamatan: user.kecamatan || KECAMATAN_OPTIONS[0],
    phone: user.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setSaved(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.business_name.trim()) {
      setError('Nama usaha wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/profile', form);
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page full-h">
      <TopNav />
      <div className="wrap-900">
        <header className="subheader">
          <div>
            <h1 className="page-title md">Profil Usaha</h1>
            <p className="page-sub">Informasi ini dipakai untuk berkas KUR dan dashboard Dinkop.</p>
          </div>
        </header>

        {error && <div className="alert-error mt-16">{error}</div>}
        {saved && <div className="alert-ok mt-16">Perubahan tersimpan.</div>}

        <form onSubmit={handleSubmit} className="card-lg mt-22" style={{ maxWidth: 560 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label>Email</label>
              <input value={user.email} disabled style={{ background: 'var(--blue-lighter)', color: 'var(--text-faint)' }} />
            </div>
            <div className="field">
              <label>Nama usaha</label>
              <input required value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="mis. Batik Kliwon Jaya" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field">
                <label>Kategori usaha</label>
                <input value={form.business_category} onChange={(e) => set('business_category', e.target.value)} placeholder="mis. Tekstil & Batik" />
              </div>
              <div className="field">
                <label>Kecamatan</label>
                <select value={form.kecamatan} onChange={(e) => set('kecamatan', e.target.value)}>
                  {KECAMATAN_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Alamat usaha</label>
              <input value={form.business_address} onChange={(e) => set('business_address', e.target.value)} placeholder="mis. Jl. Kliwon No. 12, Pasar Kliwon" />
            </div>
            <div className="field">
              <label>Nomor telepon</label>
              <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="mis. 0812xxxxxxx" />
            </div>
            <button className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} disabled={saving} type="submit">
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
