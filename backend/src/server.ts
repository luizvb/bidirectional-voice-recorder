import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import recordingsRouter from './routes/recordings';
import stripeRouter from './routes/stripe';
import { requireAuth } from './middleware/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// uploads directory creation removed for Vercel

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Origin is not allowed.'));
  },
  allowedHeaders: ['Authorization', 'Content-Type', 'x-user-id']
}));

// Mount Stripe router before express.json() so webhooks can use express.raw()
app.use('/api/stripe', stripeRouter);

app.use(express.json());

app.use('/api/recordings', requireAuth, recordingsRouter);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Voxa API running on port ${PORT}`);
  });
}

export default app;
