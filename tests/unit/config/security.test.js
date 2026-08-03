import { jest } from '@jest/globals';
import {
  allowedOrigins,
  corsOriginDelegate,
  refreshCookieOptions,
  trustProxySetting,
} from '../../../src/infrastructure/config/security.js';

describe('security config', () => {
  it('uses the local frontend origin outside production when ALLOWED_ORIGINS is missing', () => {
    expect(allowedOrigins({ env: 'development', rawOrigins: undefined })).toEqual([
      'http://localhost:5173',
    ]);
  });

  it('requires explicit allowed origins in production', () => {
    expect(() => allowedOrigins({ env: 'production', rawOrigins: undefined }))
      .toThrow('ALLOWED_ORIGINS must be set in production');
  });

  it('rejects wildcard CORS origins in production', () => {
    expect(() => allowedOrigins({ env: 'production', rawOrigins: '*' }))
      .toThrow('Wildcard CORS origin is not allowed in production');
  });

  it('allows configured origins and rejects unknown browser origins', () => {
    const delegate = corsOriginDelegate({
      env: 'production',
      rawOrigins: 'https://app.speedcubers.test',
    });
    const allowedCallback = jest.fn();
    const rejectedCallback = jest.fn();

    delegate('https://app.speedcubers.test', allowedCallback);
    delegate('https://evil.example', rejectedCallback);

    expect(allowedCallback).toHaveBeenCalledWith(null, true);
    expect(rejectedCallback.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('builds secure refresh cookie options for production', () => {
    expect(refreshCookieOptions({
      env: 'production',
      domain: '.speedcubers.test',
      maxAge: 1000,
    })).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 1000,
      domain: '.speedcubers.test',
      path: '/api/v1/auth',
    });
  });

  it('trusts one proxy by default only in production', () => {
    expect(trustProxySetting({ env: 'production', rawHops: undefined })).toBe(1);
    expect(trustProxySetting({ env: 'development', rawHops: undefined })).toBe(false);
    expect(trustProxySetting({ env: 'production', rawHops: '2' })).toBe(2);
  });
});
