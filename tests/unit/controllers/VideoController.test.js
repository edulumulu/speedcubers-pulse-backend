import { jest } from '@jest/globals';
import { VideoController } from '../../../src/presentation/controllers/VideoController.js';

const videoService = {
  ttlSeconds: 3600,
  createRtcToken: jest.fn(),
};
const videoQuotaService = {
  ensureAvailable: jest.fn(),
  consume: jest.fn(),
};

const makeController = () => new VideoController(videoService, videoQuotaService);

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('VideoController.createToken', () => {
  it('returns a video token response', async () => {
    const token = {
      appId: 'app-id',
      channelName: 'match_1',
      uid: 42,
      token: 'rtc-token',
      expiresAt: '2026-06-10T13:00:00.000Z',
    };
    const quota = {
      limitSeconds: 3600,
      usedSeconds: 60,
      remainingSeconds: 3540,
      resetAt: '2026-07-01T00:00:00.000Z',
      global: {
        limitSeconds: 480000,
        usedSeconds: 479700,
        remainingSeconds: 300,
        resetAt: '2026-07-01T00:00:00.000Z',
      },
    };
    videoQuotaService.ensureAvailable.mockResolvedValue(quota);
    videoService.createRtcToken.mockReturnValue(token);
    const response = res();

    await makeController().createToken({
      userId: 'auth-user-id',
      body: { channelName: 'match_1', uid: 42 },
    }, response);

    expect(videoService.createRtcToken)
      .toHaveBeenCalledWith({ userId: 'auth-user-id', channelName: 'match_1', ttlSeconds: 300 });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ ...token, quota });
  });

  it('reports video usage', async () => {
    const quota = {
      limitSeconds: 3600,
      usedSeconds: 120,
      remainingSeconds: 3480,
      resetAt: '2026-07-01T00:00:00.000Z',
      global: {
        limitSeconds: 480000,
        usedSeconds: 180,
        remainingSeconds: 479820,
        resetAt: '2026-07-01T00:00:00.000Z',
      },
    };
    videoQuotaService.consume.mockResolvedValue(quota);
    const response = res();

    await makeController().reportUsage({
      userId: 'auth-user-id',
      body: { seconds: 60 },
    }, response);

    expect(videoQuotaService.consume).toHaveBeenCalledWith('auth-user-id', 60);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ quota });
  });
});
