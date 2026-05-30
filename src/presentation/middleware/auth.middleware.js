import { AuthService } from '../../application/services/AuthService.js';
import { UserRepository } from '../../infrastructure/repositories/UserRepository.js';
import { models } from '../../infrastructure/database/models/index.js';

const authService = new AuthService(new UserRepository(models));

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const token = header.slice(7);

  try {
    const payload = authService.verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
