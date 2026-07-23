import { pool } from '../db.js';

// Fire-and-forget activity logging for the admin Monitoring page
// (server/routes/admin.js). Never throws — a logging failure must never
// break the primary request it's attached to, same resilience philosophy as
// the Groq LLM calls in this directory. role_at_time is resolved via a join
// so callers never need to know/fetch the user's role themselves.
export async function logActivity(userId, actionType, description) {
  try {
    await pool.query(
      `insert into activity_log (user_id, role_at_time, action_type, description)
       select $1, u.role, $2, $3 from users u where u.id = $1`,
      [userId, actionType, description]
    );
  } catch (err) {
    console.error('[activityLog] gagal mencatat aktivitas:', err.message);
  }
}
