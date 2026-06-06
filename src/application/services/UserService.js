import bcrypt from 'bcrypt';
import { BCRYPT_SALT_ROUNDS } from '../../infrastructure/config/constants.js';

export class UserService {
  constructor(userRepository, wcaService) {
    this.userRepository = userRepository;
    this.wcaService = wcaService;
  }

  async getByUsername(username) {
    const user = await this.userRepository.findByUsername(username);
    if (!user) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const wcaProfile = await this.wcaService.getProfile(user.id);
    let wcaLiveData = null;
    if (wcaProfile) {
      try {
        wcaLiveData = await this.wcaService.getLiveData(wcaProfile.wcaId);
      } catch {
        // Live data fetch is best-effort
      }
    }

    return { user: user.toPublic(), wcaProfile, wcaLiveData };
  }

  async getMe(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const wcaProfile = await this.wcaService.getProfile(userId);
    let wcaLiveData = null;
    if (wcaProfile) {
      try {
        wcaLiveData = await this.wcaService.getLiveData(wcaProfile.wcaId);
      } catch {
        // Live data fetch is best-effort
      }
    }

    return { user: user.toPrivate(), wcaProfile, wcaLiveData };
  }

  async updateMe(userId, data) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.code = 'USER_NOT_FOUND';
      err.status = 404;
      throw err;
    }

    const updatedFields = {};

    if (data.email !== undefined) {
      updatedFields.email = data.email;
    }

    if (data.username !== undefined) {
      if (!user.canChangeUsername()) {
        const err = new Error('Username can only be changed once every 30 days');
        err.code = 'USERNAME_CHANGE_TOO_SOON';
        err.status = 422;
        throw err;
      }
      updatedFields.username = data.username;
      updatedFields.username_changed_at = new Date();
    }

    if (data.password !== undefined) {
      updatedFields.password_hash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);
    }

    const updated = await this.userRepository.update(userId, updatedFields);
    return updated.toPrivate();
  }

  async deleteMe(userId) {
    await this.userRepository.update(userId, {
      deleted_at: new Date(),
      email: `deleted_${userId}@deleted`,
      username: `deleted_${userId}`,
    });
  }
}
