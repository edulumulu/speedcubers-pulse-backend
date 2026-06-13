import { Server } from 'socket.io';
import { authService, presenceService } from '../../infrastructure/container.js';

function allowedOrigins() {
  return process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'];
}

function tokenFromHandshake(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;

  const header = socket.handshake.headers?.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);

  return null;
}

export function initializePresenceSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins(),
      credentials: true,
      methods: ['GET', 'POST'],
    },
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
    const onlineUser = await presenceService.setOnline(socket.userId);
    if (onlineUser) io.emit('presence:online', onlineUser);

    socket.on('presence:heartbeat', async () => {
      const refreshed = await presenceService.refresh(socket.userId);
      if (refreshed) socket.emit('presence:heartbeat:ack', refreshed);
    });

    socket.on('disconnect', async () => {
      await presenceService.setOffline(socket.userId);
      io.emit('presence:offline', { id: socket.userId });
    });
  });

  return io;
}
