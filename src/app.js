import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import routes from './presentation/routes/index.js';
import docsRoutes from './presentation/routes/docs.routes.js';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } from './infrastructure/config/constants.js';
import { corsOptions, trustProxySetting } from './infrastructure/config/security.js';
import { requestLogger } from './presentation/middleware/requestLogger.middleware.js';

const app = express();

app.set('trust proxy', trustProxySetting());
app.use(helmet());
app.use(cors(corsOptions()));

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0' });
});

app.use(docsRoutes);
app.use('/api/v1', routes);

export default app;
