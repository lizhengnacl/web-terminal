import Database from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

const db = new Database('terminal.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS token_blacklist (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    ip_address TEXT,
    success INTEGER NOT NULL,
    timestamp INTEGER NOT NULL
  );
`);

export const initDefaultUser = async () => {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get() as { count: number };

  if (result.count === 0) {
    const hashedPassword = await bcrypt.hash('Admin123', 10);
    const insert = db.prepare(
      'INSERT INTO users (id, username, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    insert.run(uuidv4(), 'admin', hashedPassword, 'admin', Date.now(), Date.now());
    console.log('Default admin user created with password: Admin123');
  }
};

export const createUser = async (username: string, password: string, role: string = 'user'): Promise<User> => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const id = uuidv4();
  const now = Date.now();

  const stmt = db.prepare(
    'INSERT INTO users (id, username, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(id, username, hashedPassword, role, now, now);

  return {
    id,
    username,
    password: hashedPassword,
    role,
  };
};

export const getUserByUsername = (username: string): User | undefined => {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  return stmt.get(username) as User | undefined;
};

export const getUserById = (id: string): User | undefined => {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const addToTokenBlacklist = (token: string, userId: string): void => {
  const stmt = db.prepare('INSERT INTO token_blacklist (token, user_id, created_at) VALUES (?, ?, ?)');
  stmt.run(token, userId, Date.now());
};

export const isTokenBlacklisted = (token: string): boolean => {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM token_blacklist WHERE token = ?');
  const result = stmt.get(token) as { count: number };
  return result.count > 0;
};

export const cleanExpiredTokens = (maxAge: number = 30 * 24 * 60 * 60 * 1000): void => {
  const cutoff = Date.now() - maxAge;
  const stmt = db.prepare('DELETE FROM token_blacklist WHERE created_at < ?');
  stmt.run(cutoff);
};

export const recordLoginAttempt = (username: string, ipAddress: string, success: boolean): void => {
  const stmt = db.prepare(
    'INSERT INTO login_attempts (username, ip_address, success, timestamp) VALUES (?, ?, ?, ?)'
  );
  stmt.run(username, ipAddress, success ? 1 : 0, Date.now());
};

export const getRecentFailedAttempts = (username: string, minutes: number = 15): number => {
  const cutoff = Date.now() - minutes * 60 * 1000;
  const stmt = db.prepare(
    'SELECT COUNT(*) as count FROM login_attempts WHERE username = ? AND success = 0 AND timestamp > ?'
  );
  const result = stmt.get(username, cutoff) as { count: number };
  return result.count;
};

export const updateUserPassword = async (userId: string, newPassword: string): Promise<void> => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const stmt = db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?');
  stmt.run(hashedPassword, Date.now(), userId);
};

export const deleteUser = (userId: string): void => {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(userId);
};

export const closeDatabase = (): void => {
  db.close();
};

process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
