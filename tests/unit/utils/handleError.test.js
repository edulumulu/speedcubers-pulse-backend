import { jest } from '@jest/globals';

const loggerError = jest.fn();

jest.unstable_mockModule('../../../src/infrastructure/config/logger.js', () => ({
  logger: {
    error: loggerError,
  },
}));

const { handleError } = await import('../../../src/presentation/utils/handleError.js');

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('handleError', () => {
  it('returns app errors without logging them as internal errors', () => {
    const response = res();
    const err = new Error('Invalid credentials');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';

    handleError(err, response);

    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',
    });
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('logs unexpected errors while keeping the public response generic', () => {
    const response = res();
    const err = new Error('database unavailable');

    handleError(err, response);

    expect(loggerError).toHaveBeenCalledWith('internal_error', {
      message: 'database unavailable',
      stack: err.stack,
    });
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
