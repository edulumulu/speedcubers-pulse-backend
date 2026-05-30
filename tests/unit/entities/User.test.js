import { UserEntity } from '../../../src/domain/entities/User.js';

describe('UserEntity.canChangeUsername', () => {
  it('returns true when username has never been changed', () => {
    const user = new UserEntity({ id: '1', email: 'a@b.com', username: 'alice', passwordHash: 'x' });
    expect(user.canChangeUsername()).toBe(true);
  });

  it('returns false when username was changed less than 30 days ago', () => {
    const recentChange = new Date();
    recentChange.setDate(recentChange.getDate() - 10);
    const user = new UserEntity({
      id: '1', email: 'a@b.com', username: 'alice',
      passwordHash: 'x', usernameChangedAt: recentChange,
    });
    expect(user.canChangeUsername()).toBe(false);
  });

  it('returns true when username was changed more than 30 days ago', () => {
    const oldChange = new Date();
    oldChange.setDate(oldChange.getDate() - 31);
    const user = new UserEntity({
      id: '1', email: 'a@b.com', username: 'alice',
      passwordHash: 'x', usernameChangedAt: oldChange,
    });
    expect(user.canChangeUsername()).toBe(true);
  });
});

describe('UserEntity.toPublic', () => {
  it('does not expose email or passwordHash', () => {
    const user = new UserEntity({ id: '1', email: 'a@b.com', username: 'alice', passwordHash: 'secret' });
    const pub = user.toPublic();
    expect(pub.email).toBeUndefined();
    expect(pub.passwordHash).toBeUndefined();
    expect(pub.username).toBe('alice');
  });
});
