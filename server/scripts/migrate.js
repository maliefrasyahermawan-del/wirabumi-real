/**
 * db:migrate — Pastikan semua kolom dan tabel yang dibutuhkan ada di database.
 * Aman dijalankan berulang kali (idempotent via IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
 * Tambahkan migrasi baru ke array `migrations` setiap kali schema.sql berubah.
 */
import { pool } from '../db.js';

const migrations = [
  // ── profiles ──────────────────────────────────────────────────────────────
  {
    desc: 'profiles.bank_consent',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bank_consent boolean NOT NULL DEFAULT false`
  },
  {
    desc: 'profiles.kategori_wajib_pajak',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kategori_wajib_pajak text NOT NULL DEFAULT 'orang_pribadi'
          CHECK (kategori_wajib_pajak IN ('orang_pribadi', 'badan_usaha'))`
  },
  // ── tabel pendukung ───────────────────────────────────────────────────────
  {
    desc: 'bank_reviews table',
    sql: `CREATE TABLE IF NOT EXISTS bank_reviews (
      user_id uuid primary key references users(id) on delete cascade,
      status text not null default 'pending' check (status in ('pending','approved','rejected')),
      reviewer_id uuid references users(id) on delete set null,
      notes text,
      reviewed_at timestamptz,
      updated_at timestamptz not null default now()
    )`
  },
  {
    desc: 'score_snapshots table',
    sql: `CREATE TABLE IF NOT EXISTS score_snapshots (
      user_id uuid primary key references users(id) on delete cascade,
      last_score int not null,
      updated_at timestamptz not null default now()
    )`
  },
  {
    desc: 'badges table',
    sql: `CREATE TABLE IF NOT EXISTS badges (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      badge_key text not null check (badge_key in ('umkm_pemula','konsisten','legal_lengkap','siap_kur','umkm_unggulan')),
      earned_at timestamptz not null default now(),
      unique (user_id, badge_key)
    )`
  },
  {
    desc: 'activity_log table',
    sql: `CREATE TABLE IF NOT EXISTS activity_log (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      role_at_time text not null,
      action_type text not null,
      description text not null,
      created_at timestamptz not null default now()
    )`
  },
  { desc: 'activity_log index (created)', sql: `CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log (created_at desc)` },
  { desc: 'activity_log index (user)',    sql: `CREATE INDEX IF NOT EXISTS activity_log_user_idx ON activity_log (user_id)` },
  {
    desc: 'error_log table',
    sql: `CREATE TABLE IF NOT EXISTS error_log (
      id uuid primary key default gen_random_uuid(),
      route text,
      message text not null,
      created_at timestamptz not null default now()
    )`
  },
  { desc: 'error_log index', sql: `CREATE INDEX IF NOT EXISTS error_log_created_idx ON error_log (created_at desc)` },
  {
    desc: 'llm_usage_log table',
    sql: `CREATE TABLE IF NOT EXISTS llm_usage_log (
      id uuid primary key default gen_random_uuid(),
      feature text not null,
      success boolean not null,
      created_at timestamptz not null default now()
    )`
  },
  { desc: 'llm_usage_log index', sql: `CREATE INDEX IF NOT EXISTS llm_usage_log_created_idx ON llm_usage_log (created_at desc)` },
];

async function migrate() {
  console.log('🔧 Running database migrations...');
  let ok = 0, skipped = 0;
  for (const m of migrations) {
    try {
      await pool.query(m.sql);
      console.log(`  ✅ ${m.desc}`);
      ok++;
    } catch (e) {
      console.log(`  ⚠️  Skipped ${m.desc}: ${e.message}`);
      skipped++;
    }
  }
  console.log(`\n✅ Done — ${ok} applied, ${skipped} skipped.\n`);
  pool.end();
}

migrate();
