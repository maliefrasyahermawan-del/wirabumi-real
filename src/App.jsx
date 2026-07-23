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
import Pembukuan from './pages/Pembukuan';
import PembukuanTambah from './pages/PembukuanTambah';
import Skor from './pages/Skor';
import Kur from './pages/Kur';
import PanduanSertifikat from './pages/PanduanSertifikat';
import Chatbot from './pages/Chatbot';
import Dinkop from './pages/Dinkop';
import Profile from './pages/Profile';
import Pengeluaran from './pages/Pengeluaran';
import LaporanKeuangan from './pages/LaporanKeuangan';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/masuk" element={<Login />} />
            <Route path="/daftar" element={<Register />} />
            <Route path="/lupa-password" element={<LupaPassword />} />
            <Route path="/cara-kerja" element={<CaraKerja />} />
            <Route path="/tentang" element={<Tentang />} />
            <Route path="/dashboard" element={<Dinkop />} />
            <Route path="/pembukuan" element={<ProtectedRoute><Pembukuan /></ProtectedRoute>} />
            <Route path="/pembukuan/tambah" element={<ProtectedRoute><PembukuanTambah /></ProtectedRoute>} />
            <Route path="/skor" element={<ProtectedRoute><Skor /></ProtectedRoute>} />
            <Route path="/kur" element={<ProtectedRoute><Kur /></ProtectedRoute>} />
            <Route path="/panduan-sertifikat" element={<ProtectedRoute><PanduanSertifikat /></ProtectedRoute>} />
            <Route path="/asisten" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/pengeluaran" element={<ProtectedRoute><Pengeluaran /></ProtectedRoute>} />
            <Route path="/laporan" element={<ProtectedRoute><LaporanKeuangan /></ProtectedRoute>} />
            <Route path="/ulasan" element={<ProtectedRoute><Ulasan /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
