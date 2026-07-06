import crypto from 'crypto';
import agoraToken from 'agora-token';
import { AppError } from '../../domain/errors/AppError.js';

const { RtcRole, RtcTokenBuilder } = agoraToken;
export const TOKEN_TTL_SECONDS = 60 * 60;
const MAX_AGORA_UID = 2 ** 32 - 1;

function uidFromUserId(userId) {
  const digest = crypto.createHash('sha256').update(userId).digest();
  return digest.readUInt32BE(0) || 1;
}

export class VideoService {
  constructor({
    appId = process.env.AGORA_APP_ID,
    appCertificate = process.env.AGORA_APP_CERTIFICATE,
    now = () => Math.floor(Date.now() / 1000),
    tokenBuilder = RtcTokenBuilder,
    role = RtcRole.PUBLISHER,
    ttlSeconds = TOKEN_TTL_SECONDS,
  } = {}) {
    this.appId = appId;
    this.appCertificate = appCertificate;
    this.now = now;
    this.tokenBuilder = tokenBuilder;
    this.role = role;
    this.ttlSeconds = ttlSeconds;
  }

  createRtcToken({ userId, channelName, uid, ttlSeconds = this.ttlSeconds }) {
    if (!this.appId || !this.appCertificate) {
      throw new AppError('Agora credentials are not configured', 'AGORA_NOT_CONFIGURED', 500);
    }

    const rtcUid = uid ?? uidFromUserId(userId);
    if (!Number.isInteger(rtcUid) || rtcUid < 1 || rtcUid > MAX_AGORA_UID) {
      throw new AppError('Invalid Agora UID', 'INVALID_AGORA_UID', 400);
    }

    const issuedAt = this.now();
    const expiresAtSeconds = issuedAt + ttlSeconds;
    const token = this.tokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      rtcUid,
      this.role,
      ttlSeconds,
      ttlSeconds,
    );

    if (!token) {
      throw new AppError('Agora credentials are invalid', 'AGORA_INVALID_CONFIGURATION', 500);
    }

    return {
      appId: this.appId,
      channelName,
      uid: rtcUid,
      token,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    };
  }
}
