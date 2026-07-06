import { AppError } from '../../domain/errors/AppError.js';

const DEFAULT_FREE_VIDEO_SECONDS = 60 * 60;

function configuredLimitSeconds() {
  const minutes = Number.parseInt(process.env.FREE_VIDEO_MINUTES_PER_MONTH ?? '60', 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_FREE_VIDEO_SECONDS;
  return minutes * 60;
}

function startOfNextMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export class VideoQuotaService {
  constructor(userRepository, { limitSeconds = configuredLimitSeconds(), now = () => new Date() } = {}) {
    this.userRepository = userRepository;
    this.limitSeconds = limitSeconds;
    this.now = now;
  }

  async getQuota(userId) {
    const usage = await this.userRepository.getVideoUsage(userId);
    if (!usage) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    const normalized = await this.#resetIfNeeded(userId, usage);
    return this.#toQuota(normalized.videoSecondsUsed, normalized.videoQuotaResetAt);
  }

  async ensureAvailable(userId) {
    const quota = await this.getQuota(userId);
    if (quota.remainingSeconds <= 0) {
      throw new AppError('Se ha agotado tu prueba gratuita mensual', 'VIDEO_QUOTA_EXCEEDED', 402);
    }
    return quota;
  }

  async consume(userId, seconds) {
    const usage = await this.userRepository.getVideoUsage(userId);
    if (!usage) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    const normalized = await this.#resetIfNeeded(userId, usage);
    const consumedSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
    const nextUsedSeconds = Math.min(this.limitSeconds, normalized.videoSecondsUsed + consumedSeconds);
    await this.userRepository.updateVideoUsage(userId, {
      videoSecondsUsed: nextUsedSeconds,
      videoQuotaResetAt: normalized.videoQuotaResetAt,
    });

    return this.#toQuota(nextUsedSeconds, normalized.videoQuotaResetAt);
  }

  async #resetIfNeeded(userId, usage) {
    const now = this.now();
    const resetAt = usage.videoQuotaResetAt ? new Date(usage.videoQuotaResetAt) : startOfNextMonth(now);
    if (resetAt > now) {
      return {
        videoSecondsUsed: usage.videoSecondsUsed ?? 0,
        videoQuotaResetAt: resetAt,
      };
    }

    const nextResetAt = startOfNextMonth(now);
    await this.userRepository.updateVideoUsage(userId, {
      videoSecondsUsed: 0,
      videoQuotaResetAt: nextResetAt,
    });

    return {
      videoSecondsUsed: 0,
      videoQuotaResetAt: nextResetAt,
    };
  }

  #toQuota(usedSeconds, resetAt) {
    return {
      limitSeconds: this.limitSeconds,
      usedSeconds,
      remainingSeconds: Math.max(0, this.limitSeconds - usedSeconds),
      resetAt: resetAt.toISOString(),
    };
  }
}
