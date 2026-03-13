import WebSocket from 'ws';
import { SessionManager } from '../pty/sessionManager';
import { verifyToken } from '../middleware/auth';
import { WebSocketMessage } from '../types';

export class WebSocketHandler {
  private sessionManager: SessionManager;
  private clientSessions: Map<WebSocket, { userId: string | null; sessionIds: Set<string> }> = new Map();

  constructor(sessionManager: SessionManager) {
    this.sessionManager = sessionManager;
  }

  handleConnection(ws: WebSocket): void {
    const clientInfo = { userId: null, sessionIds: new Set<string>() };
    this.clientSessions.set(ws, clientInfo);

    ws.on('message', (data) => {
      try {
        const messageData = typeof data === 'string' ? data : data.toString();
        const message: WebSocketMessage = JSON.parse(messageData);
        this.handleMessage(ws, message);
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', data: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      const info = this.clientSessions.get(ws);
      if (info) {
        info.sessionIds.forEach((sessionId) => {
          this.sessionManager.closeSession(sessionId);
        });
      }
      this.clientSessions.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.send(JSON.stringify({ type: 'connected', data: 'Please authenticate' }));
  }

  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    console.log('[WebSocketHandler] Received message:', message);
    
    const clientInfo = this.clientSessions.get(ws);
    if (!clientInfo) {
      ws.send(JSON.stringify({ type: 'error', data: 'Client not found' }));
      return;
    }

    switch (message.type) {
      case 'auth':
        this.handleAuth(ws, message, clientInfo);
        break;
      case 'create':
        this.handleCreate(ws, message, clientInfo);
        break;
      case 'input':
        this.handleInput(ws, message, clientInfo);
        break;
      case 'resize':
        this.handleResize(ws, message, clientInfo);
        break;
      case 'close':
        this.handleClose(ws, message, clientInfo);
        break;
      default:
        ws.send(JSON.stringify({ type: 'error', data: 'Unknown message type' }));
    }
  }

  private handleAuth(
    ws: WebSocket,
    message: WebSocketMessage,
    clientInfo: { userId: string | null; sessionIds: Set<string> }
  ): void {
    console.log('[WebSocketHandler] Handling auth message');
    
    if (!message.token) {
      ws.send(JSON.stringify({ type: 'error', data: 'Token required' }));
      ws.close();
      return;
    }

    const payload = verifyToken(message.token);
    if (!payload) {
      ws.send(JSON.stringify({ type: 'error', data: 'Invalid or expired token' }));
      ws.close();
      return;
    }

    console.log('[WebSocketHandler] Auth successful for user:', payload.userId);
    clientInfo.userId = payload.userId;
    ws.send(JSON.stringify({ type: 'auth', data: 'Authentication successful' }));
  }

  private handleCreate(
    ws: WebSocket,
    message: WebSocketMessage,
    clientInfo: { userId: string | null; sessionIds: Set<string> }
  ): void {
    console.log('[WebSocketHandler] Handling create session message');
    
    if (!clientInfo.userId) {
      ws.send(JSON.stringify({ type: 'error', data: 'Not authenticated' }));
      return;
    }

    const cols = message.cols || 80;
    const rows = message.rows || 24;

    console.log('[WebSocketHandler] Creating session with cols:', cols, 'rows:', rows);
    const sessionId = this.sessionManager.createSession(clientInfo.userId, cols, rows);
    console.log('[WebSocketHandler] Session created with ID:', sessionId);
    
    const session = this.sessionManager.getSession(sessionId);

    if (!session) {
      ws.send(JSON.stringify({ type: 'error', data: 'Failed to create session' }));
      return;
    }

    clientInfo.sessionIds.add(sessionId);

    session.ptyProcess.on('data', (data: string) => {
      console.log('[WebSocketHandler] Sending output data for session:', sessionId, 'data length:', data.length);
      ws.send(JSON.stringify({ type: 'output', sessionId, data }));
    });

    session.ptyProcess.on('exit', () => {
      console.log('[WebSocketHandler] Session exited:', sessionId);
      ws.send(JSON.stringify({ type: 'exit', sessionId }));
      this.sessionManager.closeSession(sessionId);
      clientInfo.sessionIds.delete(sessionId);
    });

    console.log('[WebSocketHandler] Sending created message with sessionId:', sessionId);
    ws.send(JSON.stringify({ type: 'created', sessionId }));
  }

  private handleInput(
    ws: WebSocket,
    message: WebSocketMessage,
    clientInfo: { userId: string | null; sessionIds: Set<string> }
  ): void {
    console.log('[WebSocketHandler] handleInput called with message:', message);
    
    if (!clientInfo.userId) {
      ws.send(JSON.stringify({ type: 'error', data: 'Not authenticated' }));
      return;
    }

    if (!message.sessionId || !message.data) {
      console.log('[WebSocketHandler] Missing sessionId or data');
      return;
    }

    console.log('[WebSocketHandler] Looking for session:', message.sessionId);
    const session = this.sessionManager.getSession(message.sessionId);
    if (!session) {
      console.log('[WebSocketHandler] Session not found');
      ws.send(JSON.stringify({ type: 'error', data: 'Session not found' }));
      return;
    }

    if (session.userId !== clientInfo.userId) {
      console.log('[WebSocketHandler] Unauthorized session access');
      ws.send(JSON.stringify({ type: 'error', data: 'Unauthorized session access' }));
      return;
    }

    console.log('[WebSocketHandler] Writing data to PTY:', JSON.stringify(message.data));
    session.ptyProcess.write(message.data);
    this.sessionManager.updateActivity(message.sessionId);
  }

  private handleResize(
    ws: WebSocket,
    message: WebSocketMessage,
    clientInfo: { userId: string | null; sessionIds: Set<string> }
  ): void {
    if (!clientInfo.userId || !message.sessionId || !message.cols || !message.rows) {
      return;
    }

    const session = this.sessionManager.getSession(message.sessionId);
    if (!session || session.userId !== clientInfo.userId) {
      return;
    }

    session.ptyProcess.resize(message.cols, message.rows);
  }

  private handleClose(
    ws: WebSocket,
    message: WebSocketMessage,
    clientInfo: { userId: string | null; sessionIds: Set<string> }
  ): void {
    if (!clientInfo.userId || !message.sessionId) {
      return;
    }

    const session = this.sessionManager.getSession(message.sessionId);
    if (!session || session.userId !== clientInfo.userId) {
      return;
    }

    this.sessionManager.closeSession(message.sessionId);
    clientInfo.sessionIds.delete(message.sessionId);

    ws.send(JSON.stringify({ type: 'closed', sessionId: message.sessionId }));
  }
}
