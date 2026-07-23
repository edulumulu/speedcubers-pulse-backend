export class VideoGlobalUsageRepository {
  constructor(models) {
    this.VideoGlobalUsage = models.VideoGlobalUsage;
  }

  async getMonthlyUsage(monthStart, resetAt) {
    const [record] = await this.VideoGlobalUsage.findOrCreate({
      where: { month_start: monthStart },
      defaults: {
        month_start: monthStart,
        seconds_used: 0,
        reset_at: resetAt,
      },
    });

    return {
      monthStart: record.month_start,
      secondsUsed: record.seconds_used ?? 0,
      resetAt: record.reset_at,
    };
  }

  async updateMonthlyUsage(monthStart, { secondsUsed, resetAt }) {
    const [record] = await this.VideoGlobalUsage.findOrCreate({
      where: { month_start: monthStart },
      defaults: {
        month_start: monthStart,
        seconds_used: 0,
        reset_at: resetAt,
      },
    });

    await record.update({
      seconds_used: secondsUsed,
      reset_at: resetAt,
    });

    return {
      monthStart: record.month_start,
      secondsUsed: record.seconds_used ?? 0,
      resetAt: record.reset_at,
    };
  }
}
