export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'user';
}

export interface TerminalSession {
  id: string;
  userId: string;
  ptyProcess: any;
  createdAt: Date;
  lastActivity: Date;
}

export interface WebSocketMessage {
  type: 'input' | 'output' | 'resize' | 'create' | 'close' | 'auth';
  sessionId?: string;
  data?: string;
  token?: string;
  cols?: number;
  rows?: number;
}

export interface AuthPayload {
  userId: string;
  username: string;
  role: string;
}
