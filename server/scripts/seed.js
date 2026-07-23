/**
 * seed.js - Mengisi database dengan akun mockup + data keuangan bervariasi.
 *
 * Setiap akun UMKM punya:
 * - Profil (nama usaha, kategori, kecamatan, legal, dll.)
 * - Transaksi penjualan bervariasi (produk, harga, pelanggan, tanggal)
 * - Pengeluaran/beban bervariasi (kategori, jumlah, tanggal)
 * - Tanggal mulai usaha berbeda-beda (tercermin dari tanggal transaksi tertua)
 *
 * Aman dijalankan berulang kali: akun yang sudah ada akan di-update passwordnya,
 * dan data lama akan dihapus lalu diisi ulang (fresh seed).
 */

import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Menghasilkan tanggal ISO "YYYY-MM-DD" relatif terhadap hari ini. */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Membuat array transaksi untuk satu usaha.
 * @param {object} opts
 * @param {string[]} opts.products   - Daftar produk
 * @param {number[]} opts.prices     - Harga per produk (index cocok)
 * @param {string}   opts.satuan     - Satuan (pcs / porsi / meter / bungkus / dll.)
 * @param {string[]} opts.pelanggan  - Daftar nama pelanggan tetap
 * @param {number}   opts.startDay   - Mulai berapa hari lalu
 * @param {number}   opts.endDay     - Sampai berapa hari lalu (0 = hari ini)
 * @param {number}   opts.txPerWeek  - Rata-rata transaksi per minggu
 * @param {number}   opts.variance   - Varians harga (misalnya 0.2 = ±20%)
 */
function makeTxns({ products, prices, satuan = 'pcs', pelanggan = [], startDay, endDay = 0, txPerWeek, variance = 0.15 }) {
  const txns = [];
  const totalDays = startDay - endDay;
  const totalTxns = Math.floor((totalDays / 7) * txPerWeek);

  for (let i = 0; i < totalTxns; i++) {
    const dayOffset = endDay + Math.floor(Math.random() * totalDays);
    const pIdx = Math.floor(Math.random() * products.length);
    const basePrice = prices[pIdx];
    const jitter = 1 + (Math.random() * 2 - 1) * variance;
    const harga = Math.round(basePrice * jitter / 500) * 500; // pembulatan ke Rp 500
    const qty = Math.floor(Math.random() * 4) + 1;
    const statuses = ['Lunas', 'Lunas', 'Lunas', 'DP 50%'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const pName = pelanggan.length > 0 && Math.random() > 0.35
      ? pelanggan[Math.floor(Math.random() * pelanggan.length)]
      : null;

    txns.push({
      tanggal: daysAgo(dayOffset),
      produk: products[pIdx],
      qty,
      satuan,
      harga: harga * qty,
      pelanggan: pName,
      status,
    });
  }

  // Urutkan dari yang paling lama dulu
  txns.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return txns;
}

/**
 * Membuat array pengeluaran (beban) untuk satu usaha.
 */
function makeExpenses({ kategori, items, startDay, endDay = 0, expPerMonth, amounts }) {
  const expenses = [];
  const totalDays = startDay - endDay;
  const totalExp = Math.floor((totalDays / 30) * expPerMonth);

  for (let i = 0; i < totalExp; i++) {
    const dayOffset = endDay + Math.floor(Math.random() * totalDays);
    const kIdx = Math.floor(Math.random() * kategori.length);
    const aIdx = Math.floor(Math.random() * amounts.length);
    const jitter = 1 + (Math.random() * 0.2 - 0.1);
    const jumlah = Math.round(amounts[aIdx] * jitter / 1000) * 1000;

    expenses.push({
      tanggal: daysAgo(dayOffset),
      kategori: kategori[kIdx],
      keterangan: items[kIdx % items.length],
      jumlah,
    });
  }

  expenses.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return expenses;
}

// ─── Data per Akun ────────────────────────────────────────────────────────────

const umkmData = [

  // ════════════════════════════════════════════════════════════════════════════
  // 1. BATIK KLIWON JAYA - usaha batik yang sudah lama berjalan (±2.5 tahun)
  //    Omzet menengah-atas, konsisten, punya pelanggan tetap, legal lengkap.
  // ════════════════════════════════════════════════════════════════════════════
  {
    email: 'batikkliwonjaya@local.test',
    profile: {
      legal_nib: true, legal_pirt: false, legal_halal: false,
      bank_consent: false,
      kategori_wajib_pajak: 'orang_pribadi',
    },
    txns: makeTxns({
      products: [
        'Batik Tulis Motif Sidomukti', 'Batik Cap Motif Kawung', 'Batik Printing Hem',
        'Kain Batik Meteran', 'Selendang Batik', 'Daster Batik', 'Sarung Batik',
        'Batik Tulis Motif Parang', 'Set Batik Couple',
      ],
      prices: [320000, 85000, 120000, 45000, 75000, 55000, 95000, 450000, 250000],
      satuan: 'pcs',
      pelanggan: [
        'Bu Hartini', 'Pak Slamet', 'Bu Endang', 'Pak Rudi', 'Bu Wati',
        'Toko Pratama', 'CV Solo Craft', 'Bu Retno', 'Pak Hendra',
      ],
      startDay: 900,    // mulai ~2.5 tahun lalu
      txPerWeek: 14,    // ramai, ~14 transaksi/minggu
      variance: 0.12,
    }),
    expenses: makeExpenses({
      kategori: [
        'Pembelian Bahan Baku/Stok', 'Pembelian Bahan Baku/Stok',
        'Gaji & Upah Karyawan', 'Sewa Tempat', 'Listrik, Air & Utilitas',
        'Transportasi & BBM', 'Pemasaran & Promosi',
      ],
      items: [
        'Kain mori primissima', 'Malam batik & pewarna',
        'Gaji 2 pengrajin batik', 'Sewa kios Pasar Kliwon',
        'Listrik & air bulan ini', 'Ongkos kirim ekspedisi',
        'Boost Instagram & cetak brosur',
      ],
      amounts: [850000, 650000, 1800000, 1200000, 350000, 180000, 300000],
      startDay: 900,
      expPerMonth: 8,
    }),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 2. UJI COBA KOSONG - akun baru, baru daftar, belum ada data (sengaja kosong)
  //    Hanya punya 2-3 transaksi percobaan di awal.
  // ════════════════════════════════════════════════════════════════════════════
  {
    email: 'testkosong@local.test',
    profile: {
      legal_nib: false, legal_pirt: false, legal_halal: false,
      bank_consent: false,
      kategori_wajib_pajak: 'orang_pribadi',
    },
    txns: [
      // Hanya 3 transaksi manual percobaan
      { tanggal: daysAgo(5), produk: 'Keripik singkong', qty: 2, satuan: 'bungkus', harga: 20000, pelanggan: null, status: 'Lunas' },
      { tanggal: daysAgo(3), produk: 'Keripik singkong', qty: 1, satuan: 'bungkus', harga: 10000, pelanggan: 'Bu Sari', status: 'Lunas' },
      { tanggal: daysAgo(1), produk: 'Keripik tempe', qty: 3, satuan: 'bungkus', harga: 27000, pelanggan: null, status: 'Lunas' },
    ],
    expenses: [],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 3. ANGKRINGAN MAS JOYO - warung angkringan, usaha berjalan ±14 bulan
  //    Omzet kecil-menengah, harian, banyak item murah, fluktuatif.
  // ════════════════════════════════════════════════════════════════════════════
  {
    email: 'angkringan.joyo@local.test',
    profile: {
      legal_nib: true, legal_pirt: false, legal_halal: false,
      bank_consent: false,
      kategori_wajib_pajak: 'orang_pribadi',
    },
    txns: makeTxns({
      products: [
        'Nasi kucing ayam', 'Nasi kucing tempe', 'Sate usus', 'Sate telur puyuh',
        'Tahu goreng', 'Tempe goreng', 'Gorengan campur', 'Es teh manis',
        'Kopi hitam', 'Susu jahe', 'Wedang ronde', 'Mie instan rebus',
      ],
      prices: [5000, 4000, 3000, 3500, 2000, 2000, 7000, 4000, 5000, 8000, 10000, 12000],
      satuan: 'porsi',
      pelanggan: [
        'Pak Joko', 'Mas Budi', 'Bu Yanti', 'Mbak Rina', 'Pak Agus',
        'Mahasiswa kos', 'Pak Supri', 'Bu Ning',
      ],
      startDay: 430,   // mulai ~14 bulan lalu
      txPerWeek: 25,   // sangat aktif tiap hari, banyak item kecil
      variance: 0.2,
    }),
    expenses: makeExpenses({
      kategori: [
        'Pembelian Bahan Baku/Stok', 'Pembelian Bahan Baku/Stok',
        'Listrik, Air & Utilitas', 'Transportasi & BBM', 'Perlengkapan & Peralatan',
      ],
      items: [
        'Bahan baku nasi & lauk', 'Minuman & bahan es',
        'Listrik & air warung', 'Bensin motor belanja',
        'Perlengkapan gerobak & plastik',
      ],
      amounts: [350000, 180000, 120000, 80000, 150000],
      startDay: 430,
      expPerMonth: 10,
    }),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 4. TOKO RBAC TEST - toko kelontong/sembako, ±18 bulan, consent bank aktif
  //    Omzet sedang, stabil, sudah disetujui bank untuk KUR.
  // ════════════════════════════════════════════════════════════════════════════
  {
    email: 'rbactest@example.com',
    profile: {
      legal_nib: true, legal_pirt: false, legal_halal: true,
      bank_consent: true,
      kur_review_status: 'approved',
      kategori_wajib_pajak: 'orang_pribadi',
    },
    txns: makeTxns({
      products: [
        'Beras 5kg', 'Gula pasir 1kg', 'Minyak goreng 2L', 'Tepung terigu',
        'Sabun cuci piring', 'Deterjen 900gr', 'Indomie dus', 'Telur 1kg',
        'Kecap manis', 'Sarden kaleng', 'Susu kental manis', 'Mie telur 10 biji',
      ],
      prices: [65000, 17000, 35000, 14000, 12000, 22000, 95000, 32000, 18000, 15000, 16000, 22000],
      satuan: 'pcs',
      pelanggan: [
        'Bu Sumiati', 'Pak Kardi', 'Bu Ningsih', 'Pak Bambang', 'Bu Lastri',
        'Warung Pak RT', 'Bu Ngatmi', 'Pak Wagimin',
      ],
      startDay: 540,   // mulai ~18 bulan lalu
      txPerWeek: 18,
      variance: 0.10,
    }),
    expenses: makeExpenses({
      kategori: [
        'Pembelian Bahan Baku/Stok', 'Sewa Tempat', 'Listrik, Air & Utilitas',
        'Transportasi & BBM', 'Pemasaran & Promosi', 'Lain-lain',
      ],
      items: [
        'Belanja stok sembako', 'Sewa kios bulanan',
        'Listrik toko', 'Ongkos angkut barang',
        'Papan nama & banner', 'Kantong plastik & nota',
      ],
      amounts: [2500000, 800000, 250000, 200000, 150000, 75000],
      startDay: 540,
      expPerMonth: 7,
    }),
  },

  // ════════════════════════════════════════════════════════════════════════════
  // 5. DEMO ESTIMASI PAJAK - usaha katering, ±8 bulan, omzet mendekati
  //    ambang PPh Final Rp500jt/tahun - khusus untuk demo fitur pajak.
  //    Data disesuaikan agar omzet kumulatif tahun ini ~Rp430-470 juta.
  // ════════════════════════════════════════════════════════════════════════════
  {
    email: 'demo-pajak@local.test',
    profile: {
      legal_nib: true, legal_pirt: true, legal_halal: true,
      bank_consent: false,
      kategori_wajib_pajak: 'orang_pribadi',
    },
    txns: (() => {
      // Buat transaksi besar & konsisten agar akumulasi mendekati batas pajak
      const products = [
        'Nasi box paket rapat', 'Nasi kotak premium', 'Paket snack meeting',
        'Tumpeng mini 5 porsi', 'Nasi bakar ayam', 'Set prasmanan 20 pax',
        'Catering harian kantor', 'Paket ulang tahun',
      ];
      const prices = [35000, 55000, 25000, 280000, 40000, 450000, 1200000, 750000];
      return makeTxns({
        products, prices,
        satuan: 'paket',
        pelanggan: [
          'PT Sinar Mandiri', 'CV Berkah Jaya', 'Dinas Pendidikan Solo',
          'Bu Hendri', 'Pak Wahyu', 'SMAN 5 Solo', 'Klinik Sehat Bersama', 'Bu Dewi',
        ],
        startDay: 210,   // mulai ~7 bulan lalu di tahun ini
        txPerWeek: 10,   // cukup aktif
        variance: 0.18,
      });
    })(),
    expenses: makeExpenses({
      kategori: [
        'Pembelian Bahan Baku/Stok', 'Pembelian Bahan Baku/Stok',
        'Gaji & Upah Karyawan', 'Perlengkapan & Peralatan',
        'Transportasi & BBM', 'Listrik, Air & Utilitas',
      ],
      items: [
        'Bahan makanan harian', 'Rempah & bumbu masak',
        'Gaji 3 asisten dapur', 'Box makan & alat saji',
        'Bensin & ongkos antar', 'Gas LPG & listrik dapur',
      ],
      amounts: [1200000, 450000, 3000000, 350000, 280000, 400000],
      startDay: 210,
      expPerMonth: 9,
    }),
  },
];

// ─── Data Akun Lengkap ────────────────────────────────────────────────────────

const mockUsers = [
  // ── UMKM - punya data keuangan ──
  {
    email: 'batikkliwonjaya@local.test',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Batik Kliwon Jaya',
    business_category: 'Tekstil & Batik',
    kecamatan: 'Pasar Kliwon',
  },
  {
    email: 'testkosong@local.test',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Uji Coba Kosong',
    business_category: 'Umum',
    kecamatan: 'Laweyan',
  },
  {
    email: 'angkringan.joyo@local.test',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Angkringan Mas Joyo',
    business_category: 'Kuliner & Angkringan',
    kecamatan: 'Jebres',
  },
  {
    email: 'rbactest@example.com',
    password: 'password123',
    role: 'umkm_owner',
    business_name: 'Toko RBAC Test',
    business_category: 'Sembako & Kelontong',
    kur_review_status: 'approved',
  },
  {
    email: 'demo-pajak@local.test',
    password: 'demo1234',
    role: 'umkm_owner',
    business_name: 'Dapur Katering Bu Sari',
    business_category: 'Katering & Kuliner',
    kecamatan: 'Pasar Kliwon',
  },
  // ── Staff / Non-UMKM ──
  {
    email: 'resettest@example.com',
    password: 'password123',
    role: 'government',
    business_name: 'Dinkop UKM Kota Surakarta',
  },
  {
    email: 'banktest@example.com',
    password: 'password123',
    role: 'bank_officer',
    business_name: 'BRI KCP Pasar Kliwon',
  },
  {
    email: 'llmtest@example.com',
    password: 'password123',
    role: 'super_admin',
    business_name: 'Admin WIRABUMI',
  },
];

// ─── Seed Utama ───────────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting WIRABUMI database seeder...\n');
  const client = await pool.connect();

  try {
    // ── Auto-migration: pastikan kolom terbaru ada ──────────────────────────
    const autoMigrations = [
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_consent boolean NOT NULL DEFAULT false`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kategori_wajib_pajak text NOT NULL DEFAULT 'orang_pribadi'`,
    ];
    for (const sql of autoMigrations) {
      try { await client.query(sql); } catch { /* sudah ada, skip */ }
    }

    await client.query('BEGIN');

    for (const u of mockUsers) {
      // 1. Upsert user (create or update password + role)
      const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      let userId;

      if (checkRes.rows.length > 0) {
        userId = checkRes.rows[0].id;
        const pwHash = await bcrypt.hash(u.password, 10);
        await client.query(
          'UPDATE users SET password_hash = $1, role = $2 WHERE id = $3',
          [pwHash, u.role, userId]
        );
        console.log(`🔄 Updated: ${u.email} (${u.role})`);
      } else {
        const pwHash = await bcrypt.hash(u.password, 10);
        const res = await client.query(
          'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
          [u.email, pwHash, u.role]
        );
        userId = res.rows[0].id;
        console.log(`✅ Created: ${u.email} (${u.role})`);
      }

      // 2. Cari data keuangan untuk akun ini
      const fin = umkmData.find(d => d.email === u.email);

      // 3. Upsert profil
      const profExtra = fin?.profile || {};
      await client.query(
        `INSERT INTO profiles
           (user_id, business_name, business_category, kecamatan,
            bank_consent, kategori_wajib_pajak,
            legal_nib, legal_pirt, legal_halal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (user_id) DO UPDATE SET
           business_name        = EXCLUDED.business_name,
           business_category    = EXCLUDED.business_category,
           kecamatan            = EXCLUDED.kecamatan,
           bank_consent         = EXCLUDED.bank_consent,
           kategori_wajib_pajak = EXCLUDED.kategori_wajib_pajak,
           legal_nib            = EXCLUDED.legal_nib,
           legal_pirt           = EXCLUDED.legal_pirt,
           legal_halal          = EXCLUDED.legal_halal`,
        [
          userId,
          u.business_name || 'Usaha Saya',
          u.business_category || 'Umum',
          u.kecamatan || null,
          profExtra.bank_consent ?? false,
          profExtra.kategori_wajib_pajak ?? 'orang_pribadi',
          profExtra.legal_nib ?? false,
          profExtra.legal_pirt ?? false,
          profExtra.legal_halal ?? false,
        ]
      );

      // 4. Reset & isi ulang data keuangan (hanya untuk UMKM)
      if (fin) {
        // Hapus data lama agar fresh
        await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM expenses     WHERE user_id = $1', [userId]);

        // Insert transaksi
        if (fin.txns.length > 0) {
          for (const t of fin.txns) {
            await client.query(
              `INSERT INTO transactions (user_id, tanggal, produk, qty, satuan, harga, pelanggan, status, source)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'manual')`,
              [userId, t.tanggal, t.produk, t.qty, t.satuan, t.harga, t.pelanggan, t.status]
            );
          }
          console.log(`   → ${fin.txns.length} transaksi penjualan`);
        }

        // Insert pengeluaran
        if (fin.expenses.length > 0) {
          for (const e of fin.expenses) {
            await client.query(
              `INSERT INTO expenses (user_id, tanggal, kategori, keterangan, jumlah, source)
               VALUES ($1,$2,$3,$4,$5,'manual')`,
              [userId, e.tanggal, e.kategori, e.keterangan, e.jumlah]
            );
          }
          console.log(`   → ${fin.expenses.length} pengeluaran/beban`);
        }
      }

      // 5. Bank review status (untuk akun tertentu)
      if (u.kur_review_status) {
        const bankOfficer = await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['bank_officer']);
        const reviewerId = bankOfficer.rows[0]?.id ?? userId;
        await client.query(
          `INSERT INTO bank_reviews (user_id, status, reviewer_id, reviewed_at, updated_at)
           VALUES ($1,$2,$3,now(),now())
           ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status`,
          [userId, u.kur_review_status, reviewerId]
        );
        console.log(`   → Bank review: ${u.kur_review_status}`);
      }
    }

    await client.query('COMMIT');

    // ── Ringkasan ──────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════');
    console.log('✅ Seeding selesai! Akun yang tersedia:');
    console.log('════════════════════════════════════════');
    console.log('\n📦 UMKM Owner:');
    console.log('  batikkliwonjaya@local.test   → password123  (Batik Kliwon Jaya, ~2.5 th)');
    console.log('  testkosong@local.test         → password123  (Kosong, baru daftar)');
    console.log('  angkringan.joyo@local.test    → password123  (Angkringan Mas Joyo, ~14 bln)');
    console.log('  rbactest@example.com          → password123  (Sembako, ~18 bln, consent Bank ✓)');
    console.log('  demo-pajak@local.test         → demo1234     (Katering, ~7 bln, demo pajak)');
    console.log('\n🏛️  Pemerintah (Dinkop):');
    console.log('  resettest@example.com         → password123');
    console.log('\n🏦 Bank Officer:');
    console.log('  banktest@example.com          → password123');
    console.log('\n🔑 Super Admin:');
    console.log('  llmtest@example.com           → password123');
    console.log('════════════════════════════════════════\n');

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seeding GAGAL:', e.message);
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
