import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_HOME } from '../lib/roles';

/**
 * ProtectedRoute — melindungi halaman dari akses yang tidak sah.
 *
 * Props:
 *   roles (string[]) — opsional. Daftar role yang boleh masuk halaman ini.
 *                      Jika tidak diberikan, semua user yang sudah login boleh masuk.
 *
 * Alur:
 *   1. Masih loading  → tampilkan spinner.
 *   2. Belum login    → redirect ke /masuk.
 *   3. Role tidak cocok → tampilkan halaman "Akses Ditolak".
 *   4. Lolos semua   → tampilkan halaman (children).
 *
 * Catatan keamanan: pengecekan ini hanya di sisi UI. Penegakan sesungguhnya
 * ada di server (requireRole di server/auth.js) — setiap API call admin
 * sudah diblokir di server dengan HTTP 403 tanpa peduli kondisi UI ini.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();

  // Tahap 1: Tunggu AuthContext selesai mengambil data sesi dari server
  if (loading) {
    return (
      <div className="loading-center">
        <span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  // Tahap 2: Jika belum login sama sekali, arahkan ke halaman masuk
  if (!user) {
    return <Navigate to="/masuk" replace />;
  }

  // Ambil role dari profil. Jika kosong/null (akun lama sebelum kolom role
  // ditambahkan), anggap sebagai 'umkm_owner' agar tidak salah tolak.
  const userRole = profile?.role || 'umkm_owner';

  // Tahap 3: Jika halaman ini punya pembatasan role, cek apakah role user cocok
  if (roles && !roles.includes(userRole)) {
    const homePath = ROLE_HOME[userRole] || '/';
    return (
      <div className="loading-center" style={{ flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 44 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Akses Ditolak</div>
        <div className="muted" style={{ fontSize: 13.5, textAlign: 'center', maxWidth: 280 }}>
          Halaman ini tidak tersedia untuk akun dengan peran <strong>{userRole}</strong>.
        </div>
        <a href={homePath} style={{ marginTop: 4, fontSize: 13, color: 'var(--blue)' }}>
          ← Kembali ke Dashboard saya
        </a>
      </div>
    );
  }

  // Tahap 4: Semua pengecekan lolos — tampilkan halaman
  return children;
}

