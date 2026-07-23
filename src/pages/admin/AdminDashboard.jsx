import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/roles';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const role = profile?.role || 'government';

  // Card navigasi untuk Dashboard Admin terpadu
  const cards = [
    {
      to: '/admin/monitoring',
      title: 'Monitoring Aktivitas',
      desc: 'Pantau aktivitas pengguna harian',
      icon: '▣',
      roles: ['government', 'super_admin']
    },
    {
      to: '/admin/impact',
      title: 'Dashboard Dampak',
      desc: 'Ringkasan dampak program UMKM',
      icon: '◎',
      roles: ['government', 'super_admin']
    },
    {
      to: '/dinkop',
      title: 'Dashboard Agregat',
      desc: 'Lihat data agregat Dinkop',
      icon: '◫',
      roles: ['government', 'bank_officer', 'super_admin']
    },
    {
      to: '/bank',
      title: 'Dashboard Bank',
      desc: 'Manajemen pengajuan KUR',
      icon: '⬛',
      roles: ['bank_officer', 'super_admin']
    },
    {
      to: '/admin/pengguna',
      title: 'Kelola Pengguna',
      desc: 'Atur peran pengguna',
      icon: '◉',
      roles: ['super_admin']
    },
    {
      to: '/admin/system',
      title: 'Sistem',
      desc: 'Pengaturan sistem',
      icon: '⚙',
      roles: ['super_admin']
    }
  ];

  const visibleCards = cards.filter(c => c.roles.includes(role));

  return (
    <AdminLayout>
      <div className="wrap-1180" style={{ paddingTop: 30, paddingBottom: 60 }}>
        <div className="eyebrow"><span className="eyebrow-dot"></span>PORTAL ADMIN</div>
        <h1 className="page-title md" style={{ marginTop: 8 }}>Dashboard {ROLE_LABELS[role] || 'Admin'}</h1>
        <p className="page-sub" style={{ marginBottom: 32 }}>Selamat datang di portal admin Wirabumi. Pilih menu dashboard di bawah ini atau melalui sidebar.</p>

        <div className="grid-responsive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {visibleCards.map((card) => (
            <div 
              key={card.to} 
              className="card-lg" 
              style={{ cursor: 'pointer', transition: 'transform 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
              onClick={() => navigate(card.to)}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ fontSize: 32, marginBottom: 16 }}>{card.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
