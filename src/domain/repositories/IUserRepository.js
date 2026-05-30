/**
 * Interface contract for user persistence.
 * Infrastructure layer must implement all methods.
 */
export class IUserRepository {
  async findById() { throw new Error('Not implemented'); }
  async findByEmail() { throw new Error('Not implemented'); }
  async findByUsername() { throw new Error('Not implemented'); }
  async create() { throw new Error('Not implemented'); }
  async update() { throw new Error('Not implemented'); }
  async delete() { throw new Error('Not implemented'); }
}
