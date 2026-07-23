// Makes sure the 'wirabumi' database is reachable and has the base schema
// (tables + compute_score/get_kur_offer functions) applied, so db:seed and
// the app itself can run immediately after. Safe to run every time - only
// applies schema.sql if the 'users' table doesn't exist yet.
// Exit codes: 0 = ready, 1 = can't connect (role/database probably missing).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.error(`[ensure-db] Tidak bisa konek ke database: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  try {
    const check = await client.query(
      `select 1 from information_schema.tables where table_name = 'users'`
    );
    if (check.rows.length === 0) {
      console.log('[ensure-db] Tabel belum ada, menerapkan server/schema.sql...');
      const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
      await client.query(schemaSql);
      console.log('[ensure-db] Schema berhasil diterapkan.');
    } else {
      console.log('[ensure-db] Schema sudah ada.');
    }
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error(`[ensure-db] Gagal: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
