import jwt from 'jsonwebtoken';
import { pool } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('Missing JWT_SECRET in .env');

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Belum masuk / token tidak ada.' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Sesi tidak valid, silakan masuk lagi.' });
  }
}

// Role is deliberately NOT embedded in the JWT (tokens live 30 days - baking
// role in would mean a promotion/demotion doesn't take effect until the
// token expires). Looked up fresh from the DB on every request instead; must
// run after requireAuth (needs req.userId). Generic error message on
// mismatch - doesn't reveal which roles would have been allowed.
export function requireRole(...allowedRoles) {
  return async function (req, res, next) {
    const result = await pool.query('select role from users where id = $1', [req.userId]);
    const role = result.rows[0]?.role;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Kamu tidak punya akses ke halaman ini.' });
    }
    req.userRole = role;
    next();
  };
}
