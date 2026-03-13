import * as jwt from 'jsonwebtoken';
import { Context, Next } from 'koa';
import { AuthPayload } from '../types';
import { isTokenBlacklisted } from '../database/userDb';

export const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

export interface AuthenticatedContext extends Context {
  state: {
    user?: AuthPayload;
  };
}

export async function authMiddleware(ctx: AuthenticatedContext, next: Next) {
  const token = ctx.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    ctx.status = 401;
    ctx.body = { error: '未提供认证令牌' };
    return;
  }

  if (isTokenBlacklisted(token)) {
    ctx.status = 401;
    ctx.body = { error: '令牌已失效，请重新登录' };
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    ctx.state.user = decoded;
    await next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      ctx.status = 401;
      ctx.body = { error: '令牌已过期，请重新登录' };
    } else if (error instanceof jwt.JsonWebTokenError) {
      ctx.status = 401;
      ctx.body = { error: '无效的令牌' };
    } else {
      ctx.status = 401;
      ctx.body = { error: '认证失败' };
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    if (isTokenBlacklisted(token)) {
      return null;
    }
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (error) {
    return null;
  }
}

export function decodeToken(token: string): AuthPayload | null {
  try {
    return jwt.decode(token) as AuthPayload;
  } catch (error) {
    return null;
  }
}
