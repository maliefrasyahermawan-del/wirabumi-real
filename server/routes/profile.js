import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();
router.use(requireAuth);

const EDITABLE_FIELDS = ['business_name', 'business_category', 'business_address', 'kecamatan', 'phone', 'legal_nib', 'legal_pirt', 'legal_halal'];

const AVATAR_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads', 'avatars');
const AVATAR_MIME_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: AVATAR_DIR,
    filename: (req, file, cb) => cb(null, `${req.userId}-${Date.now()}${AVATAR_MIME_EXT[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, Object.hasOwn(AVATAR_MIME_EXT, file.mimetype)),
});

router.patch('/', async (req, res) => {
  const updates = Object.entries(req.body || {}).filter(([k]) => EDITABLE_FIELDS.includes(k));
  if (updates.length === 0) return res.status(400).json({ error: 'Tidak ada field valid untuk diperbarui.' });

  const setClause = updates.map(([k], i) => `${k} = $${i + 2}`).join(', ');
  const values = updates.map(([, v]) => v);
  const result = await pool.query(
    `update profiles set ${setClause} where user_id = $1 returning *`,
    [req.userId, ...values]
  );
  res.json(result.rows[0]);
});

router.post('/avatar', (req, res) => {
  upload.single('avatar')(req, res, async (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Ukuran gambar maksimal 2MB.' });
    }
    if (err) return res.status(500).json({ error: 'Gagal mengunggah gambar.' });
    if (!req.file) return res.status(400).json({ error: 'Format gambar harus JPG, PNG, atau WEBP.' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    const prev = await pool.query('select avatar_url from profiles where user_id = $1', [req.userId]);
    const result = await pool.query(
      'update profiles set avatar_url = $1 where user_id = $2 returning *',
      [avatarUrl, req.userId]
    );

    const oldUrl = prev.rows[0]?.avatar_url;
    if (oldUrl) {
      const oldPath = path.join(AVATAR_DIR, path.basename(oldUrl));
      fs.unlink(oldPath).catch(() => {});
    }

    res.json(result.rows[0]);
  });
});

export default router;
