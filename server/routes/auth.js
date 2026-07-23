import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';
import { signToken, requireAuth } from '../auth.js';

const router = Router();

// Case/whitespace-insensitive so "Nasi Goreng" at registration still matches
// "nasi goreng" typed later during reset.
function normalizeAnswer(s) {
  return s.trim().toLowerCase();
}

router.post('/register', async (req, res) => {
  const { email, password, businessName, businessCategory, kecamatan, securityFood, securityBand } = req.body || {};
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email dan kata sandi (min. 6 karakter) wajib diisi.' });
  }
  if (!securityFood?.trim() || !securityBand?.trim()) {
    return res.status(400).json({ error: 'Makanan favorit dan band favorit wajib diisi (dipakai untuk reset kata sandi nanti).' });
  }
  const client = await pool.connect();
  try {
    const existing = await client.query('select id from users where email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar. Silakan masuk.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const foodHash = await bcrypt.hash(normalizeAnswer(securityFood), 10);
    const bandHash = await bcrypt.hash(normalizeAnswer(securityBand), 10);
    await client.query('begin');
    const userResult = await client.query(
      'insert into users (email, password_hash, security_food_hash, security_band_hash) values ($1, $2, $3, $4) returning id',
      [email.toLowerCase(), passwordHash, foodHash, bandHash]
    );
    const userId = userResult.rows[0].id;
    await client.query(
      'insert into profiles (user_id, business_name, business_category, kecamatan) values ($1, $2, $3, $4)',
      [userId, businessName || 'Usaha Saya', businessCategory || 'Umum', kecamatan || null]
    );
    await client.query('commit');
    res.json({ token: signToken(userId) });
  } catch (err) {
    await client.query('rollback');
    console.error(err);
    res.status(500).json({ error: 'Gagal mendaftar. Coba lagi.' });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
  const result = await pool.query('select id, password_hash from users where email = $1', [email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email atau kata sandi salah.' });
  }
  res.json({ token: signToken(user.id) });
});

// No email/SMS provider wired up, so "forgot password" works via the two
// security-question answers set at registration instead of an emailed link.
// One-shot: correct answers + a new password reset it in a single request.
router.post('/reset-password', async (req, res) => {
  const { email, securityFood, securityBand, newPassword } = req.body || {};
  if (!email || !securityFood?.trim() || !securityBand?.trim() || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Semua kolom wajib diisi, kata sandi baru minimal 6 karakter.' });
  }

  const genericError = () => res.status(400).json({ error: 'Email atau jawaban tidak cocok.' });

  const result = await pool.query(
    'select id, security_food_hash, security_band_hash from users where email = $1',
    [email.toLowerCase()]
  );
  const user = result.rows[0];
  if (!user || !user.security_food_hash || !user.security_band_hash) return genericError();

  const foodOk = await bcrypt.compare(normalizeAnswer(securityFood), user.security_food_hash);
  const bandOk = await bcrypt.compare(normalizeAnswer(securityBand), user.security_band_hash);
  if (!foodOk || !bandOk) return genericError();

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('update users set password_hash = $1 where id = $2', [newHash, user.id]);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res) => {
  const result = await pool.query(
    `select u.id, u.email, p.business_name, p.business_category, p.business_address,
            p.kecamatan, p.phone, p.legal_nib, p.legal_pirt, p.legal_halal, p.avatar_url
     from users u join profiles p on p.user_id = u.id where u.id = $1`,
    [req.userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
  res.json(result.rows[0]);
});

export default router;
