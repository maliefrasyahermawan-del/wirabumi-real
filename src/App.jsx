import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import LupaPassword from './pages/LupaPassword';
import CaraKerja from './pages/CaraKerja';
import Tentang from './pages/Tentang';
import Ulasan from './pages/Ulasan';
import LandingAdmin from './pages/LandingAdmin';
import LandingUmkm from './pages/LandingUmkm';
import Pembukuan from './pages/Pembukuan';
import PembukuanTambah from './pages/PembukuanTambah';
import Skor from './pages/Skor';
import Kur from './pages/Kur';
import PanduanSertifikat from './pages/PanduanSertifikat';
import Chatbot from './pages/Chatbot';
import Dinkop from './pages/Dinkop';
import DinkopAggregate from './pages/DinkopAggregate';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Pengeluaran from './pages/Pengeluaran';
import LaporanKeuangan from './pages/LaporanKeuangan';
import Monitoring from './pages/admin/Monitoring';
import Impact from './pages/admin/Impact';
import KelolaPengguna from './pages/admin/KelolaPengguna';
import Bank from './pages/admin/Bank';
import System from './pages/admin/System';
import AdminDashboard from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/admin" element={<LandingAdmin />} />
            <Route path="/umkm" element={<LandingUmkm />} />
            <Route path="/masuk" element={<Login />} />
            <Route path="/daftar" element={<Register />} />
            <Route path="/lupa-password" element={<LupaPassword />} />
            <Route path="/cara-kerja" element={<CaraKerja />} />
            <Route path="/tentang" element={<Tentang />} />

            {/* Smart dashboard router - semua role yang sudah login bisa masuk,
                lalu diarahkan otomatis ke dashboard yang sesuai rolenya */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Dashboard personal UMKM - hanya umkm_owner (dan super_admin untuk keperluan debug) */}
            <Route path="/dashboard/umkm" element={<ProtectedRoute roles={['umkm_owner', 'super_admin']}><Dinkop /></ProtectedRoute>} />

            {/* Dashboard agregat Dinkop */}
            <Route path="/dinkop" element={<ProtectedRoute roles={['government', 'bank_officer', 'super_admin']}><DinkopAggregate /></ProtectedRoute>} />

            {/* Fitur UMKM - umkm_owner saja */}
            <Route path="/pembukuan" element={<ProtectedRoute roles={['umkm_owner']}><Pembukuan /></ProtectedRoute>} />
            <Route path="/pembukuan/tambah" element={<ProtectedRoute roles={['umkm_owner']}><PembukuanTambah /></ProtectedRoute>} />
            <Route path="/skor" element={<ProtectedRoute roles={['umkm_owner']}><Skor /></ProtectedRoute>} />
            <Route path="/kur" element={<ProtectedRoute roles={['umkm_owner']}><Kur /></ProtectedRoute>} />
            <Route path="/panduan-sertifikat" element={<ProtectedRoute roles={['umkm_owner']}><PanduanSertifikat /></ProtectedRoute>} />
            <Route path="/asisten" element={<ProtectedRoute roles={['umkm_owner']}><Chatbot /></ProtectedRoute>} />
            <Route path="/pengeluaran" element={<ProtectedRoute roles={['umkm_owner']}><Pengeluaran /></ProtectedRoute>} />
            <Route path="/laporan" element={<ProtectedRoute roles={['umkm_owner']}><LaporanKeuangan /></ProtectedRoute>} />
            <Route path="/ulasan" element={<ProtectedRoute roles={['umkm_owner']}><Ulasan /></ProtectedRoute>} />

            {/* Profil - semua role yang sudah login */}
            <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin & pemerintah */}
            <Route path="/admin/dashboard" element={<ProtectedRoute roles={['government', 'bank_officer', 'super_admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/bank" element={<ProtectedRoute roles={['government', 'bank_officer', 'super_admin']}><Bank /></ProtectedRoute>} />
            <Route path="/admin/monitoring" element={<ProtectedRoute roles={['government', 'bank_officer', 'super_admin']}><Monitoring /></ProtectedRoute>} />
            <Route path="/admin/impact" element={<ProtectedRoute roles={['government', 'bank_officer', 'super_admin']}><Impact /></ProtectedRoute>} />
            <Route path="/admin/pengguna" element={<ProtectedRoute roles={['super_admin']}><KelolaPengguna /></ProtectedRoute>} />
            <Route path="/admin/system" element={<ProtectedRoute roles={['super_admin']}><System /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
