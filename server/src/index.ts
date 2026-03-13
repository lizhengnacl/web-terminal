import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-body';
import cors from 'koa-cors';
import { createServer } from 'http';
import { config } from 'dotenv';
import WebSocket from 'ws';
import { SessionManager } from './pty/sessionManager';
import { WebSocketHandler } from './websocket/handler';
import authRoutes from './routes/auth';
import terminalRoutes from './routes/terminal';

config();

export const sessionManager = new SessionManager();

const app = new Koa();
const router = new Router();
const server = createServer(app.callback());
const wss = new WebSocket.Server({ server });

const wsHandler = new WebSocketHandler(sessionManager);

wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);
});

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers: ['Origin', 'Content-Type', 'Accept', 'Authorization'],
  })
);

app.use(
  bodyParser({
    multipart: true,
    formidable: {
      maxFileSize: 10 * 1024 * 1024,
    },
  })
);

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`);
});

router.get('/health', async (ctx) => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: sessionManager.getActiveSessionCount(),
  };
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(authRoutes.routes());
app.use(authRoutes.allowedMethods());

app.use(terminalRoutes.routes());
app.use(terminalRoutes.allowedMethods());

app.use(async (ctx) => {
  ctx.status = 404;
  ctx.body = { error: 'Not Found', path: ctx.path };
});

setInterval(() => {
  const cleaned = sessionManager.cleanupInactiveSessions();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} inactive sessions`);
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3012;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
