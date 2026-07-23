import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import transactionsRoutes from './routes/transactions.js';
import expensesRoutes from './routes/expenses.js';
import reportRoutes from './routes/report.js';
import scoreRoutes from './routes/score.js';
import kurRoutes from './routes/kur.js';
import chatRoutes from './routes/chat.js';
import feedbackRoutes from './routes/feedback.js';
import notificationsRoutes from './routes/notifications.js';
import questsRoutes from './routes/quests.js';
import publicRoutes from './routes/public.js';
import parseRoutes from './routes/parse.js';
import adminRoutes from './routes/admin.js';
import dinkopRoutes from './routes/dinkop.js';
import bankRoutes from './routes/bank.js';
import insightRoutes from './routes/insight.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/kur', kurRoutes);
app.use('/api/chat-messages', chatRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/quests', questsRoutes);
app.use('/api/parse', parseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dinkop', dinkopRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/insight', insightRoutes);
app.use('/api', publicRoutes);

app.use((err, req, res, _next) => {
  console.error(err);
  // Fire-and-forget: real server errors feed the Super Admin System page's
  // Error Log - never fabricated, only ever written when something actually
  // threw, and never allowed to affect the response already being sent.
  pool.query('insert into error_log (route, message) values ($1, $2)', [req.originalUrl, err.message])
    .catch((logErr) => console.error('[errorLog] gagal mencatat:', logErr.message));
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`WIRABUMI API listening on http://localhost:${port}`));
