import { jest } from '@jest/globals';
import { VideoQuotaService } from '../../../src/application/services/VideoQuotaService.js';

function makeRepository(usage = { videoSecondsUsed: 120, videoQuotaResetAt: new Date('2026-08-01T00:00:00.000Z') }) {
  return {
    getVideoUsage: jest.fn().mockResolvedValue(usage),
    updateVideoUsage: jest.fn().mockResolvedValue(null),
  };
}

function makeGlobalRepository(usage = { secondsUsed: 300, resetAt: new Date('2026-08-01T00:00:00.000Z') }) {
  return {
    getMonthlyUsage: jest.fn().mockResolvedValue(usage),
    updateMonthlyUsage: jest.fn().mockResolvedValue(null),
  };
}

describe('VideoQuotaService', () => {
  it('returns current monthly quota', async () => {
    const repository = makeRepository();
    const service = new VideoQuotaService(repository, {
      limitSeconds: 3600,
      now: () => new Date('2026-07-06T10:00:00.000Z'),
    });

    await expect(service.ensureAvailable('user-1')).resolves.toMatchObject({
      limitSeconds: 3600,
      usedSeconds: 120,
      remainingSeconds: 3480,
      resetAt: '2026-08-01T00:00:00.000Z',
      global: {
        limitSeconds: 480000,
        usedSeconds: 0,
        remainingSeconds: 480000,
        resetAt: '2026-08-01T00:00:00.000Z',
      },
    });
  });

  it('throws when the free monthly quota is exhausted', async () => {
    const repository = makeRepository({
      videoSecondsUsed: 3600,
      videoQuotaResetAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    const service = new VideoQuotaService(repository, {
      limitSeconds: 3600,
      now: () => new Date('2026-07-06T10:00:00.000Z'),
    });

    await expect(service.ensureAvailable('user-1')).rejects.toMatchObject({
      code: 'VIDEO_QUOTA_EXCEEDED',
      status: 402,
    });
  });

  it('resets usage when a new month starts', async () => {
    const repository = makeRepository({
      videoSecondsUsed: 3600,
      videoQuotaResetAt: new Date('2026-07-01T00:00:00.000Z'),
    });
    const service = new VideoQuotaService(repository, {
      limitSeconds: 3600,
      now: () => new Date('2026-07-06T10:00:00.000Z'),
    });

    await expect(service.ensureAvailable('user-1')).resolves.toMatchObject({
      usedSeconds: 0,
      remainingSeconds: 3600,
      resetAt: '2026-08-01T00:00:00.000Z',
    });
    expect(repository.updateVideoUsage).toHaveBeenCalledWith('user-1', {
      videoSecondsUsed: 0,
      videoQuotaResetAt: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('stores consumed seconds capped at the monthly limit', async () => {
    const repository = makeRepository({
      videoSecondsUsed: 3590,
      videoQuotaResetAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    const service = new VideoQuotaService(repository, {
      limitSeconds: 3600,
      now: () => new Date('2026-07-06T10:00:00.000Z'),
    });

    await expect(service.consume('user-1', 30)).resolves.toMatchObject({
      usedSeconds: 3600,
      remainingSeconds: 0,
    });
    expect(repository.updateVideoUsage).toHaveBeenCalledWith('user-1', {
      videoSecondsUsed: 3600,
      videoQuotaResetAt: new Date('2026-08-01T00:00:00.000Z'),
    });
  });

  it('returns global monthly quota together with user quota', async () => {
    const repository = makeRepository();
    const globalRepository = makeGlobalRepository({ secondsUsed: 600, resetAt: new Date('2026-08-01T00:00:00.000Z') });
    const service = new VideoQuotaService(repository, globalRepository, {
      limitSeconds: 3600,
      globalLimitSeconds: 480000,
      now: () => new Date('2026-07-06T10:00:00.000Z'),
    });

    await expect(service.ensureAvailable('user-1')).resolves.toMatchObject({
      remainingSeconds: 3480,
      global: {
        limitSeconds: 480000,
        usedSeconds: 600,
        remainingSeconds: 479400,
        resetAt: '2026-08-01T00:00:00.000Z',
      },
    });
    expect(globalRepository.getMonthlyUsage).toHaveBeenCalledWith(
      new Date('2026-07-01T00:00:00.000Z'),
      new Date('2026-08-01T00:00:00.000Z'),
    );
  });

  it('throws when the global monthly quota is exhausted', async () => {
    const repository = makeRepository();
    const globalRepository = makeGlobalRepository({ secondsUsed: 480000, resetAt: new Date('2026-08-01T00:00:00.000Z') });
    const service = new VideoQuotaService(repository, globalRepository, {
      limitSeconds: 3600,
      globalLimitSeconds: 480000,
      now: () => new Date('2026-07-06T10:00:00.000Z'),
    });

    await expect(service.ensureAvailable('user-1')).rejects.toMatchObject({
      code: 'VIDEO_GLOBAL_QUOTA_EXCEEDED',
      status: 402,
    });
  });

  it('stores consumed seconds in the global monthly quota capped at the global limit', async () => {
    const repository = makeRepository({
      videoSecondsUsed: 60,
      videoQuotaResetAt: new Date('2026-08-01T00:00:00.000Z'),
    });
    const globalRepository = makeGlobalRepository({ secondsUsed: 479990, resetAt: new Date('2026-08-01T00:00:00.000Z') });
    const service = new VideoQuotaService(repository, globalRepository, {
      limitSeconds: 3600,
      globalLimitSeconds: 480000,
      now: () => new Date('2026-07-06T10:00:00.000Z'),
    });

    await expect(service.consume('user-1', 30)).resolves.toMatchObject({
      usedSeconds: 90,
      global: {
        usedSeconds: 480000,
        remainingSeconds: 0,
      },
    });
    expect(globalRepository.updateMonthlyUsage).toHaveBeenCalledWith(
      new Date('2026-07-01T00:00:00.000Z'),
      {
        secondsUsed: 480000,
        resetAt: new Date('2026-08-01T00:00:00.000Z'),
      },
    );
  });
});
