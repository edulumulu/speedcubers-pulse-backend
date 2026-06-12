import { logger } from '../../infrastructure/config/logger.js';

export function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info('http_request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      userId: req.userId ?? null,
      ip: req.ip,
      ms,
    });
  });

  next();
}
