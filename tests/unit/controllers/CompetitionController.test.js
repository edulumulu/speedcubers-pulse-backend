import { jest } from '@jest/globals';
import { CompetitionController } from '../../../src/presentation/controllers/CompetitionController.js';

const competitionService = {
  createRoom: jest.fn(),
  joinRoom: jest.fn(),
  getRoom: jest.fn(),
};

const makeController = () => new CompetitionController(competitionService);

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('CompetitionController', () => {
  it('returns created competition room', async () => {
    const room = { code: 'ABC234', channelName: 'match-abc234' };
    competitionService.createRoom.mockResolvedValue(room);
    const response = res();

    await makeController().createRoom({
      userId: 'host-id',
      body: { event: '3x3' },
    }, response);

    expect(competitionService.createRoom).toHaveBeenCalledWith({ userId: 'host-id', event: '3x3' });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ competition: room });
  });

  it('returns joined competition room', async () => {
    const room = { code: 'ABC234', status: 'active' };
    competitionService.joinRoom.mockResolvedValue(room);
    const response = res();

    await makeController().joinRoom({
      userId: 'guest-id',
      body: { code: 'ABC234' },
    }, response);

    expect(competitionService.joinRoom).toHaveBeenCalledWith({ userId: 'guest-id', code: 'ABC234' });
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ competition: room });
  });
});
