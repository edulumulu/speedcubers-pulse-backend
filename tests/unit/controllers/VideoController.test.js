import { jest } from '@jest/globals';
import { VideoController } from '../../../src/presentation/controllers/VideoController.js';

const videoService = {
  createRtcToken: jest.fn(),
};

const makeController = () => new VideoController(videoService);

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
    videoService.createRtcToken.mockReturnValue(token);
    const response = res();

    await makeController().createToken({
      userId: 'auth-user-id',
      body: { channelName: 'match_1', uid: 42 },
    }, response);

    expect(videoService.createRtcToken)
      .toHaveBeenCalledWith({ userId: 'auth-user-id', channelName: 'match_1' });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(token);
  });
});
