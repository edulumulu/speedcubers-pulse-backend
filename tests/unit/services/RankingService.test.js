import { jest } from '@jest/globals';
import { calculateElo, RankingService } from '../../../src/application/services/RankingService.js';

// --- Pure Elo calculation tests ---

describe('calculateElo', () => {
  test('equal Elo players — winner gains half K, loser loses half K', () => {
    const { newEloWinner, newEloLoser } = calculateElo(1000, 1000);
    expect(newEloWinner).toBe(1016);
    expect(newEloLoser).toBe(984);
  });

  test('strong favorite wins — small gain', () => {
    const { newEloWinner } = calculateElo(1400, 1000);
    expect(newEloWinner).toBeGreaterThan(1400);
    expect(newEloWinner - 1400).toBeLessThan(10);
  });

  test('underdog wins — large gain', () => {
    const { newEloWinner } = calculateElo(1000, 1400);
    expect(newEloWinner - 1000).toBeGreaterThan(25);
  });

  test('is zero-sum: total Elo is preserved', () => {
    const eloA = 1150;
    const eloB = 950;
    const { newEloWinner, newEloLoser } = calculateElo(eloA, eloB);
    expect(newEloWinner + newEloLoser).toBe(eloA + eloB);
  });

  test('handles edge case: very large Elo difference — still zero-sum', () => {
    const { newEloWinner, newEloLoser } = calculateElo(2000, 800);
    // Favorite is so dominant that expected score ≈ 1, delta ≈ 0 after rounding
    expect(newEloWinner + newEloLoser).toBe(2800);
    expect(newEloLoser).toBeLessThanOrEqual(800); // delta may round to 0
  });
});

// --- RankingService unit tests (mocked dependencies) ---

function makeRankingRow(overrides = {}) {
  return {
    event: '3x3',
    elo: 1000,
    wins: 0,
    losses: 0,
    dnf_count: 0,
    total_matches: 0,
    pb_time: null,
    average_time: null,
    ...overrides,
  };
}

function makeMockRepo(winnerRow, loserRow) {
  return {
    findByUserId: jest.fn(async (id) =>
      id === 'winner' ? winnerRow : id === 'loser' ? loserRow : null,
    ),
    upsert: jest.fn(async (userId, fields, event = '3x3') => ({ user_id: userId, event, ...fields })),
    findTop100: jest.fn(async () => []),
  };
}

function makeMockCache() {
  return {
    getRanking: jest.fn(async () => null),
    setRanking: jest.fn(async () => {}),
    invalidateRanking: jest.fn(async () => {}),
    getUserStats: jest.fn(async () => null),
    setUserStats: jest.fn(async () => {}),
    invalidateUserStats: jest.fn(async () => {}),
    getWcaRanking: jest.fn(async () => null),
    setWcaRanking: jest.fn(async () => {}),
  };
}

describe('RankingService.processMatchResult', () => {
  test('updates winner wins +1, loser losses +1, total_matches +1 each', async () => {
    const winnerRow = makeRankingRow({ elo: 1000 });
    const loserRow = makeRankingRow({ elo: 1000 });
    const repo = makeMockRepo(winnerRow, loserRow);
    const cache = makeMockCache();
    const service = new RankingService(repo, cache);

    await service.processMatchResult({
      winnerId: 'winner',
      loserId: 'loser',
      winnerTime: 10.5,
      loserTime: 12.3,
      loserIsDnf: false,
      event: '2x2',
    });

    expect(repo.findByUserId).toHaveBeenCalledWith('winner', '2x2');
    expect(repo.findByUserId).toHaveBeenCalledWith('loser', '2x2');
    expect(repo.upsert).toHaveBeenCalledWith('winner', expect.any(Object), '2x2');
    expect(repo.upsert).toHaveBeenCalledWith('loser', expect.any(Object), '2x2');
    const winnerUpsert = repo.upsert.mock.calls.find(([id]) => id === 'winner')[1];
    const loserUpsert = repo.upsert.mock.calls.find(([id]) => id === 'loser')[1];

    expect(winnerUpsert.wins).toBe(1);
    expect(winnerUpsert.losses).toBe(0);
    expect(winnerUpsert.total_matches).toBe(1);
    expect(loserUpsert.losses).toBe(1);
    expect(loserUpsert.wins).toBe(0);
    expect(loserUpsert.total_matches).toBe(1);
  });

  test('DNF loser gets dnf_count +1, no pb or average update for loser', async () => {
    const winnerRow = makeRankingRow({ elo: 1000 });
    const loserRow = makeRankingRow({ elo: 1000, pb_time: 15.0, average_time: 18.0 });
    const repo = makeMockRepo(winnerRow, loserRow);
    const cache = makeMockCache();
    const service = new RankingService(repo, cache);

    await service.processMatchResult({
      winnerId: 'winner',
      loserId: 'loser',
      winnerTime: 10.5,
      loserTime: null,
      loserIsDnf: true,
    });

    const loserUpsert = repo.upsert.mock.calls.find(([id]) => id === 'loser')[1];
    expect(loserUpsert.dnf_count).toBe(1);
    expect(loserUpsert.pb_time).toBe(15.0);       // unchanged
    expect(loserUpsert.average_time).toBe(18.0);  // unchanged
  });

  test('pb_time is updated when winner posts a better time', async () => {
    const winnerRow = makeRankingRow({ elo: 1000, pb_time: 12.0 });
    const loserRow = makeRankingRow({ elo: 1000 });
    const repo = makeMockRepo(winnerRow, loserRow);
    const cache = makeMockCache();
    const service = new RankingService(repo, cache);

    await service.processMatchResult({
      winnerId: 'winner',
      loserId: 'loser',
      winnerTime: 9.5,
      loserTime: 11.0,
      loserIsDnf: false,
    });

    const winnerUpsert = repo.upsert.mock.calls.find(([id]) => id === 'winner')[1];
    expect(winnerUpsert.pb_time).toBe(9.5);
  });

  test('pb_time is NOT updated when winner posts a worse time', async () => {
    const winnerRow = makeRankingRow({ elo: 1000, pb_time: 8.0 });
    const loserRow = makeRankingRow({ elo: 1000 });
    const repo = makeMockRepo(winnerRow, loserRow);
    const cache = makeMockCache();
    const service = new RankingService(repo, cache);

    await service.processMatchResult({
      winnerId: 'winner',
      loserId: 'loser',
      winnerTime: 11.0,
      loserTime: 14.0,
      loserIsDnf: false,
    });

    const winnerUpsert = repo.upsert.mock.calls.find(([id]) => id === 'winner')[1];
    expect(winnerUpsert.pb_time).toBe(8.0);
  });

  test('invalidates cache for both users after match', async () => {
    const repo = makeMockRepo(makeRankingRow(), makeRankingRow());
    const cache = makeMockCache();
    const service = new RankingService(repo, cache);

    await service.processMatchResult({
      winnerId: 'winner',
      loserId: 'loser',
      winnerTime: 10.0,
      loserTime: 12.0,
      loserIsDnf: false,
    });

    expect(cache.invalidateUserStats).toHaveBeenCalledWith('winner', '3x3');
    expect(cache.invalidateUserStats).toHaveBeenCalledWith('loser', '3x3');
    expect(cache.invalidateRanking).toHaveBeenCalledWith('3x3');
  });

  test('invalidates only the ranking cache for the played event', async () => {
    const repo = makeMockRepo(makeRankingRow({ event: '2x2' }), makeRankingRow({ event: '2x2' }));
    const cache = makeMockCache();
    const service = new RankingService(repo, cache);

    await service.processMatchResult({
      winnerId: 'winner',
      loserId: 'loser',
      winnerTime: 4.0,
      loserTime: 5.0,
      loserIsDnf: false,
      event: '2x2',
    });

    expect(cache.invalidateUserStats).toHaveBeenCalledWith('winner', '2x2');
    expect(cache.invalidateUserStats).toHaveBeenCalledWith('loser', '2x2');
    expect(cache.invalidateRanking).toHaveBeenCalledTimes(1);
    expect(cache.invalidateRanking).toHaveBeenCalledWith('2x2');
  });
});

describe('RankingService.getTop100', () => {
  test('returns cached result without hitting repo', async () => {
    const repo = makeMockRepo(makeRankingRow(), makeRankingRow());
    const cache = makeMockCache();
    const cachedData = [{ position: 1, username: 'top' }];
    cache.getRanking.mockResolvedValueOnce(cachedData);

    const service = new RankingService(repo, cache);
    const result = await service.getTop100('3x3');

    expect(result).toEqual(cachedData);
    expect(repo.findTop100).not.toHaveBeenCalled();
  });

  test('loads uncached ranking for the requested event', async () => {
    const repo = makeMockRepo(makeRankingRow(), makeRankingRow());
    const cache = makeMockCache();
    repo.findTop100.mockResolvedValueOnce([]);

    const service = new RankingService(repo, cache);
    await service.getTop100('pyraminx');

    expect(repo.findTop100).toHaveBeenCalledWith('pyraminx');
    expect(cache.setRanking).toHaveBeenCalledWith('pyraminx', []);
  });
});
