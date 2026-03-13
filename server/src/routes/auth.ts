import Router from 'koa-router';
import { generateToken, authMiddleware } from '../middleware/auth';
import { User } from '../types';
import {
  createUser,
  getUserByUsername,
  verifyPassword,
  recordLoginAttempt,
  getRecentFailedAttempts,
} from '../database/userDb';

const router = new Router({
  prefix: '/auth'
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15;

const validatePassword = (password: string): { valid: boolean; message?: string } => {
  if (password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码必须包含小写字母' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含大写字母' };
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: '密码必须包含数字' };
  }

  return { valid: true };
};

const validateUsername = (username: string): { valid: boolean; message?: string } => {
  if (username.length < 3) {
    return { valid: false, message: '用户名长度至少3位' };
  }

  if (username.length > 20) {
    return { valid: false, message: '用户名长度不能超过20位' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, message: '用户名只能包含字母、数字和下划线' };
  }

  return { valid: true };
};

router.post('/login', async (ctx) => {
  const { username, password } = ctx.request.body as any;
  const ipAddress = ctx.ip;

  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { error: '用户名和密码不能为空' };
    return;
  }

  const failedAttempts = getRecentFailedAttempts(username, LOCKOUT_DURATION);
  if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
    ctx.status = 429;
    ctx.body = {
      error: `登录失败次数过多，账户已被锁定${LOCKOUT_DURATION}分钟`,
      locked: true,
    };
    return;
  }

  const user = getUserByUsername(username);
  if (!user) {
    recordLoginAttempt(username, ipAddress, false);
    ctx.status = 401;
    ctx.body = { error: '用户名或密码错误' };
    return;
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    recordLoginAttempt(username, ipAddress, false);
    ctx.status = 401;
    ctx.body = { error: '用户名或密码错误' };
    return;
  }

  recordLoginAttempt(username, ipAddress, true);

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
    ctx.body = { error: '用户名和密码不能为空' };
    return;
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    ctx.status = 400;
    ctx.body = { error: usernameValidation.message };
    return;
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    ctx.status = 400;
    ctx.body = { error: passwordValidation.message };
    return;
  }

  const existingUser = getUserByUsername(username);
  if (existingUser) {
    ctx.status = 409;
    ctx.body = { error: '用户名已存在' };
    return;
  }

  const newUser = await createUser(username, password, 'user');

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

router.post('/logout', authMiddleware, async (ctx) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '');
  const user = ctx.state.user;

  if (token && user) {
    const { addToTokenBlacklist } = await import('../database/userDb');
    addToTokenBlacklist(token, user.userId);
  }

  ctx.body = { message: '登出成功' };
});

export default router;
