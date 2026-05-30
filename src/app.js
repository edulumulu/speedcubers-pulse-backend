import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

// Routes will be mounted here in Phase 1+
// app.use('/api/v1', routes);

export default app;
