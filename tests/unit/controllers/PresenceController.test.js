import { jest } from '@jest/globals';
import { PresenceController } from '../../../src/presentation/controllers/PresenceController.js';

const presenceService = {
  listOnlineUsers: jest.fn(),
};

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('PresenceController.getOnlineUsers', () => {
  it('returns online users', async () => {
    const users = [{ id: 'user-1', username: 'alice' }];
    presenceService.listOnlineUsers.mockResolvedValue(users);
    const response = res();

    await new PresenceController(presenceService).getOnlineUsers({}, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ users });
  });

  it('returns 500 on unexpected errors', async () => {
    presenceService.listOnlineUsers.mockRejectedValue(new Error('redis down'));
    const response = res();

    await new PresenceController(presenceService).getOnlineUsers({}, response);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});
