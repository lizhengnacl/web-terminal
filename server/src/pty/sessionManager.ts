import { v4 as uuidv4 } from 'uuid';
import { PTYProcess } from './process';
import { TerminalSession } from '../types';

export class SessionManager {
  private sessions: Map<string, TerminalSession> = new Map();
  private userSessions: Map<string, Set<string>> = new Map();

  createSession(userId: string, cols: number = 80, rows: number = 24): string {
    const sessionId = uuidv4();
    const ptyProcess = new PTYProcess();

    const session: TerminalSession = {
      id: sessionId,
      userId,
      ptyProcess,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);

    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId)!.add(sessionId);

    ptyProcess.start(cols, rows);

    return sessionId;
  }

  getSession(sessionId: string): TerminalSession | undefined {
    return this.sessions.get(sessionId);
  }

  getUserSessions(userId: string): TerminalSession[] {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return [];

    return Array.from(sessionIds)
      .map((id) => this.sessions.get(id))
      .filter((session): session is TerminalSession => session !== undefined);
  }

  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.ptyProcess.kill();

    this.sessions.delete(sessionId);

    const userSessionIds = this.userSessions.get(session.userId);
    if (userSessionIds) {
      userSessionIds.delete(sessionId);
      if (userSessionIds.size === 0) {
        this.userSessions.delete(session.userId);
      }
    }

    return true;
  }

  closeUserSessions(userId: string): void {
    const sessionIds = this.userSessions.get(userId);
    if (!sessionIds) return;

    sessionIds.forEach((sessionId) => {
      this.closeSession(sessionId);
    });
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  cleanupInactiveSessions(maxInactiveTime: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleanedCount = 0;

    this.sessions.forEach((session, sessionId) => {
      const inactiveTime = now - session.lastActivity.getTime();
      if (inactiveTime > maxInactiveTime) {
        this.closeSession(sessionId);
        cleanedCount++;
      }
    });

    return cleanedCount;
  }
}
