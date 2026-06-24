import { jest } from '@jest/globals';
import { VideoService } from '../../../src/application/services/VideoService.js';

const appId = '0123456789abcdef0123456789abcdef';
const appCertificate = 'abcdef0123456789abcdef0123456789';

function makeTokenBuilder(token = 'rtc-token') {
  return {
    buildTokenWithUid: jest.fn(() => token),
  };
}

describe('VideoService.createRtcToken', () => {
  it('builds an Agora RTC token response', () => {
    const tokenBuilder = makeTokenBuilder();
    const service = new VideoService({
      appId,
      appCertificate,
      now: () => 1781092800,
      tokenBuilder,
      role: 1,
      ttlSeconds: 1800,
    });

    const result = service.createRtcToken({
      userId: 'auth-user-id',
      channelName: 'match_abc-123',
      uid: 42,
    });

    expect(tokenBuilder.buildTokenWithUid)
      .toHaveBeenCalledWith(appId, appCertificate, 'match_abc-123', 42, 1, 1800, 1800);
    expect(result).toEqual({
      appId,
      channelName: 'match_abc-123',
      uid: 42,
      token: 'rtc-token',
      expiresAt: '2026-06-10T12:30:00.000Z',
    });
  });

  it('derives a stable numeric uid when none is provided', () => {
    const tokenBuilder = makeTokenBuilder();
    const service = new VideoService({
      appId,
      appCertificate,
      now: () => 1781092800,
      tokenBuilder,
    });

    const first = service.createRtcToken({ userId: 'auth-user-id', channelName: 'match_1' });
    const second = service.createRtcToken({ userId: 'auth-user-id', channelName: 'match_1' });

    expect(first.uid).toBe(second.uid);
    expect(Number.isInteger(first.uid)).toBe(true);
    expect(first.uid).toBeGreaterThanOrEqual(1);
    expect(first.uid).toBeLessThanOrEqual(2 ** 32 - 1);
  });

  it('throws when Agora credentials are missing', () => {
    const service = new VideoService({
      appId: '',
      appCertificate,
      tokenBuilder: makeTokenBuilder(),
    });

    expect(() => service.createRtcToken({ userId: 'auth-user-id', channelName: 'match_1' }))
      .toThrow('Agora credentials are not configured');
  });

  it('throws when Agora cannot build a token', () => {
    const service = new VideoService({
      appId,
      appCertificate,
      tokenBuilder: makeTokenBuilder(''),
    });

    expect(() => service.createRtcToken({ userId: 'auth-user-id', channelName: 'match_1' }))
      .toThrow('Agora credentials are invalid');
  });
});
