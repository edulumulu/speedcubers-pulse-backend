import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { BCRYPT_SALT_ROUNDS, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN } from '../../infrastructure/config/constants.js';

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

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      const err = new Error('Invalid credentials');
      err.code = 'INVALID_CREDENTIALS';
      err.status = 401;
      throw err;
    }

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
