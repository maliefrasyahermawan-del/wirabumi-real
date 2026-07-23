import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Dashboard router — baca role user lalu arahkan ke halaman dashboard yang sesuai.
 *
 * umkm_owner  → /dashboard/umkm    (dashboard personal usaha)
 * government  → /admin/monitoring  (monitoring aktivitas Dinkop)
 * bank_officer→ /bank              (dashboard bank & verifikasi KUR)
 * super_admin → /admin/monitoring  (sama dengan government + akses tambahan)
 *
 * Jika role tidak dikenali (null / akun lama), default ke UMKM dashboard.
 */
export default function Dashboard() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const role = profile?.role;
    if (role === 'government' || role === 'super_admin') {
      navigate('/admin/monitoring', { replace: true });
    } else if (role === 'bank_officer') {
      navigate('/bank', { replace: true });
    } else {
      // umkm_owner atau role null/undefined → personal UMKM dashboard
      navigate('/dashboard/umkm', { replace: true });
    }
  }, [loading, profile, navigate]);

  return (
    <div className="loading-center">
      <span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }} />
    </div>
  );
}
