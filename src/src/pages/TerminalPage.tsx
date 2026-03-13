/**
 * 终端页面模块
 *
 * 功能：
 * - 终端标签管理
 * - 命令输入输出
 * - 实时交互
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Plus, X, ScrollText, Copy, Check, Loader2 } from 'lucide-react';
import { useTerminalStore } from '../stores/terminalStore';
import { ansiToHtml } from '../utils/ansi';

export function TerminalPage() {
  const {
    sessions,
    activeSessionId,
    createSession,
    closeSession,
    setActiveSession,
    addCommandToSession,
    connected,
    authenticated,
  } = useTerminalStore();

  const [command, setCommand] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初始化第一个会话
  useEffect(() => {
    if (sessions.length === 0 && connected) {
      createSession();
    }
  }, [sessions.length, connected, createSession]);

  // 自动滚动
  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [sessions, autoScroll]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + T: 新建标签
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        createSession();
      }
      // Ctrl/Cmd + L: 聚焦输入框
      if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Ctrl/Cmd + K: 清空终端
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const session = sessions.find((s) => s.id === activeSessionId);
        if (session) {
          addCommandToSession(activeSessionId!, 'clear');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createSession, sessions, activeSessionId, addCommandToSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !activeSessionId) return;

    await addCommandToSession(activeSessionId, command);
    setCommand('');
  };

  const handleCloseSession = (id: string) => {
    if (sessions.length === 1) {
      setShowCloseConfirm(id);
    } else {
      closeSession(id);
    }
  };

  const handleCopyOutput = useCallback(() => {
    const session = sessions.find((s) => s.id === activeSessionId);
    if (session) {
      const text = session.output.map((line) => line.replace(/<[^>]+>/g, '')).join('\n');
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [sessions, activeSessionId]);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  
  useEffect(() => {
    console.log('[TerminalPage] Current state:', {
      sessionsLength: sessions.length,
      activeSessionId,
      hasActiveSession: !!activeSession,
      activeSessionOutputLength: activeSession?.output?.length || 0
    });
  }, [sessions, activeSessionId, activeSession]);

  if (!connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-950">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-emerald-500" />
        <p className="text-slate-400">正在连接服务器...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-950">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-cyan-500" />
        <p className="text-slate-400">正在验证身份...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-slate-950">
        <Loader2 className="mb-4 h-12 w-12 animate-spin text-emerald-400" />
        <p className="text-slate-400">正在创建终端会话...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-slate-950">
      {/* 调试信息 */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-1 text-xs text-slate-400">
        <span>Debug: sessions={sessions.length}</span>
        <span>activeId={activeSessionId}</span>
        <span>connected={connected ? '✓' : '✗'}</span>
        <span>authenticated={authenticated ? '✓' : '✗'}</span>
        <span>outputLen={activeSession?.output?.length || 0}</span>
      </div>
      
      {/* 标签栏 */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/50 px-2 py-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`group flex min-w-fit cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all ${
              activeSessionId === session.id
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
            }`}
            onClick={() => setActiveSession(session.id)}
          >
            <span className="font-mono">{session.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseSession(session.id);
              }}
              className="rounded p-0.5 opacity-0 transition-all hover:bg-slate-700 group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={createSession}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          title="新建终端 (Ctrl+Shift+T)"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* 终端输出区 */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* 工具栏 */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/30 px-4 py-2">
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-slate-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              自动滚动
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyOutput}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  复制
                </>
              )}
            </button>
            <button
              onClick={() => {
                if (activeSessionId) {
                  addCommandToSession(activeSessionId, 'clear');
                }
              }}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <ScrollText className="h-3 w-3" />
              清空
            </button>
          </div>
        </div>

        {/* 输出内容 */}
        <div
          ref={outputRef}
          className="terminal-scroll terminal-text flex-1 overflow-y-auto bg-[hsl(var(--terminal-bg))] p-4"
        >
          {activeSession ? (
            activeSession.output.length > 0 ? (
              activeSession.output.map((line, index) => {
                console.log('[TerminalPage] Rendering line', index, ':', line);
                return (
                  <div
                    key={index}
                    className="break-words text-[hsl(var(--terminal-text))]"
                    style={{ whiteSpace: 'pre-wrap' }}
                  >
                    {line}
                  </div>
                );
              })
            ) : (
              <div className="italic text-slate-500">等待输入命令...</div>
            )
          ) : (
            <div className="text-slate-500">没有活动的终端会话</div>
          )}
        </div>

        {/* 命令输入区 */}
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 px-4 py-3"
        >
          <span className="shrink-0 font-mono text-sm text-emerald-400">
            {activeSession ? `user@server:${activeSession.currentPath}$` : '$'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="输入命令..."
            className="flex-1 bg-transparent font-mono text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
            disabled={!activeSessionId}
            autoComplete="off"
            spellCheck={false}
          />
        </form>
      </div>

      {/* 关闭确认对话框 */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-fade-in mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-100">关闭最后一个终端？</h3>
            <p className="mb-6 text-slate-400">关闭后将自动创建新的终端会话。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCloseConfirm(null)}
                className="rounded-lg px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                取消
              </button>
              <button
                onClick={() => {
                  closeSession(showCloseConfirm);
                  setShowCloseConfirm(null);
                  createSession();
                }}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20"
              >
                确认关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
