import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import recordingsRouter from './routes/recordings';
import stripeRouter from './routes/stripe';

const app = express();
const PORT = process.env.PORT || 3000;

// uploads directory creation removed for Vercel

app.use(cors());

// Mount Stripe router before express.json() so webhooks can use express.raw()
app.use('/api/stripe', stripeRouter);

app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  req.user = { id: (req.headers['x-user-id'] as string) || 'local-user' };
  next();
});

app.use('/api/recordings', recordingsRouter);

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Voxa API running on port ${PORT}`);
  });
}

export default app;
