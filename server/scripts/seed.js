import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const mockUsers = [
  {
    email: 'batikkliwonjaya@local.test',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Batik Kliwon Jaya',
    business_category: 'Tekstil & Batik',
    kecamatan: 'Pasar Kliwon'
  },
  {
    email: 'testkosong@local.test',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Uji Coba Kosong',
    business_category: 'Umum',
    kecamatan: 'Laweyan'
  },
  {
    email: 'angkringan.joyo@local.test',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Angkringan Mas Joyo',
    business_category: 'Kuliner & Angkringan',
    kecamatan: 'Jebres'
  },
  {
    email: 'rbactest@example.com',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Toko RBAC Test',
    business_category: 'Umum',
    bank_consent: true,
    kur_review_status: 'approved'
  },
  {
    email: 'demo-pajak@local.test',
    password: 'demo1234',
    role: 'umkm_owner',
    business_name: 'Demo Estimasi Pajak',
    business_category: 'Demo',
    kecamatan: 'Pasar Kliwon'
  },
  {
    email: 'resettest@example.com',
    password: 'password123',
    role: 'government',
    business_name: 'Toko Reset Test'
  },
  {
    email: 'banktest@example.com',
    password: 'password123',
    role: 'bank_officer',
    business_name: 'Bank Test Officer'
  },
  {
    email: 'llmtest@example.com',
    password: 'password123',
    role: 'super_admin',
    business_name: 'Toko Uji LLM'
  }
];

async function seed() {
  console.log('🌱 Starting database seeder...');
  const client = await pool.connect();
  
  try {
    // 0. Auto-Migration sederhana: tambahkan kolom bank_consent jika belum ada di database lokal temanmu
    try {
      await client.query('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_consent boolean not null default false;');
      console.log('🔧 Auto-migration: Mengecek dan memperbarui tabel profiles (bank_consent)...');
    } catch (err) {
      // Abaikan error jika tabel profiles belum ada (berarti belum import schema.sql sama sekali)
      if (err.code !== '42P01') console.error('Gagal menjalankan auto-migration:', err);
    }

    await client.query('BEGIN');
    
    for (const u of mockUsers) {
      // 1. Cek apakah user sudah ada
      const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      let userId;
      
      if (checkRes.rows.length > 0) {
        console.log(`⚠️ User ${u.email} already exists, skipping...`);
        userId = checkRes.rows[0].id;
      } else {
        // 2. Hash password dan buat user
        const passwordHash = await bcrypt.hash(u.password, 10);
        const userRes = await client.query(
          'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
          [u.email, passwordHash, u.role]
        );
        userId = userRes.rows[0].id;
        
        // 3. Buat profil
        await client.query(
          `INSERT INTO profiles (user_id, business_name, business_category, kecamatan, bank_consent)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            userId, 
            u.business_name || 'Usaha Saya', 
            u.business_category || 'Umum', 
            u.kecamatan || null, 
            u.bank_consent || false
          ]
        );
        
        console.log(`✅ Created user: ${u.email} (${u.role})`);
      }
      
      // 4. Jika butuh status review KUR (untuk role UMKM tertentu)
      if (u.kur_review_status) {
        const adminRes = await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['bank_officer']);
        const adminId = adminRes.rows.length > 0 ? adminRes.rows[0].id : userId;
        
        await client.query(
          `INSERT INTO bank_reviews (user_id, status, reviewer_id, reviewed_at, updated_at)
           VALUES ($1, $2, $3, now(), now())
           ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status`,
          [userId, u.kur_review_status, adminId]
        );
        console.log(`   -> Set bank_review status to: ${u.kur_review_status}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('✅ Seeding completed successfully!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seeding failed:', e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
