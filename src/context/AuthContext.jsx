import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const me = await api.get('/auth/me');
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  async function signUp({ email, password, businessName, businessCategory, kecamatan, securityFood, securityBand }) {
    try {
      const { token } = await api.post('/auth/register', { email, password, businessName, businessCategory, kecamatan, securityFood, securityBand });
      setToken(token);
      await loadMe();
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  }

  async function resetPassword({ email, securityFood, securityBand, newPassword }) {
    try {
      await api.post('/auth/reset-password', { email, securityFood, securityBand, newPassword });
      return { error: null };
    } catch (err) {
      return { error: { message: err.message } };
    }
  }

  async function signIn({ email, password }) {
    try {
      const { token } = await api.post('/auth/login', { email, password });
      setToken(token);
      // Panggil api.get langsung agar kita bisa me-return user untuk keperluan cek role saat login
      const me = await api.get('/auth/me');
      setUser(me);
      return { error: null, user: me };
    } catch (err) {
      return { error: { message: err.message } };
    }
  }

  async function signOut() {
    setToken(null);
    setUser(null);
  }

  async function refreshProfile() {
    await loadMe();
  }

  const value = {
    user: user || null,
    profile: user || null, // profile fields are flattened onto /auth/me's response
    loading: user === undefined,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
