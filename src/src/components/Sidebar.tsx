/**
 * 侧边栏组件
 *
 * 功能：
 * - 快捷命令按钮
 * - 文件上传下载入口
 */

import { useState } from 'react';
import { TerminalSquare, Folder, Home, Eraser, Upload, Download, Loader2 } from 'lucide-react';
import { useTerminalStore } from '../stores/terminalStore';

export function Sidebar() {
  const { activeSessionId, addCommandToSession } = useTerminalStore();
  const [executingCommand, setExecutingCommand] = useState<string | null>(null);

  const quickCommands = [
    { id: 'ls', label: 'ls', icon: Folder, command: 'ls -la' },
    { id: 'pwd', label: 'pwd', icon: TerminalSquare, command: 'pwd' },
    { id: 'home', label: 'cd ~', icon: Home, command: 'cd ~' },
    { id: 'clear', label: 'clear', icon: Eraser, command: 'clear' },
  ];

  const handleQuickCommand = async (command: string, id: string) => {
    if (!activeSessionId || executingCommand) return;

    setExecutingCommand(id);
    await addCommandToSession(activeSessionId, command);
    setTimeout(() => setExecutingCommand(null), 500);
  };

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
      {/* 快捷命令区 */}
      <div className="border-b border-slate-800 p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          快捷命令
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {quickCommands.map((cmd) => {
            const Icon = cmd.icon;
            const isExecuting = executingCommand === cmd.id;
            return (
              <button
                key={cmd.id}
                onClick={() => handleQuickCommand(cmd.command, cmd.id)}
                disabled={!activeSessionId || isExecuting}
                className="group flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 transition-all hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-400" />
                )}
                <span>{cmd.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 文件操作区 */}
      <div className="p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          文件操作
        </h3>
        <div className="space-y-2">
          <button
            className="group flex w-full items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-300 transition-all hover:bg-slate-800 hover:text-slate-100"
            onClick={() => {
              // 触发文件上传
              const input = document.createElement('input');
              input.type = 'file';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file && activeSessionId) {
                  addCommandToSession(activeSessionId, `# 上传文件: ${file.name}`);
                }
              };
              input.click();
            }}
          >
            <Upload className="h-4 w-4 text-slate-400 transition-colors group-hover:text-emerald-400" />
            <span>上传文件</span>
          </button>
          <button
            className="group flex w-full items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-300 transition-all hover:bg-slate-800 hover:text-slate-100"
            onClick={() => {
              if (activeSessionId) {
                addCommandToSession(activeSessionId, '# 输入要下载的文件路径');
              }
            }}
          >
            <Download className="h-4 w-4 text-slate-400 transition-colors group-hover:text-cyan-400" />
            <span>下载文件</span>
          </button>
        </div>
      </div>

      {/* 系统信息 */}
      <div className="mt-auto border-t border-slate-800 p-4">
        <div className="space-y-1 text-xs text-slate-500">
          <p>
            系统状态: <span className="text-emerald-400">● 在线</span>
          </p>
          <p>
            延迟: <span className="text-slate-300">24ms</span>
          </p>
        </div>
      </div>
    </aside>
  );
}
