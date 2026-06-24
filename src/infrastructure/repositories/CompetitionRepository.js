export class CompetitionRepository {
  constructor(models) {
    this.Competition = models.Competition;
    this.User = models.User;
  }

  includeUsers() {
    return [
      { model: this.User, as: 'host', attributes: ['id', 'username'] },
      { model: this.User, as: 'guest', attributes: ['id', 'username'], required: false },
    ];
  }

  async create(data) {
    const row = await this.Competition.create(data);
    return this.findByCode(row.code);
  }

  async findByCode(code) {
    return this.Competition.findOne({
      where: { code },
      include: this.includeUsers(),
    });
  }

  async setGuestAndActivate(id, guestUserId) {
    const [affectedCount] = await this.Competition.update(
      { guest_user_id: guestUserId, status: 'active' },
      { where: { id, guest_user_id: null, status: 'waiting' } },
    );
    if (affectedCount === 0) return null;

    const row = await this.Competition.findByPk(id, { include: this.includeUsers() });
    return row;
  }
}
