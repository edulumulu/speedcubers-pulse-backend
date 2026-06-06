import { jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/infrastructure/config/redis.js', () => ({
  default: { set: jest.fn(), get: jest.fn(), del: jest.fn() },
}));

const { AuthService } = await import('../../../src/application/services/AuthService.js');
const { default: redis } = await import('../../../src/infrastructure/config/redis.js');

const mockUserRepository = {
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const makeService = () => new AuthService(mockUserRepository);

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
});

describe('AuthService.register', () => {
  it('creates a user and returns tokens when email and username are free', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.findByUsername.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue({
      id: 'uuid-1',
      toPrivate: () => ({ id: 'uuid-1', email: 'a@b.com', username: 'alice' }),
    });

    const svc = makeService();
    const result = await svc.register({ email: 'a@b.com', username: 'alice', password: 'Pass123!' });

    expect(result.user.email).toBe('a@b.com');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
  });

  it('throws EMAIL_TAKEN when email is already registered', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'existing' });
    mockUserRepository.findByUsername.mockResolvedValue(null);

    const svc = makeService();
    await expect(svc.register({ email: 'taken@b.com', username: 'alice', password: 'Pass123!' }))
      .rejects.toMatchObject({ code: 'EMAIL_TAKEN', status: 409 });
  });

  it('throws USERNAME_TAKEN when username is already registered', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.findByUsername.mockResolvedValue({ id: 'existing' });

    const svc = makeService();
    await expect(svc.register({ email: 'a@b.com', username: 'taken', password: 'Pass123!' }))
      .rejects.toMatchObject({ code: 'USERNAME_TAKEN', status: 409 });
  });

  it('stores a bcrypt hash, not the plain password', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.findByUsername.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue({
      id: 'uuid-1',
      toPrivate: () => ({ id: 'uuid-1', email: 'a@b.com', username: 'alice' }),
    });

    const svc = makeService();
    await svc.register({ email: 'a@b.com', username: 'alice', password: 'Pass123!' });

    const createdWith = mockUserRepository.create.mock.calls[0][0];
    expect(createdWith.passwordHash).not.toBe('Pass123!');
    expect(createdWith.passwordHash).toMatch(/^\$2b\$/);
  });
});

describe('AuthService.login', () => {
  it('returns user and tokens for valid credentials', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Pass123!', 12);

    mockUserRepository.findByEmail.mockResolvedValue({
      id: 'uuid-1',
      passwordHash: hash,
      toPrivate: () => ({ id: 'uuid-1', email: 'a@b.com', username: 'alice' }),
    });

    const svc = makeService();
    const result = await svc.login({ email: 'a@b.com', password: 'Pass123!' });

    expect(result.user.email).toBe('a@b.com');
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('throws INVALID_CREDENTIALS when user does not exist', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const svc = makeService();
    await expect(svc.login({ email: 'nope@b.com', password: 'Pass123!' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });

  it('throws INVALID_CREDENTIALS when password is wrong', async () => {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('Correct123!', 12);

    mockUserRepository.findByEmail.mockResolvedValue({
      id: 'uuid-1',
      passwordHash: hash,
      toPrivate: () => ({}),
    });

    const svc = makeService();
    await expect(svc.login({ email: 'a@b.com', password: 'Wrong123!' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
  });
});

describe('AuthService.refreshTokens', () => {
  it('returns new tokens for a valid refresh token', async () => {
    const svc = makeService();
    const jwt = await import('jsonwebtoken');
    const refreshToken = jwt.default.sign({ sub: 'uuid-1' }, 'test-refresh-secret', { expiresIn: '7d' });

    const tokens = svc.refreshTokens(refreshToken);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
  });

  it('throws INVALID_TOKEN for an expired or tampered refresh token', () => {
    const svc = makeService();
    expect(() => svc.refreshTokens('bad.token.here'))
      .toThrow(expect.objectContaining({ code: 'INVALID_TOKEN', status: 401 }));
  });
});

describe('AuthService.forgotPassword', () => {
  it('stores a reset token in redis for known email', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'uuid-1' });
    redis.set.mockResolvedValue('OK');

    const svc = makeService();
    await svc.forgotPassword('a@b.com');

    expect(redis.set).toHaveBeenCalledTimes(1);
    const [key, value, ex, ttl] = redis.set.mock.calls[0];
    expect(key).toMatch(/^pwd_reset:/);
    expect(value).toBe('uuid-1');
    expect(ex).toBe('EX');
    expect(ttl).toBe(900);
  });

  it('does nothing for unknown email (no enumeration)', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);

    const svc = makeService();
    await svc.forgotPassword('nobody@b.com');

    expect(redis.set).not.toHaveBeenCalled();
  });
});

describe('AuthService.isUsernameTaken', () => {
  it('returns true when username exists', async () => {
    mockUserRepository.findByUsername.mockResolvedValue({ id: 'uuid-1' });
    const svc = makeService();
    await expect(svc.isUsernameTaken('takenuser')).resolves.toBe(true);
  });

  it('returns false when username does not exist', async () => {
    mockUserRepository.findByUsername.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.isUsernameTaken('freeuser')).resolves.toBe(false);
  });
});

describe('AuthService.isEmailTaken', () => {
  it('returns true when email exists', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({ id: 'uuid-1' });
    const svc = makeService();
    await expect(svc.isEmailTaken('taken@b.com')).resolves.toBe(true);
  });

  it('returns false when email does not exist', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    const svc = makeService();
    await expect(svc.isEmailTaken('free@b.com')).resolves.toBe(false);
  });
});

describe('AuthService.resetPassword', () => {
  it('updates password and deletes token when token is valid', async () => {
    redis.get.mockResolvedValue('uuid-1');
    redis.del.mockResolvedValue(1);
    mockUserRepository.update.mockResolvedValue(true);

    const svc = makeService();
    await svc.resetPassword('valid-token', 'NewPass123!');

    expect(mockUserRepository.update).toHaveBeenCalledWith('uuid-1', expect.objectContaining({ password_hash: expect.stringMatching(/^\$2b\$/) }));
    expect(redis.del).toHaveBeenCalledWith('pwd_reset:valid-token');
  });

  it('throws INVALID_RESET_TOKEN when token is not in redis', async () => {
    redis.get.mockResolvedValue(null);

    const svc = makeService();
    await expect(svc.resetPassword('bad-token', 'NewPass123!'))
      .rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN', status: 400 });
  });
});
