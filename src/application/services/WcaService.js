import { AppError } from '../../domain/errors/AppError.js';
import { fetchWcaPerson } from '../../infrastructure/external_api/WcaClient.js';

export class WcaService {
  constructor(wcaProfileRepository) {
    this.wcaProfileRepository = wcaProfileRepository;
  }

  async validateAndLink(userId, wcaId) {
    const existing = await this.wcaProfileRepository.findByWcaId(wcaId);
    if (existing && existing.userId !== userId) {
      throw new AppError('WCA ID already linked to another account', 'WCA_ID_TAKEN', 409);
    }

    const wcaPerson = await fetchWcaPerson(wcaId);
    if (!wcaPerson) {
      throw new AppError('WCA ID not found', 'WCA_ID_NOT_FOUND', 404);
    }

    const alreadyLinked = await this.wcaProfileRepository.findByUserId(userId);

    if (alreadyLinked) {
      return this.wcaProfileRepository.update(userId, {
        wcaId: wcaPerson.wcaId,
        countryIso2: wcaPerson.countryIso2,
      });
    }

    return this.wcaProfileRepository.create({
      userId,
      wcaId: wcaPerson.wcaId,
      countryIso2: wcaPerson.countryIso2,
    });
  }

  async unlink(userId) {
    return this.wcaProfileRepository.delete(userId);
  }

  async getProfile(userId) {
    return this.wcaProfileRepository.findByUserId(userId);
  }

  /**
   * Fetches live data from WCA API (name, avatar, rankings).
   * Never persisted — only used for display.
   */
  async getLiveData(wcaId) {
    return fetchWcaPerson(wcaId);
  }
}
