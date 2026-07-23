import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <div className="loading-center"><span className="spinner-sm" style={{ width: 28, height: 28, borderWidth: 3 }}></span></div>;
  }
  if (!user) {
    return <Navigate to="/masuk" replace />;
  }
  // UI-side gate only — the real enforcement is server-side (requireRole in
  // server/auth.js, 403s on every admin API call regardless of this check),
  // so this can't be bypassed just by hiding a nav link or editing the DOM.
  if (roles && !roles.includes(profile?.role)) {
    return (
      <div className="loading-center" style={{ flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 40 }}>🔒</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>Akses ditolak</div>
        <div className="muted" style={{ fontSize: 13.5 }}>Halaman ini khusus untuk peran tertentu.</div>
      </div>
    );
  }
  return children;
}
