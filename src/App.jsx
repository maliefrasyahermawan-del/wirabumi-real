import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CaraKerja from './pages/CaraKerja';
import Pembukuan from './pages/Pembukuan';
import Skor from './pages/Skor';
import Kur from './pages/Kur';
import Chatbot from './pages/Chatbot';
import Dinkop from './pages/Dinkop';
import Profile from './pages/Profile';
import Pengeluaran from './pages/Pengeluaran';
import LaporanKeuangan from './pages/LaporanKeuangan';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/masuk" element={<Login />} />
          <Route path="/daftar" element={<Register />} />
          <Route path="/cara-kerja" element={<CaraKerja />} />
          <Route path="/dashboard" element={<Dinkop />} />
          <Route path="/pembukuan" element={<ProtectedRoute><Pembukuan /></ProtectedRoute>} />
          <Route path="/skor" element={<ProtectedRoute><Skor /></ProtectedRoute>} />
          <Route path="/kur" element={<ProtectedRoute><Kur /></ProtectedRoute>} />
          <Route path="/asisten" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/pengeluaran" element={<ProtectedRoute><Pengeluaran /></ProtectedRoute>} />
          <Route path="/laporan" element={<ProtectedRoute><LaporanKeuangan /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
