/**
 * Interface contract for user persistence.
 * Infrastructure layer must implement all methods.
 */
export class IUserRepository {
  async findById(_id) { throw new Error('Not implemented'); }
  async findByEmail(_email) { throw new Error('Not implemented'); }
  async findByUsername(_username) { throw new Error('Not implemented'); }
  async create(_data) { throw new Error('Not implemented'); }
  async update(_id, _data) { throw new Error('Not implemented'); }
  async delete(_id) { throw new Error('Not implemented'); }
}
