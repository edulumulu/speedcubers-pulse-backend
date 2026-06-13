import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { initializePresenceSocket } from './presentation/sockets/presence.socket.js';

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

initializePresenceSocket(server);

server.listen(PORT, () => {
  console.warn(`Server running on http://localhost:${PORT}`);
});
