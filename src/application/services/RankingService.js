import { fetchWcaEventRanking } from '../../infrastructure/external_api/WcaClient.js';

const ELO_K = 32;
const ELO_START = 1000;

/**
 * Calculates the expected win probability for player A against player B.
 */
function expectedScore(eloA, eloB) {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Returns new Elo values for both players after a match.
 * @param {number} eloWinner
 * @param {number} eloLoser
 * @returns {{ newEloWinner: number, newEloLoser: number }}
 */
export function calculateElo(eloWinner, eloLoser) {
  const eW = expectedScore(eloWinner, eloLoser);
  const eL = expectedScore(eloLoser, eloWinner);
  return {
    newEloWinner: Math.round(eloWinner + ELO_K * (1 - eW)),
    newEloLoser: Math.round(eloLoser + ELO_K * (0 - eL)),
  };
}

export class RankingService {
  constructor(rankingRepository, cacheService) {
    this.rankingRepository = rankingRepository;
    this.cacheService = cacheService;
  }

  /**
   * Returns or creates a ranking row for a user.
   */
  async getOrCreate(userId) {
    let row = await this.rankingRepository.findByUserId(userId);
    if (!row) {
      row = await this.rankingRepository.upsert(userId, { elo: ELO_START });
    }
    return row;
  }

  /**
   * Processes a finished match result and updates both players' Elo.
   * @param {{ winnerId, loserId, winnerTime, loserTime, loserIsDnf }}
   */
  async processMatchResult({ winnerId, loserId, winnerTime, loserTime, loserIsDnf }) {
    const [winnerRanking, loserRanking] = await Promise.all([
      this.getOrCreate(winnerId),
      this.getOrCreate(loserId),
    ]);

    const { newEloWinner, newEloLoser } = calculateElo(winnerRanking.elo, loserRanking.elo);

    const winnerPb = this._newPb(winnerRanking.pb_time, winnerTime);
    const loserPb = loserIsDnf ? loserRanking.pb_time : this._newPb(loserRanking.pb_time, loserTime);

    const winnerAvg = this._newAverage(winnerRanking.average_time, winnerTime, winnerRanking.wins);
    const loserAvg = loserIsDnf
      ? loserRanking.average_time
      : this._newAverage(loserRanking.average_time, loserTime, loserRanking.total_matches - loserRanking.dnf_count);

    await Promise.all([
      this.rankingRepository.upsert(winnerId, {
        elo: newEloWinner,
        wins: winnerRanking.wins + 1,
        losses: winnerRanking.losses,
        dnf_count: winnerRanking.dnf_count,
        total_matches: winnerRanking.total_matches + 1,
        pb_time: winnerPb,
        average_time: winnerAvg,
      }),
      this.rankingRepository.upsert(loserId, {
        elo: newEloLoser,
        wins: loserRanking.wins,
        losses: loserRanking.losses + 1,
        dnf_count: loserRanking.dnf_count + (loserIsDnf ? 1 : 0),
        total_matches: loserRanking.total_matches + 1,
        pb_time: loserPb,
        average_time: loserAvg,
      }),
    ]);

    // Invalidate caches for both users and all events (blanket invalidation)
    await Promise.all([
      this.cacheService.invalidateUserStats(winnerId),
      this.cacheService.invalidateUserStats(loserId),
      this._invalidateAllEventRankings(),
    ]);

    return { newEloWinner, newEloLoser };
  }

  /**
   * Returns top 100 players for a given event, with WCA official ranking if available.
   */
  async getTop100(event = '3x3') {
    const cached = await this.cacheService.getRanking(event);
    if (cached) return cached;

    const rows = await this.rankingRepository.findTop100();

    const result = await Promise.all(
      rows.map(async (row, index) => {
        const wcaId = row.user?.wcaProfile?.wca_id ?? null;
        let wcaRanking = null;

        if (wcaId) {
          wcaRanking = await this.cacheService.getWcaRanking(row.user_id, event);
          if (!wcaRanking) {
            wcaRanking = await fetchWcaEventRanking(wcaId, event);
            if (wcaRanking) {
              await this.cacheService.setWcaRanking(row.user_id, event, wcaRanking);
            }
          }
        }

        return {
          position: index + 1,
          userId: row.user_id,
          username: row.user.username,
          elo: row.elo,
          wins: row.wins,
          losses: row.losses,
          dnf_count: row.dnf_count,
          total_matches: row.total_matches,
          pb_time: row.pb_time,
          average_time: row.average_time,
          wca_id: wcaId,
          wca_ranking: wcaRanking,
        };
      }),
    );

    await this.cacheService.setRanking(event, result);
    return result;
  }

  /**
   * Returns stats for a single user, with WCA ranking if available.
   */
  async getUserStats(userId, event = '3x3') {
    const cached = await this.cacheService.getUserStats(userId);
    if (cached) return cached;

    const row = await this.rankingRepository.findByUserId(userId);
    if (!row) return null;

    const wcaId = row.user?.wcaProfile?.wca_id ?? null;
    let wcaRanking = null;

    if (wcaId) {
      wcaRanking = await this.cacheService.getWcaRanking(userId, event);
      if (!wcaRanking) {
        wcaRanking = await fetchWcaEventRanking(wcaId, event);
        if (wcaRanking) {
          await this.cacheService.setWcaRanking(userId, event, wcaRanking);
        }
      }
    }

    const stats = {
      userId,
      elo: row.elo,
      wins: row.wins,
      losses: row.losses,
      dnf_count: row.dnf_count,
      total_matches: row.total_matches,
      pb_time: row.pb_time,
      average_time: row.average_time,
      wca_id: wcaId,
      wca_ranking: wcaRanking,
    };

    await this.cacheService.setUserStats(userId, stats);
    return stats;
  }

  // --- helpers ---

  _newPb(currentPb, newTime) {
    if (newTime === null || newTime === undefined) return currentPb;
    if (currentPb === null || currentPb === undefined) return newTime;
    return Math.min(currentPb, newTime);
  }

  _newAverage(currentAvg, newTime, validMatchCount) {
    if (newTime === null || newTime === undefined) return currentAvg;
    if (currentAvg === null || currentAvg === undefined || validMatchCount === 0) return newTime;
    // Running cumulative average
    return (currentAvg * validMatchCount + newTime) / (validMatchCount + 1);
  }

  async _invalidateAllEventRankings() {
    const events = ['3x3', '2x2', '4x4', '5x5', '6x6', '7x7', '3x3oh', 'mega', 'pyra', 'skewb', 'sq1', 'clock'];
    await Promise.all(events.map((e) => this.cacheService.invalidateRanking(e)));
  }
}
