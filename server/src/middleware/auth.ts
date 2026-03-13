import * as jwt from 'jsonwebtoken';
import { Context, Next } from 'koa';
import { AuthPayload } from '../types';

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
    ctx.body = { error: 'No token provided' };
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    ctx.state.user = decoded;
    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { error: 'Invalid token' };
  }
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch (error) {
    return null;
  }
}
