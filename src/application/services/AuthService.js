import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  BCRYPT_SALT_ROUNDS,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  LOGIN_LOCKOUT_ATTEMPTS,
  LOGIN_LOCKOUT_DURATION_MS,
  REDIS_LOGIN_FAIL_PREFIX,
  REDIS_LOGIN_LOCK_PREFIX,
} from '../../infrastructure/config/constants.js';
import redis from '../../infrastructure/config/redis.js';

export class AuthService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async register({ email, username, password }) {
    const [existingEmail, existingUsername] = await Promise.all([
      this.userRepository.findByEmail(email),
      this.userRepository.findByUsername(username),
    ]);

    if (existingEmail) {
      const err = new Error('Email already in use');
      err.code = 'EMAIL_TAKEN';
      err.status = 409;
      throw err;
    }

    if (existingUsername) {
      const err = new Error('Username already in use');
      err.code = 'USERNAME_TAKEN';
      err.status = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await this.userRepository.create({ email, username, passwordHash });

    return {
      user: user.toPrivate(),
      tokens: this.#generateTokens(user.id),
    };
  }

  async login({ email, password }) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    // Check lockout
    const lockKey = `${REDIS_LOGIN_LOCK_PREFIX}${email}`;
    const failKey = `${REDIS_LOGIN_FAIL_PREFIX}${email}`;
    const locked = await redis.get(lockKey);
    if (locked) {
      const err = new Error('Account temporarily locked due to too many failed attempts');
      err.code = 'ACCOUNT_LOCKED';
      err.status = 429;
      throw err;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const fails = await redis.incr(failKey);
      await redis.expire(failKey, Math.floor(LOGIN_LOCKOUT_DURATION_MS / 1000));
      if (fails >= LOGIN_LOCKOUT_ATTEMPTS) {
        await redis.set(lockKey, '1', 'EX', Math.floor(LOGIN_LOCKOUT_DURATION_MS / 1000));
        await redis.del(failKey);
      }
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

    // Clear fail counter on success
    await redis.del(failKey);

    return {
      user: user.toPrivate(),
      tokens: this.#generateTokens(user.id),
    };
  }

  refreshTokens(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      return this.#generateTokens(payload.sub);
    } catch {
      const err = new Error('Invalid refresh token');
      err.code = 'INVALID_TOKEN';
      err.status = 401;
      throw err;
    }
  }

  verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      const err = new Error('Invalid token');
      err.code = 'INVALID_TOKEN';
      err.status = 401;
      throw err;
    }
  }

  async forgotPassword(email) {
    const user = await this.userRepository.findByEmail(email);
    // Always return success to avoid user enumeration
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    await redis.set(`pwd_reset:${token}`, user.id, 'EX', 900); // 15 min TTL

    // No email service yet — log the token for dev use
    console.log(`[DEV] Password reset token for ${email}: ${token}`);
  }

  async resetPassword(token, newPassword) {
    const userId = await redis.get(`pwd_reset:${token}`);
    if (!userId) {
      const err = new Error('Invalid or expired reset token');
      err.code = 'INVALID_RESET_TOKEN';
      err.status = 400;
      throw err;
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await this.userRepository.update(userId, { password_hash: passwordHash });
    await redis.del(`pwd_reset:${token}`);
  }

  async isUsernameTaken(username) {
    const user = await this.userRepository.findByUsername(username);
    return !!user;
  }

  async isEmailTaken(email) {
    const user = await this.userRepository.findByEmail(email);
    return !!user;
  }

  #generateTokens(userId) {
    const accessToken = jwt.sign(
      { sub: userId },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    const refreshToken = jwt.sign(
      { sub: userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRES_IN },
    );

    return { accessToken, refreshToken };
  }
}
