import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { logActivity } from '../lib/activityLog.js';

const router = Router();
router.use(requireAuth);

export const KATEGORI_OPTIONS = [
  'Pembelian Bahan Baku/Stok', 'Gaji & Upah Karyawan', 'Sewa Tempat',
  'Listrik, Air & Utilitas', 'Transportasi & BBM', 'Perlengkapan & Peralatan',
  'Pemasaran & Promosi', 'Lain-lain',
];

router.get('/', async (req, res) => {
  const { since, until } = req.query;
  const params = [req.userId];
  let query = 'select * from expenses where user_id = $1';
  if (since) { params.push(since); query += ` and tanggal >= $${params.length}`; }
  if (until) { params.push(until); query += ` and tanggal <= $${params.length}`; }
  query += ' order by tanggal desc, created_at desc';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { tanggal, kategori, keterangan, jumlah } = req.body || {};
  if (!KATEGORI_OPTIONS.includes(kategori)) {
    return res.status(400).json({ error: 'Kategori tidak valid.' });
  }
  if (!keterangan || !jumlah || jumlah <= 0) {
    return res.status(400).json({ error: 'Keterangan dan jumlah wajib diisi dengan benar.' });
  }
  const result = await pool.query(
    `insert into expenses (user_id, tanggal, kategori, keterangan, jumlah)
     values ($1, coalesce($2, current_date), $3, $4, $5)
     returning *`,
    [req.userId, tanggal || null, kategori, keterangan, jumlah]
  );
  logActivity(req.userId, 'expense_create', `Mencatat pengeluaran: ${kategori}`);
  res.status(201).json(result.rows[0]);
});

router.delete('/:id', async (req, res) => {
  await pool.query('delete from expenses where id = $1 and user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
});

export default router;
