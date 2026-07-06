/**
 * Pure domain entity — no framework dependencies.
 * Contains only business logic and validation rules.
 */
export class UserEntity {
  constructor({
    id,
    email,
    username,
    passwordHash,
    usernameChangedAt,
    videoSecondsUsed,
    videoQuotaResetAt,
    createdAt,
  }) {
    this.id = id;
    this.email = email;
    this.username = username;
    this.passwordHash = passwordHash;
    this.usernameChangedAt = usernameChangedAt ?? null;
    this.videoSecondsUsed = videoSecondsUsed ?? 0;
    this.videoQuotaResetAt = videoQuotaResetAt ?? null;
    this.createdAt = createdAt ?? new Date();
  }

  canChangeUsername() {
    if (!this.usernameChangedAt) return true;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.usernameChangedAt < thirtyDaysAgo;
  }

  toPublic() {
    return {
      id: this.id,
      username: this.username,
      createdAt: this.createdAt,
    };
  }

  toPrivate() {
    return {
      id: this.id,
      email: this.email,
      username: this.username,
      createdAt: this.createdAt,
    };
  }
}
