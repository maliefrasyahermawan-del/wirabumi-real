import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
app.use('/api', publicRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`WIRABUMI API listening on http://localhost:${port}`));
