import { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { UserEntity } from '../../domain/entities/User.js';

export class UserRepository extends IUserRepository {
  constructor(models) {
    super();
    this.User = models.User;
  }

  #toEntity(record) {
    if (!record) return null;
    return new UserEntity({
      id: record.id,
      email: record.email,
      username: record.username,
      passwordHash: record.password_hash,
      usernameChangedAt: record.username_changed_at,
      createdAt: record.created_at,
    });
  }

  async findById(id) {
    const record = await this.User.findByPk(id);
    return this.#toEntity(record);
  }

  async findByEmail(email) {
    const record = await this.User.findOne({ where: { email } });
    return this.#toEntity(record);
  }

  async findByUsername(username) {
    const record = await this.User.findOne({ where: { username } });
    return this.#toEntity(record);
  }

  async create({ email, username, passwordHash }) {
    const record = await this.User.create({
      email,
      username,
      password_hash: passwordHash,
    });
    return this.#toEntity(record);
  }

  async update(id, data) {
    const record = await this.User.findByPk(id);
    if (!record) return null;
    await record.update(data);
    return this.#toEntity(record);
  }

  async delete(id) {
    const record = await this.User.findByPk(id);
    if (!record) return false;
    await record.destroy();
    return true;
  }
}
