import { jest } from '@jest/globals';
import { RankingController } from '../../../src/presentation/controllers/RankingController.js';

const mockRankingService = {
  getTop100: jest.fn(),
  getUserStats: jest.fn(),
};

const makeController = () => new RankingController(mockRankingService);

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('RankingController.getTop100', () => {
  it('returns 200 with ranking data on success', async () => {
    const ranking = [{ position: 1, username: 'top', elo: 1200 }];
    mockRankingService.getTop100.mockResolvedValue(ranking);
    const req = { query: { event: '3x3' } };
    const response = res();

    await makeController().getTop100(req, response);

    expect(mockRankingService.getTop100).toHaveBeenCalledWith('3x3');
    expect(response.json).toHaveBeenCalledWith({ event: '3x3', ranking });
  });

  it('returns 200 with default event when none provided', async () => {
    mockRankingService.getTop100.mockResolvedValue([]);
    const req = { query: {} };
    const response = res();

    await makeController().getTop100(req, response);

    expect(response.json).toHaveBeenCalledWith({ event: '3x3', ranking: [] });
  });

  it('returns 400 for invalid event', async () => {
    const req = { query: { event: 'invalid' } };
    const response = res();

    await makeController().getTop100(req, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockRankingService.getTop100).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    mockRankingService.getTop100.mockRejectedValue(new Error('DB error'));
    const req = { query: { event: '3x3' } };
    const response = res();

    await makeController().getTop100(req, response);

    expect(response.status).toHaveBeenCalledWith(500);
  });
});

describe('RankingController.getUserStats', () => {
  it('returns 200 with stats on success', async () => {
    const stats = { elo: 1000, wins: 5, losses: 3 };
    mockRankingService.getUserStats.mockResolvedValue(stats);
    const req = { query: { event: '3x3' }, params: { userId: 'uid-1' } };
    const response = res();

    await makeController().getUserStats(req, response);

    expect(mockRankingService.getUserStats).toHaveBeenCalledWith('uid-1', '3x3');
    expect(response.json).toHaveBeenCalledWith(stats);
  });

  it('returns 404 when stats not found', async () => {
    mockRankingService.getUserStats.mockResolvedValue(null);
    const req = { query: {}, params: { userId: 'uid-unknown' } };
    const response = res();

    await makeController().getUserStats(req, response);

    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 for invalid event', async () => {
    const req = { query: { event: 'bad' }, params: { userId: 'uid-1' } };
    const response = res();

    await makeController().getUserStats(req, response);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(mockRankingService.getUserStats).not.toHaveBeenCalled();
  });

  it('returns 500 when service throws', async () => {
    mockRankingService.getUserStats.mockRejectedValue(new Error('DB error'));
    const req = { query: { event: '3x3' }, params: { userId: 'uid-1' } };
    const response = res();

    await makeController().getUserStats(req, response);

    expect(response.status).toHaveBeenCalledWith(500);
  });
});
