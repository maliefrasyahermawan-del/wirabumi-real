import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import transactionsRoutes from './routes/transactions.js';
import scoreRoutes from './routes/score.js';
import kurRoutes from './routes/kur.js';
import chatRoutes from './routes/chat.js';
import publicRoutes from './routes/public.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/kur', kurRoutes);
app.use('/api/chat-messages', chatRoutes);
app.use('/api', publicRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`WIRABUMI API listening on http://localhost:${port}`));
