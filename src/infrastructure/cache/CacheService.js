import { createClient } from 'redis';

const TTL_RANKING = 5 * 60;       // 5 minutes
const TTL_USER_STATS = 5 * 60;    // 5 minutes
const TTL_WCA_RANKING = 24 * 60 * 60; // 24 hours

class CacheService {
  constructor() {
    this.client = null;
    this.connected = false;
  }

  async connect() {
    if (this.connected) return;
    this.client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    this.client.on('error', (err) => {
      if (process.env.NODE_ENV !== 'test') {
        console.error('[Redis] connection error:', err.message);
      }
    });
    await this.client.connect();
    this.connected = true;
  }

  async disconnect() {
    if (this.client && this.connected) {
      await this.client.disconnect();
      this.connected = false;
    }
  }

  async get(key) {
    if (!this.connected) return null;
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttlSeconds) {
    if (!this.connected) return;
    await this.client.set(key, JSON.stringify(value), { EX: ttlSeconds });
  }

  async del(key) {
    if (!this.connected) return;
    await this.client.del(key);
  }

  // --- Ranking top 100 by event ---

  rankingKey(event) {
    return `ranking:top:100:${event}`;
  }

  async getRanking(event) {
    return this.get(this.rankingKey(event));
  }

  async setRanking(event, data) {
    return this.set(this.rankingKey(event), data, TTL_RANKING);
  }

  async invalidateRanking(event) {
    return this.del(this.rankingKey(event));
  }

  // --- User stats ---

  userStatsKey(userId, event = '3x3') {
    return `user:${userId}:stats:${event}`;
  }

  async getUserStats(userId, event = '3x3') {
    return this.get(this.userStatsKey(userId, event));
  }

  async setUserStats(userId, event, data) {
    return this.set(this.userStatsKey(userId, event), data, TTL_USER_STATS);
  }

  async invalidateUserStats(userId, event = '3x3') {
    return this.del(this.userStatsKey(userId, event));
  }

  // --- WCA official ranking by user + event ---

  wcaRankingKey(userId, event) {
    return `wca:ranking:${userId}:${event}`;
  }

  async getWcaRanking(userId, event) {
    return this.get(this.wcaRankingKey(userId, event));
  }

  async setWcaRanking(userId, event, data) {
    return this.set(this.wcaRankingKey(userId, event), data, TTL_WCA_RANKING);
  }
}

export const cacheService = new CacheService();
