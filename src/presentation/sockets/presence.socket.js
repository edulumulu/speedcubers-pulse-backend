import { Server } from 'socket.io';
import {
  authService,
  challengeService,
  competitionRepository,
  presenceService,
} from '../../infrastructure/container.js';
import { socketCorsOptions } from '../../infrastructure/config/security.js';

function tokenFromHandshake(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers?.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
}

export function initializePresenceSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: socketCorsOptions(),
  });

  io.use((socket, next) => {
    const token = tokenFromHandshake(socket);
    if (!token) return next(new Error('AUTH_REQUIRED'));

    try {
      const payload = authService.verifyAccessToken(token);
      socket.userId = payload.sub;
      return next();
    } catch {
      return next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', async (socket) => {
    socket.join(`user:${socket.userId}`);

    const onlineUser = await presenceService.setOnline(socket.userId);
    if (onlineUser) io.emit('presence:online', onlineUser);

    socket.on('presence:heartbeat', async () => {
      const refreshed = await presenceService.refresh(socket.userId);
      if (refreshed) socket.emit('presence:heartbeat:ack', refreshed);
    });

    socket.on('challenge:send', async ({ challengedUserId, event } = {}, ack) => {
      try {
        const challenge = await challengeService.createChallenge({
          challengerId: socket.userId,
          challengedId: typeof challengedUserId === 'string' ? challengedUserId : '',
          event: typeof event === 'string' ? event : '3x3',
        });

        io.to(`user:${challenge.challenged.id}`).emit('challenge:received', challenge);
        socket.emit('challenge:sent', challenge);
        if (ack) ack({ ok: true, challenge });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.code || 'CHALLENGE_FAILED', message: err.message });
      }
    });

    socket.on('challenge:accept', async ({ challengeId } = {}, ack) => {
      try {
        const result = await challengeService.acceptChallenge({
          challengeId: typeof challengeId === 'string' ? challengeId : '',
          userId: socket.userId,
        });

        const payload = {
          challenge: result.challenge,
          competition: result.competition,
          acceptedBy: socket.userId,
        };

        io.to(`user:${result.challenge.challenger.id}`).emit('challenge:accepted', payload);
        io.to(`user:${result.challenge.challenged.id}`).emit('challenge:accepted', payload);
        if (ack) ack({ ok: true, ...payload });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.code || 'CHALLENGE_ACCEPT_FAILED', message: err.message });
      }
    });

    socket.on('challenge:reject', async ({ challengeId } = {}, ack) => {
      try {
        const challenge = await challengeService.rejectChallenge({
          challengeId: typeof challengeId === 'string' ? challengeId : '',
          userId: socket.userId,
        });

        if (challenge) {
          io.to(`user:${challenge.challenger.id}`).emit('challenge:rejected', {
            challenge,
            rejectedBy: socket.userId,
          });
        }
        if (ack) ack({ ok: true, challenge });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.code || 'CHALLENGE_REJECT_FAILED', message: err.message });
      }
    });

    socket.on('challenge:cancel', async ({ challengeId } = {}, ack) => {
      try {
        const challenge = await challengeService.cancelChallenge({
          challengeId: typeof challengeId === 'string' ? challengeId : '',
          userId: socket.userId,
        });

        if (challenge) {
          io.to(`user:${challenge.challenged.id}`).emit('challenge:cancelled', {
            challenge,
            cancelledBy: socket.userId,
          });
          socket.emit('challenge:cancelled', {
            challenge,
            cancelledBy: socket.userId,
          });
        }
        if (ack) ack({ ok: true, challenge });
      } catch (err) {
        if (ack) ack({ ok: false, error: err.code || 'CHALLENGE_CANCEL_FAILED', message: err.message });
      }
    });

    socket.on('competition:join', async ({ code } = {}, ack) => {
      const roomCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const competition = roomCode ? await competitionRepository.findByCode(roomCode) : null;
      const isParticipant = competition
        && [competition.host_user_id, competition.guest_user_id].includes(socket.userId);

      if (!isParticipant) {
        if (ack) ack({ ok: false, error: 'COMPETITION_NOT_FOUND' });
        return;
      }

      socket.join(`competition:${roomCode}`);
      if (ack) ack({ ok: true });
    });

    socket.on('competition:inspection:start', async ({ code, roundId, startedAt } = {}, ack) => {
      const roomCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const competition = roomCode ? await competitionRepository.findByCode(roomCode) : null;
      const isParticipant = competition
        && [competition.host_user_id, competition.guest_user_id].includes(socket.userId);

      if (!isParticipant) {
        if (ack) ack({ ok: false, error: 'COMPETITION_NOT_FOUND' });
        return;
      }

      const payload = {
        code: roomCode,
        roundId: typeof roundId === 'string' ? roundId : null,
        startedAt: typeof startedAt === 'number' ? startedAt : Date.now(),
        startedBy: socket.userId,
      };

      socket.join(`competition:${roomCode}`);
      const participantRooms = new Set([
        competition.host_user_id,
        competition.guest_user_id,
      ].filter(Boolean).map((userId) => `user:${userId}`));

      participantRooms.forEach((participantRoom) => {
        io.to(participantRoom).emit('competition:inspection:started', payload);
      });
      if (ack) ack({ ok: true });
    });

    socket.on('competition:round-final:dismiss', async ({ code, roundId } = {}, ack) => {
      const roomCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const competition = roomCode ? await competitionRepository.findByCode(roomCode) : null;
      const isParticipant = competition
        && [competition.host_user_id, competition.guest_user_id].includes(socket.userId);

      if (!isParticipant) {
        if (ack) ack({ ok: false, error: 'COMPETITION_NOT_FOUND' });
        return;
      }

      const payload = {
        code: roomCode,
        roundId: typeof roundId === 'string' ? roundId : null,
        dismissedBy: socket.userId,
        dismissedAt: Date.now(),
      };
      const participantRooms = new Set([
        competition.host_user_id,
        competition.guest_user_id,
      ].filter(Boolean).map((userId) => `user:${userId}`));

      participantRooms.forEach((participantRoom) => {
        io.to(participantRoom).emit('competition:round-final:dismissed', payload);
      });
      if (ack) ack({ ok: true });
    });

    socket.on('competition:round:changed', async ({ code, roundId } = {}, ack) => {
      const roomCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const competition = roomCode ? await competitionRepository.findByCode(roomCode) : null;
      const isParticipant = competition
        && [competition.host_user_id, competition.guest_user_id].includes(socket.userId);

      if (!isParticipant) {
        if (ack) ack({ ok: false, error: 'COMPETITION_NOT_FOUND' });
        return;
      }

      const payload = {
        code: roomCode,
        roundId: typeof roundId === 'string' ? roundId : null,
        changedBy: socket.userId,
      };
      const participantRooms = new Set([
        competition.host_user_id,
        competition.guest_user_id,
      ].filter(Boolean).map((userId) => `user:${userId}`));

      participantRooms.forEach((participantRoom) => {
        io.to(participantRoom).emit('competition:round:updated', payload);
      });
      if (ack) ack({ ok: true });
    });

    socket.on('competition:leave', async ({ code } = {}, ack) => {
      const roomCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
      const competition = roomCode ? await competitionRepository.findByCode(roomCode) : null;
      const isParticipant = competition
        && [competition.host_user_id, competition.guest_user_id].includes(socket.userId);

      if (!isParticipant) {
        if (ack) ack({ ok: false, error: 'COMPETITION_NOT_FOUND' });
        return;
      }

      const payload = {
        code: roomCode,
        leftBy: socket.userId,
        leftAt: Date.now(),
      };
      const participantRooms = new Set([
        competition.host_user_id,
        competition.guest_user_id,
      ].filter(Boolean).map((userId) => `user:${userId}`));

      participantRooms.forEach((participantRoom) => {
        io.to(participantRoom).emit('competition:left', payload);
      });
      socket.leave(`competition:${roomCode}`);
      if (ack) ack({ ok: true });
    });

    socket.on('disconnect', async () => {
      await presenceService.setOffline(socket.userId);
      io.emit('presence:offline', { id: socket.userId });
    });
  });

  return io;
}
