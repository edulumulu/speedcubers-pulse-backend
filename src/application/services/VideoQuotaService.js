import { AppError } from '../../domain/errors/AppError.js';

const DEFAULT_FREE_VIDEO_SECONDS = 60 * 60;
const DEFAULT_GLOBAL_FREE_VIDEO_SECONDS = 8000 * 60;

function configuredUserLimitSeconds() {
  const minutes = Number.parseInt(process.env.FREE_VIDEO_MINUTES_PER_MONTH ?? '60', 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_FREE_VIDEO_SECONDS;
  return minutes * 60;
}

function configuredGlobalLimitSeconds() {
  const minutes = Number.parseInt(process.env.FREE_VIDEO_GLOBAL_MINUTES_PER_MONTH ?? '8000', 10);
  if (!Number.isFinite(minutes) || minutes <= 0) return DEFAULT_GLOBAL_FREE_VIDEO_SECONDS;
  return minutes * 60;
}

function startOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function startOfNextMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

export class VideoQuotaService {
  constructor(
    userRepository,
    globalUsageRepositoryOrOptions = null,
    options = {},
  ) {
    const hasGlobalRepository = Boolean(globalUsageRepositoryOrOptions?.getMonthlyUsage);
    const resolvedOptions = hasGlobalRepository ? options : globalUsageRepositoryOrOptions ?? {};
    const {
      limitSeconds = configuredUserLimitSeconds(),
      globalLimitSeconds = configuredGlobalLimitSeconds(),
      now = () => new Date(),
    } = resolvedOptions;

    this.userRepository = userRepository;
    this.globalUsageRepository = hasGlobalRepository ? globalUsageRepositoryOrOptions : null;
    this.limitSeconds = limitSeconds;
    this.globalLimitSeconds = globalLimitSeconds;
    this.now = now;
  }

  async getQuota(userId) {
    const [userQuota, globalQuota] = await Promise.all([
      this.getUserQuota(userId),
      this.getGlobalQuota(),
    ]);

    return {
      ...userQuota,
      global: globalQuota,
    };
  }

  async getUserQuota(userId) {
    const usage = await this.userRepository.getVideoUsage(userId);
    if (!usage) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    const normalized = await this.#resetIfNeeded(userId, usage);
    return this.#toQuota(normalized.videoSecondsUsed, normalized.videoQuotaResetAt);
  }

  async getGlobalQuota() {
    if (!this.globalUsageRepository) {
      return this.#toGlobalQuota(0, startOfNextMonth(this.now()));
    }

    const now = this.now();
    const monthStart = startOfMonth(now);
    const resetAt = startOfNextMonth(now);
    const usage = await this.globalUsageRepository.getMonthlyUsage(monthStart, resetAt);
    return this.#toGlobalQuota(usage.secondsUsed, usage.resetAt);
  }

  async ensureAvailable(userId) {
    const quota = await this.getQuota(userId);
    if (quota.remainingSeconds <= 0) {
      throw new AppError('Se ha agotado tu prueba gratuita mensual', 'VIDEO_QUOTA_EXCEEDED', 402);
    }
    if (quota.global.remainingSeconds <= 0) {
      throw new AppError(
        'El cupo gratuito mensual de vídeo se ha agotado temporalmente',
        'VIDEO_GLOBAL_QUOTA_EXCEEDED',
        402,
      );
    }
    return quota;
  }

  async consume(userId, seconds) {
    const [usage, globalQuota] = await Promise.all([
      this.userRepository.getVideoUsage(userId),
      this.getGlobalQuota(),
    ]);
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

    const nextGlobalQuota = await this.#consumeGlobal(consumedSeconds, globalQuota);

    return {
      ...this.#toQuota(nextUsedSeconds, normalized.videoQuotaResetAt),
      global: nextGlobalQuota,
    };
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

  async #consumeGlobal(consumedSeconds, quota) {
    if (!this.globalUsageRepository) return quota;

    const now = this.now();
    const monthStart = startOfMonth(now);
    const resetAt = startOfNextMonth(now);
    const nextUsedSeconds = Math.min(this.globalLimitSeconds, quota.usedSeconds + consumedSeconds);
    await this.globalUsageRepository.updateMonthlyUsage(monthStart, {
      secondsUsed: nextUsedSeconds,
      resetAt,
    });

    return this.#toGlobalQuota(nextUsedSeconds, resetAt);
  }

  #toGlobalQuota(usedSeconds, resetAt) {
    return {
      limitSeconds: this.globalLimitSeconds,
      usedSeconds,
      remainingSeconds: Math.max(0, this.globalLimitSeconds - usedSeconds),
      resetAt: resetAt.toISOString(),
    };
  }
}
