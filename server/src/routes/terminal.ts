import Router from 'koa-router';
import { authMiddleware } from '../middleware/auth';
import { sessionManager } from '..';

const router = new Router();

router.use(authMiddleware);

router.get('/sessions', async (ctx) => {
  const userId = ctx.state.user?.userId;
  if (!userId) {
    ctx.status = 401;
    ctx.body = { error: 'Unauthorized' };
    return;
  }

  const sessions = sessionManager.getUserSessions(userId);
  ctx.body = {
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      lastActivity: s.lastActivity,
    })),
  };
});

router.delete('/sessions/:id', async (ctx) => {
  const sessionId = ctx.params.id;
  const userId = ctx.state.user?.userId;

  const session = sessionManager.getSession(sessionId);
  if (!session) {
    ctx.status = 404;
    ctx.body = { error: 'Session not found' };
    return;
  }

  if (session.userId !== userId) {
    ctx.status = 403;
    ctx.body = { error: 'Forbidden' };
    return;
  }

  sessionManager.closeSession(sessionId);
  ctx.body = { message: 'Session closed' };
});

router.get('/stats', async (ctx) => {
  const userRole = ctx.state.user?.role;

  if (userRole !== 'admin') {
    ctx.status = 403;
    ctx.body = { error: 'Admin access required' };
    return;
  }

  ctx.body = {
    activeSessions: sessionManager.getActiveSessionCount(),
  };
});

export default router;
