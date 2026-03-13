/**
 * 顶部导航栏组件
 *
 * 功能：
 * - 提供全局导航
 * - 用户信息展示
 * - 登出功能
 */

import { Terminal, FolderOpen, History, Settings, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useState } from 'react';

interface HeaderProps {
  activeNav: 'terminal' | 'files' | 'history';
  onNavChange: (nav: 'terminal' | 'files' | 'history') => void;
}

export function Header({ activeNav, onNavChange }: HeaderProps) {
  const { logout } = useAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = [
    { id: 'terminal' as const, label: '终端', icon: Terminal },
    { id: 'files' as const, label: '文件', icon: FolderOpen },
    { id: 'history' as const, label: '历史', icon: History },
  ];

  const handleLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  return (
    <header className="z-50 flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 backdrop-blur">
      {/* Logo 和导航 */}
      <div className="flex items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
            <Terminal className="h-4 w-4 text-slate-950" />
          </div>
          <span className="hidden font-semibold text-slate-100 sm:block">在线命令执行器</span>
        </div>

        {/* 导航链接 */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavChange(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 右侧操作区 */}
      <div className="flex items-center gap-2">
        {/* 设置按钮 */}
        <button className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
          <Settings className="h-4 w-4" />
        </button>

        {/* 用户状态 */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
            <User className="h-3 w-3 text-emerald-400" />
          </div>
          <span className="hidden text-sm text-slate-300 md:block">已登录</span>
        </div>

        {/* 登出按钮 */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden text-sm sm:block">退出</span>
        </button>
      </div>

      {/* 退出确认对话框 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-fade-in mx-4 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-slate-100">确认退出？</h3>
            <p className="mb-6 text-slate-400">退出后将需要重新登录。</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg px-4 py-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                取消
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-400 transition-colors hover:bg-red-500/20"
              >
                确认退出
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
