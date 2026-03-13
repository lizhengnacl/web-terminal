export interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface TerminalSession {
  id: string;
  userId: string;
  ptyProcess: any;
  createdAt: Date;
  lastActivity: Date;
}

export interface WebSocketMessage {
  type: 'input' | 'output' | 'resize' | 'create' | 'close' | 'auth' | 'error' | 'created' | 'closed' | 'exit';
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

export interface LoginAttempt {
  id: number;
  username: string;
  ipAddress: string;
  success: boolean;
  timestamp: number;
}
