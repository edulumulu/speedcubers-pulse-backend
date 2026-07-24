import { logger } from '../../infrastructure/config/logger.js';

export function handleError(err, res) {
  if (err.status) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }

  logger.error('internal_error', {
    message: err?.message,
    stack: err?.stack,
  });

  return res.status(500).json({ error: 'Internal server error' });
}
