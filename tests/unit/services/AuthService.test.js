import { jest } from '@jest/globals';
import { AuthService } from '../../../src/application/services/AuthService.js';

const mockUserRepository = {
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  create: jest.fn(),
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
