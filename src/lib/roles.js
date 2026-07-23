export const ROLE_LABELS = {
  umkm_owner: 'UMKM',
  government: 'Pemerintah (Dinkop)',
  bank_officer: 'Bank',
  super_admin: 'Super Admin',
};

export const ROLE_HOME = {
  umkm_owner: '/dashboard/umkm',
  government: '/admin/dashboard',
  bank_officer: '/admin/dashboard',
  super_admin: '/admin/dashboard',
};

// Semua role yang diperlakukan sebagai "admin" di frontend
export const ADMIN_ROLES = ['government', 'bank_officer', 'super_admin'];
