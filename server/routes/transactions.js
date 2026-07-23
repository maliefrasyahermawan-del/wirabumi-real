import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';
import { logActivity } from '../lib/activityLog.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { since, until } = req.query;
  const params = [req.userId];
  let query = 'select * from transactions where user_id = $1';
  if (since) { params.push(since); query += ` and tanggal >= $${params.length}`; }
  if (until) { params.push(until); query += ` and tanggal <= $${params.length}`; }
  query += ' order by tanggal desc, created_at desc';
  const result = await pool.query(query, params);
  res.json(result.rows);
});

router.post('/', async (req, res) => {
  const { tanggal, produk, qty, satuan, harga, pelanggan, status, source } = req.body || {};
  if (!produk || !harga || harga <= 0) {
    return res.status(400).json({ error: 'Produk dan harga wajib diisi dengan benar.' });
  }
  const result = await pool.query(
    `insert into transactions (user_id, tanggal, produk, qty, satuan, harga, pelanggan, status, source)
     values ($1, coalesce($2, current_date), $3, coalesce($4, 1), coalesce($5, 'pcs'), $6, $7, coalesce($8, 'Lunas'), coalesce($9, 'manual'))
     returning *`,
    [req.userId, tanggal || null, produk, qty || null, satuan || null, harga, pelanggan || null, status || null, source || null]
  );
  logActivity(req.userId, 'transaction_create', `Mencatat transaksi: ${produk}`);
  res.status(201).json(result.rows[0]);
});

router.post('/bulk', async (req, res) => {
  const rows = req.body?.rows;
  const source = ['chat_parse', 'photo_ocr'].includes(req.body?.source) ? req.body.source : 'chat_parse';
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Tidak ada baris untuk disimpan.' });

  const client = await pool.connect();
  try {
    await client.query('begin');
    const inserted = [];
    for (const r of rows) {
      if (!r.produk || !r.harga || r.harga <= 0) continue;
      const confidence = ['low', 'medium', 'high'].includes(r.confidence) ? r.confidence : null;
      const result = await client.query(
        `insert into transactions (user_id, tanggal, produk, qty, satuan, harga, pelanggan, status, source, confidence)
         values ($1, coalesce($2, current_date), $3, coalesce($4, 1), coalesce($5, 'pcs'), $6, $7, coalesce($8, 'Lunas'), $9, $10)
         returning *`,
        [req.userId, r.tanggal || null, r.produk, r.qty || null, r.satuan || null, r.harga, r.pelanggan || null, r.status || null, source, confidence]
      );
      inserted.push(result.rows[0]);
    }
    await client.query('commit');
    if (inserted.length > 0) logActivity(req.userId, 'transaction_bulk', `Mencatat ${inserted.length} transaksi via ${source}`);
    res.status(201).json(inserted);
  } catch (err) {
    await client.query('rollback');
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan transaksi.' });
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  await pool.query('delete from transactions where id = $1 and user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
});

export default router;
