import { fetchWcaPerson } from '../../infrastructure/external_api/WcaClient.js';

export class WcaService {
  constructor(wcaProfileRepository) {
    this.wcaProfileRepository = wcaProfileRepository;
  }

  async validateAndLink(userId, wcaId) {
    const existing = await this.wcaProfileRepository.findByWcaId(wcaId);
    if (existing && existing.userId !== userId) {
      const err = new Error('WCA ID already linked to another account');
      err.code = 'WCA_ID_TAKEN';
      err.status = 409;
      throw err;
    }

    const wcaPerson = await fetchWcaPerson(wcaId);
    if (!wcaPerson) {
      const err = new Error('WCA ID not found');
      err.code = 'WCA_ID_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const alreadyLinked = await this.wcaProfileRepository.findByUserId(userId);

    if (alreadyLinked) {
      const err = new Error('WCA ID already linked to this account and cannot be changed');
      err.code = 'WCA_ALREADY_LINKED';
      err.status = 409;
      throw err;
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
