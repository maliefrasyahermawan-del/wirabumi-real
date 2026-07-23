import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { formatDateID } from '../lib/format';

const KECAMATAN_OPTIONS = ['Pasar Kliwon', 'Serengan', 'Laweyan', 'Jebres', 'Banjarsari'];
const KATEGORI_PAJAK_OPTIONS = [
  { value: 'orang_pribadi', label: 'Orang Pribadi' },
  { value: 'badan_usaha', label: 'Badan Usaha (CV/PT/Firma/Koperasi)' },
];
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SECTIONS = [
  { key: 'profil', label: 'Profil Usaha' },
  { key: 'akun', label: 'Akun' },
  { key: 'lencana', label: 'Lencana' },
];

export default function Profile() {
  const { user, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const section = SECTIONS.some((s) => s.key === searchParams.get('section')) ? searchParams.get('section') : 'profil';

  const [form, setForm] = useState({
    business_name: user.business_name || '',
    business_category: user.business_category || '',
    business_address: user.business_address || '',
    kecamatan: user.kecamatan || KECAMATAN_OPTIONS[0],
    phone: user.phone || '',
    kategori_wajib_pajak: user.kategori_wajib_pajak || 'orang_pribadi',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [badges, setBadges] = useState(null);

  useEffect(() => {
    api.get('/quests').then((r) => setBadges(r.badges)).catch(() => {});
  }, []);

  async function handleAvatarChange(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setAvatarError('');
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Format gambar harus JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Ukuran gambar maksimal 2MB.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await api.upload('/profile/avatar', formData);
      await refreshProfile();
    } catch (err) {
      setAvatarError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

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
      <div className="wrap-1240" style={{ paddingTop: 34, paddingBottom: 60 }}>
        <header className="subheader">
          <div>
            <h1 className="page-title md">{section === 'akun' ? 'Akun' : 'Profil Usaha'}</h1>
            <p className="page-sub">
              {section === 'akun'
                ? 'Informasi akun yang kamu pakai untuk masuk ke WIRABUMI.'
                : 'Informasi ini dipakai untuk berkas KUR dan dashboard Dinkop.'}
            </p>
          </div>
        </header>

        {error && <div className="alert-error mt-16">{error}</div>}
        {saved && <div className="alert-ok mt-16">Perubahan tersimpan.</div>}

        <div className="settings-layout">
          <aside className="settings-sidebar">
            {SECTIONS.map((s) => (
              <button
                key={s.key}
                className={`settings-nav-item ${section === s.key ? 'active' : ''}`}
                onClick={() => setSearchParams({ section: s.key })}
              >
                {s.label}
              </button>
            ))}
          </aside>

          <div className="settings-content">
            {section === 'profil' && (
              <>
                <div className="card-lg">
                  <div className="profile-avatar-row">
                    {user.avatar_url ? (
                      <img className="profile-avatar" src={user.avatar_url} alt="Foto profil" />
                    ) : (
                      <div className="profile-avatar-fallback">{(form.business_name || 'U')[0].toUpperCase()}</div>
                    )}
                    <div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={uploadingAvatar}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingAvatar ? 'Mengunggah…' : 'Ganti foto profil'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        style={{ display: 'none' }}
                        onChange={handleAvatarChange}
                      />
                      <p className="page-sub" style={{ marginTop: 6, marginBottom: 0 }}>JPG, PNG, atau WEBP. Maks. 2MB.</p>
                      {avatarError && <div className="alert-error mt-16">{avatarError}</div>}
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="card-lg">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                    <div className="field">
                      <label>Kategori Wajib Pajak</label>
                      <select value={form.kategori_wajib_pajak} onChange={(e) => set('kategori_wajib_pajak', e.target.value)}>
                        {KATEGORI_PAJAK_OPTIONS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                      </select>
                      <p className="page-sub" style={{ marginTop: 6, marginBottom: 0 }}>
                        Menentukan apakah ambang bebas pajak Rp500 juta/tahun berlaku di estimasi pajak Laporan Laba Rugi. Hanya Orang Pribadi yang mendapat ambang ini.
                      </p>
                    </div>
                    <button className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} disabled={saving} type="submit">
                      {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </>
            )}

            {section === 'akun' && (
              <div className="card-lg" style={{ maxWidth: 480 }}>
                <div className="field">
                  <label>Email</label>
                  <input value={user.email} disabled style={{ background: 'var(--blue-lighter)', color: 'var(--text-faint)' }} />
                </div>
              </div>
            )}

            {section === 'lencana' && (
              <div className="card-lg">
                {!badges ? (
                  <div className="empty-state">Memuat…</div>
                ) : (
                  <div className="badge-grid">
                    {badges.map((b) => (
                      <div key={b.key} className={`badge-card ${b.earned ? 'earned' : 'locked'}`}>
                        <div className="badge-icon">{b.icon}</div>
                        <div className="badge-label">{b.label}</div>
                        <div className="badge-desc">{b.desc}</div>
                        {b.earned && <div className="badge-earned-date">Diraih {formatDateID(b.earned_at.slice(0, 10))}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
