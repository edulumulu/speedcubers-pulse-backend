const ONLINE_USERS_KEY = 'online:users';

function serializeOnlineUser(user, now = new Date()) {
  const publicUser = typeof user.toPublic === 'function'
    ? user.toPublic()
    : { id: user.id, username: user.username };

  return {
    id: publicUser.id,
    username: publicUser.username,
    connectedAt: now.toISOString(),
    lastSeenAt: now.toISOString(),
  };
}

function parseOnlineUser(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export class PresenceService {
  constructor(redis, userRepository) {
    this.redis = redis;
    this.userRepository = userRepository;
  }

  async setOnline(userId, now = new Date()) {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;

    const onlineUser = serializeOnlineUser(user, now);
    await this.redis.hset(ONLINE_USERS_KEY, userId, JSON.stringify(onlineUser));
    return onlineUser;
  }

  async refresh(userId, now = new Date()) {
    const current = await this.redis.hget(ONLINE_USERS_KEY, userId);
    if (!current) return this.setOnline(userId, now);

    const onlineUser = parseOnlineUser(current);
    if (!onlineUser) return this.setOnline(userId, now);

    const refreshed = {
      ...onlineUser,
      lastSeenAt: now.toISOString(),
    };
    await this.redis.hset(ONLINE_USERS_KEY, userId, JSON.stringify(refreshed));
    return refreshed;
  }

  async setOffline(userId) {
    await this.redis.hdel(ONLINE_USERS_KEY, userId);
  }

  async listOnlineUsers() {
    const values = await this.redis.hvals(ONLINE_USERS_KEY);
    return values
      .map(parseOnlineUser)
      .filter(Boolean)
      .sort((a, b) => a.username.localeCompare(b.username));
  }
}
