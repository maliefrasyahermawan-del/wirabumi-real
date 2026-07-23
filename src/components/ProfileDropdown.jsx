import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfileDropdown() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function go(section) {
    navigate(`/profil?section=${section}`);
    setOpen(false);
  }

  const initial = (profile?.business_name || 'U')[0].toUpperCase();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className={`nav-avatar-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Profil & pengaturan"
      >
        {profile?.avatar_url ? (
          <img className="nav-avatar" src={profile.avatar_url} alt="" />
        ) : (
          <span className="nav-avatar-fallback">{initial}</span>
        )}
      </button>
      {open && (
        <div className="nav-dropdown nav-dropdown-end">
          <div className="nav-dropdown-user">
            {profile?.avatar_url ? (
              <img className="nav-avatar md" src={profile.avatar_url} alt="" />
            ) : (
              <span className="nav-avatar-fallback md">{initial}</span>
            )}
            <div>
              <div className="nav-dropdown-user-name">{profile?.business_name || 'Usahaku'}</div>
              <div className="nav-dropdown-user-email">{profile?.email}</div>
            </div>
          </div>
          <button className="nav-dropdown-item" onClick={() => go('profil')}>Lihat Profil</button>
          <button className="nav-dropdown-item" onClick={() => go('akun')}>Pengaturan Akun</button>
          <button className="nav-dropdown-item" onClick={() => { navigate('/tentang'); setOpen(false); }}>Tentang</button>
          <button className="nav-dropdown-item" onClick={() => { navigate('/ulasan'); setOpen(false); }}>Berikan Ulasan</button>
          <div className="nav-dropdown-divider" />
          <button className="nav-dropdown-item" onClick={() => signOut()}>Keluar</button>
        </div>
      )}
    </div>
  );
}
