/**
 * 终端状态管理模块
 *
 * 功能：
 * - 管理多个终端会话
 * - 处理命令执行和输出
 * - 连接后端 WebSocket 服务
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TerminalWebSocket } from '../services/terminalService';
import { useAuthStore } from './authStore';

export interface TerminalSession {
  id: string;
  name: string;
  output: string[];
  currentPath: string;
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  command: string;
  timestamp: number;
  output: string[];
  status: 'success' | 'error';
}

interface TerminalState {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  history: HistoryItem[];
  wsClient: TerminalWebSocket | null;
  connected: boolean;
  authenticated: boolean;
  initWebSocket: (token: string) => Promise<void>;
  createSession: () => string;
  closeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  addCommandToSession: (sessionId: string, command: string) => Promise<void>;
  addOutputToSession: (sessionId: string, output: string) => void;
  clearSessionOutput: (sessionId: string) => void;
  getHistory: () => HistoryItem[];
  disconnect: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      history: [],
      wsClient: null,
      connected: false,
      authenticated: false,

      initWebSocket: async (token: string) => {
        console.log('[TerminalStore] Initializing WebSocket with token');
        const client = new TerminalWebSocket(token);

        client.on('*', (message) => {
          console.log('[TerminalStore] Received message:', message);
          
          if (message.type === 'output' && message.sessionId && message.data) {
            console.log('[TerminalStore] Processing output for session:', message.sessionId, 'data:', message.data);
            set((state) => {
              const newSessions = state.sessions.map((s) =>
                s.id === message.sessionId ? { ...s, output: [...s.output, message.data!] } : s
              );
              console.log('[TerminalStore] Updated sessions:', newSessions);
              return { sessions: newSessions };
            });
          }

          if (message.type === 'created' && message.sessionId) {
            console.log('[TerminalStore] Session created, setting up:', message.sessionId);
            const sessionNumber = get().sessions.length + 1;
            const newSession: TerminalSession = {
              id: message.sessionId,
              name: `终端${sessionNumber}`,
              output: ['\x1b[32mConnected to server\x1b[0m\n', ''],
              currentPath: '~',
              createdAt: Date.now(),
            };

            set((state) => ({
              sessions: [...state.sessions, newSession],
              activeSessionId: message.sessionId,
            }));
          }

          if (message.type === 'auth') {
            console.log('[TerminalStore] Auth successful');
            set({ authenticated: true });
            
            // 认证成功后立即创建第一个会话
            setTimeout(() => {
              const currentState = get();
              console.log('[TerminalStore] Current state after auth:', {
                sessionsLength: currentState.sessions.length,
                hasWsClient: !!currentState.wsClient,
                authenticated: currentState.authenticated
              });
              
              if (currentState.sessions.length === 0 && currentState.wsClient) {
                console.log('[TerminalStore] Creating first session after auth');
                currentState.wsClient.createSession(80, 24);
              }
            }, 100);
          }

          if (message.type === 'exit' && message.sessionId) {
            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.id === message.sessionId
                  ? { ...s, output: [...s.output, '\n\x1b[31mSession closed\x1b[0m\n'] }
                  : s
              ),
            }));
          }

          if (message.type === 'closed' && message.sessionId) {
            set((state) => ({
              sessions: state.sessions.filter((s) => s.id !== message.sessionId),
              activeSessionId:
                state.activeSessionId === message.sessionId
                  ? state.sessions[0]?.id || null
                  : state.activeSessionId,
            }));
          }
        });

        try {
          await client.connect();
          console.log('[TerminalStore] WebSocket connected, setting state');
          set({ wsClient: client, connected: true });
        } catch (error) {
          console.error('[TerminalStore] Failed to connect WebSocket:', error);
          throw error;
        }
      },

      createSession: () => {
        console.log('[TerminalStore] createSession called');
        const { wsClient, connected } = get();
        console.log('[TerminalStore] wsClient:', !!wsClient, 'connected:', connected);

        if (!wsClient || !connected) {
          console.error('[TerminalStore] WebSocket not connected');
          return '';
        }

        console.log('[TerminalStore] Calling wsClient.createSession');
        wsClient.createSession(80, 24);

        const tempId = generateId();
        console.log('[TerminalStore] Returning tempId:', tempId);
        return tempId;
      },

      closeSession: (id: string) => {
        const { wsClient, sessions, activeSessionId } = get();

        if (wsClient) {
          wsClient.closeSession(id);
        }

        const newSessions = sessions.filter((s) => s.id !== id);
        let newActiveId = activeSessionId;
        if (activeSessionId === id) {
          newActiveId = newSessions[0]?.id || null;
        }

        set({
          sessions: newSessions,
          activeSessionId: newActiveId,
        });
      },

      setActiveSession: (id: string) => {
        set({ activeSessionId: id });
      },

      addCommandToSession: async (sessionId: string, command: string) => {
        const { wsClient, sessions } = get();
        const session = sessions.find((s) => s.id === sessionId);

        if (!session || !wsClient) return;

        const prompt = `\x1b[32muser@server\x1b[0m:\x1b[34m${session.currentPath}\x1b[0m$ ${command}\n`;

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, output: [...s.output, prompt] } : s
          ),
        }));

        if (command.trim() === 'clear' || command.trim() === 'cls') {
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, output: [] } : s)),
          }));
          return;
        }

        wsClient.sendInput(sessionId, command + '\n');

        if (command.trim() && !command.startsWith('#')) {
          const historyItem: HistoryItem = {
            id: generateId(),
            command,
            timestamp: Date.now(),
            output: [],
            status: 'success',
          };
          set((state) => ({ history: [historyItem, ...state.history].slice(0, 100) }));
        }
      },

      addOutputToSession: (sessionId: string, output: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, output: [...s.output, output] } : s
          ),
        }));
      },

      clearSessionOutput: (sessionId: string) => {
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, output: [] } : s)),
        }));
      },

      getHistory: () => get().history,

      disconnect: () => {
        const { wsClient } = get();
        if (wsClient) {
          wsClient.disconnect();
        }
        set({ wsClient: null, connected: false, authenticated: false });
      },
    }),
    {
      name: 'terminal-storage',
      partialize: (state) => ({ history: state.history }),
    }
  )
);
