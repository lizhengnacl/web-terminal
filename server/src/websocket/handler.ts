import WebSocket from 'ws';
import { SessionManager } from '../pty/sessionManager';
import { verifyToken } from '../middleware/auth';
import { WebSocketMessage } from '../types';

export class WebSocketHandler {
  private sessionManager: SessionManager;
  private clientSessions: Map<WebSocket, Set<string>> = new Map();

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  handleConnection(ws: WebSocket): void {
    let userId: string | null = null;

    ws.on('message', (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message, userId);
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', data: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      const sessionIds = this.clientSessions.get(ws);
      if (sessionIds) {
        sessionIds.forEach((sessionId) => {
          this.sessionManager.closeSession(sessionId);
        });
        this.clientSessions.delete(ws);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage, userId: string | null): void {
    switch (message.type) {
      case 'auth':
        this.handleAuth(ws, message);
        break;
      case 'create':
        this.handleCreate(ws, message);
        break;
      case 'input':
        this.handleInput(ws, message);
        break;
      case 'resize':
        this.handleResize(ws, message);
        break;
      case 'close':
        this.handleClose(ws, message);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', data: 'Unknown message type' }));
    }
  }

  private handleAuth(ws: WebSocket, message: WebSocketMessage): void {
    if (!message.token) {
      ws.send(JSON.stringify({ type: 'error', data: 'Token required' }));
      return;
    }

    const payload = verifyToken(message.token);
    if (!payload) {
      ws.send(JSON.stringify({ type: 'error', data: 'Invalid token' }));
      return;
    }

    ws.send(JSON.stringify({ type: 'auth', data: 'Authentication successful' }));
  }

  private handleCreate(ws: WebSocket, message: WebSocketMessage): void {
    if (!message.token) {
      ws.send(JSON.stringify({ type: 'error', data: 'Token required' }));
      return;
    }

    const payload = verifyToken(message.token);
    if (!payload) {
      ws.send(JSON.stringify({ type: 'error', data: 'Invalid token' }));
      return;
    }

    const cols = message.cols || 80;
    const rows = message.rows || 24;

    const sessionId = this.sessionManager.createSession(payload.userId, cols, rows);
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      ws.send(JSON.stringify({ type: 'error', data: 'Failed to create session' }));
      return;
    }

    if (!this.clientSessions.has(ws)) {
      this.clientSessions.set(ws, new Set());
    }
    this.clientSessions.get(ws)!.add(sessionId);

    session.ptyProcess.on('data', (data: string) => {
      ws.send(JSON.stringify({ type: 'output', sessionId, data }));
    });

    session.ptyProcess.on('exit', () => {
      ws.send(JSON.stringify({ type: 'exit', sessionId }));
      this.sessionManager.closeSession(sessionId);
    });

    ws.send(JSON.stringify({ type: 'created', sessionId }));
  }

  private handleInput(ws: WebSocket, message: WebSocketMessage): void {
    if (!message.sessionId || !message.data) {
      return;
    }

    const session = this.sessionManager.getSession(message.sessionId);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', data: 'Session not found' }));
      return;
    }

    session.ptyProcess.write(message.data);
    this.sessionManager.updateActivity(message.sessionId);
  }

  private handleResize(ws: WebSocket, message: WebSocketMessage): void {
    if (!message.sessionId || !message.cols || !message.rows) {
      return;
    }

    const session = this.sessionManager.getSession(message.sessionId);
    if (!session) {
      return;
    }

    session.ptyProcess.resize(message.cols, message.rows);
  }

  private handleClose(ws: WebSocket, message: WebSocketMessage): void {
    if (!message.sessionId) {
      return;
    }

    this.sessionManager.closeSession(message.sessionId);

    const sessionIds = this.clientSessions.get(ws);
    if (sessionIds) {
      sessionIds.delete(message.sessionId);
    }

    ws.send(JSON.stringify({ type: 'closed', sessionId: message.sessionId }));
  }
}
