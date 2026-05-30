import { IWcaProfileRepository } from '../../domain/repositories/IWcaProfileRepository.js';

export class WcaProfileRepository extends IWcaProfileRepository {
  constructor(models) {
    super();
    this.WcaProfile = models.WcaProfile;
  }

  #toPlain(record) {
    if (!record) return null;
    return {
      id: record.id,
      userId: record.user_id,
      wcaId: record.wca_id,
      countryIso2: record.country_iso2,
      syncedAt: record.synced_at,
    };
  }

  async findByUserId(userId) {
    const record = await this.WcaProfile.findOne({ where: { user_id: userId } });
    return this.#toPlain(record);
  }

  async findByWcaId(wcaId) {
    const record = await this.WcaProfile.findOne({ where: { wca_id: wcaId } });
    return this.#toPlain(record);
  }

  async create({ userId, wcaId, countryIso2 }) {
    const record = await this.WcaProfile.create({
      user_id: userId,
      wca_id: wcaId,
      country_iso2: countryIso2 ?? null,
      synced_at: new Date(),
    });
    return this.#toPlain(record);
  }

  async update(userId, { wcaId, countryIso2 }) {
    const record = await this.WcaProfile.findOne({ where: { user_id: userId } });
    if (!record) return null;
    await record.update({
      wca_id: wcaId,
      country_iso2: countryIso2 ?? null,
      synced_at: new Date(),
    });
    return this.#toPlain(record);
  }

  async delete(userId) {
    const record = await this.WcaProfile.findOne({ where: { user_id: userId } });
    if (!record) return false;
    await record.destroy();
    return true;
  }
}
