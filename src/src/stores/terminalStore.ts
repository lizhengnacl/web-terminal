/**
 * 终端状态管理模块
 *
 * 功能：
 * - 管理多个终端会话
 * - 处理命令执行和输出
 * - 模拟终端交互
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  createSession: () => string;
  closeSession: (id: string) => void;
  setActiveSession: (id: string) => void;
  addCommandToSession: (sessionId: string, command: string) => Promise<void>;
  addOutputToSession: (sessionId: string, output: string) => void;
  clearSessionOutput: (sessionId: string) => void;
  getHistory: () => HistoryItem[];
}

// 生成唯一ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// 模拟命令执行
const executeCommand = async (
  command: string,
  currentPath: string
): Promise<{ output: string[]; newPath: string; status: 'success' | 'error' }> => {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 300 + 100));

  const cmd = command.trim();
  const output: string[] = [];
  let newPath = currentPath;
  let status: 'success' | 'error' = 'success';

  if (cmd === 'clear' || cmd === 'cls') {
    return { output: [], newPath, status };
  }

  if (cmd.startsWith('cd ')) {
    const target = cmd.slice(3).trim();
    if (target === '~' || target === '') {
      newPath = '~';
    } else if (target === '..') {
      newPath = newPath.includes('/') ? newPath.split('/').slice(0, -1).join('/') || '~' : '~';
    } else {
      newPath = newPath === '~' ? `~/${target}` : `${newPath}/${target}`;
    }
  } else if (cmd === 'pwd') {
    output.push(`/home/user${newPath === '~' ? '' : newPath.slice(1)}`);
  } else if (cmd === 'ls' || cmd === 'ls -la') {
    output.push(
      '<span class="ansi-blue ansi-bold">drwxr-xr-x</span> 2 user user 4096 Mar 13 10:00 <span class="ansi-blue ansi-bold">.</span>',
      '<span class="ansi-blue ansi-bold">drwxr-xr-x</span> 5 user user 4096 Mar 13 09:00 <span class="ansi-blue ansi-bold">..</span>',
      '<span class="ansi-green ansi-bold">-rwxr-xr-x</span> 1 user user  234 Mar 13 08:30 <span class="ansi-green">script.sh</span>',
      '<span class="ansi-purple ansi-bold">-rw-r--r--</span> 1 user user 1024 Mar 12 15:20 <span class="ansi-purple">README.md</span>',
      '<span class="ansi-yellow ansi-bold">-rw-r--r--</span> 1 user user  512 Mar 12 14:10 <span class="ansi-yellow">data.json</span>'
    );
  } else if (cmd === 'date') {
    output.push(new Date().toString());
  } else if (cmd === 'whoami') {
    output.push('user');
  } else if (cmd === 'uname -a') {
    output.push('Linux server 5.15.0-91-generic #101-Ubuntu SMP x86_64 GNU/Linux');
  } else if (cmd === 'help' || cmd === '--help') {
    output.push(
      '可用命令：',
      '  cd [dir]     - 切换目录',
      '  pwd          - 显示当前路径',
      '  ls [-la]     - 列出目录内容',
      '  date         - 显示当前时间',
      '  whoami       - 显示当前用户',
      '  uname -a     - 显示系统信息',
      '  clear        - 清空终端',
      '  help         - 显示帮助信息'
    );
  } else if (cmd.startsWith('#')) {
    // 注释/提示，不输出
  } else if (cmd === '') {
    // 空命令
  } else {
    output.push(`<span class="ansi-red">bash: ${cmd.split(' ')[0]}: command not found</span>`);
    status = 'error';
  }

  return { output, newPath, status };
};

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      history: [],

      createSession: () => {
        const id = generateId();
        const sessionNumber = get().sessions.length + 1;
        const newSession: TerminalSession = {
          id,
          name: `终端${sessionNumber}`,
          output: [
            '<span class="ansi-green">Welcome to Online Terminal v1.0</span>',
            '<span class="ansi-muted">Type "help" for available commands</span>',
            '',
          ],
          currentPath: '~',
          createdAt: Date.now(),
        };
        set((state) => ({
          sessions: [...state.sessions, newSession],
          activeSessionId: id,
        }));
        return id;
      },

      closeSession: (id: string) => {
        const { sessions, activeSessionId } = get();
        const newSessions = sessions.filter((s) => s.id !== id);

        let newActiveId = activeSessionId;
        if (activeSessionId === id) {
          // 关闭当前活动会话，切换到上一个
          const closedIndex = sessions.findIndex((s) => s.id === id);
          newActiveId = newSessions[closedIndex - 1]?.id || newSessions[0]?.id || null;
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
        const { sessions, history } = get();
        const session = sessions.find((s) => s.id === sessionId);
        if (!session) return;

        // 添加命令到输出
        const prompt = `<span class="ansi-green">user@server</span>:<span class="ansi-blue">${session.currentPath}</span>$ ${command}`;

        // 处理 clear 命令
        if (command.trim() === 'clear' || command.trim() === 'cls') {
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, output: [] } : s)),
          }));
          return;
        }

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, output: [...s.output, prompt] } : s
          ),
        }));

        // 执行命令
        const result = await executeCommand(command, session.currentPath);

        // 更新输出和路径
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  output: [...s.output, ...result.output, ''],
                  currentPath: result.newPath,
                }
              : s
          ),
        }));

        // 添加到历史记录
        if (command.trim() && !command.startsWith('#')) {
          const historyItem: HistoryItem = {
            id: generateId(),
            command,
            timestamp: Date.now(),
            output: result.output,
            status: result.status,
          };
          set({ history: [historyItem, ...history].slice(0, 100) });
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
    }),
    {
      name: 'terminal-storage',
      partialize: (state) => ({ history: state.history }),
    }
  )
);
