import { Router } from 'express';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

// Laporan Laba Rugi (SAK EMKM style): Pendapatan Usaha vs Beban by kategori.
router.get('/laba-rugi', async (req, res) => {
  const { since, until } = req.query;
  if (!since || !until) return res.status(400).json({ error: 'Parameter since dan until wajib diisi.' });

  const pendapatanResult = await pool.query(
    `select coalesce(sum(harga), 0) as total, count(*) as jumlah_transaksi
     from transactions where user_id = $1 and tanggal >= $2 and tanggal <= $3`,
    [req.userId, since, until]
  );

  const bebanResult = await pool.query(
    `select kategori, coalesce(sum(jumlah), 0) as total
     from expenses where user_id = $1 and tanggal >= $2 and tanggal <= $3
     group by kategori order by total desc`,
    [req.userId, since, until]
  );

  const pendapatan = Number(pendapatanResult.rows[0].total);
  const jumlahTransaksi = Number(pendapatanResult.rows[0].jumlah_transaksi);
  const bebanByKategori = bebanResult.rows.map((r) => ({ kategori: r.kategori, total: Number(r.total) }));
  const totalBeban = bebanByKategori.reduce((a, b) => a + b.total, 0);

  res.json({
    since,
    until,
    pendapatan,
    jumlah_transaksi: jumlahTransaksi,
    beban_by_kategori: bebanByKategori,
    total_beban: totalBeban,
    laba_bersih: pendapatan - totalBeban,
  });
});

export default router;
