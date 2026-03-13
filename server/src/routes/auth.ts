import Router from 'koa-router';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcryptjs';
import { generateToken, authMiddleware } from '../middleware/auth';
import { User } from '../types';

const router = new Router();

const users: Map<string, User> = new Map();

(async () => {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  users.set('admin', {
    id: uuidv4(),
    username: 'admin',
    password: hashedPassword,
    role: 'admin',
  });
})();

router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body as any;

  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { error: 'Username and password required' };
    return;
  }

  const user = users.get(username);
  if (!user) {
    ctx.status = 401;
    ctx.body = { error: 'Invalid credentials' };
    return;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    ctx.status = 401;
    ctx.body = { error: 'Invalid credentials' };
    return;
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  ctx.body = {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
});

router.post('/register', async (ctx) => {
  const { username, password } = ctx.request.body as any;

  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { error: 'Username and password required' };
    return;
  }

  if (users.has(username)) {
    ctx.status = 409;
    ctx.body = { error: 'User already exists' };
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser: User = {
    id: uuidv4(),
    username,
    password: hashedPassword,
    role: 'user',
  };

  users.set(username, newUser);

  const token = generateToken({
    userId: newUser.id,
    username: newUser.username,
    role: newUser.role,
  });

  ctx.status = 201;
  ctx.body = {
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
    },
  };
});

router.get('/me', authMiddleware, async (ctx) => {
  const user = ctx.state.user;
  ctx.body = {
    user: {
      id: user?.userId,
      username: user?.username,
      role: user?.role,
    },
  };
});

export default router;
