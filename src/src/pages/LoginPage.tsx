/**
 * 登录页面模块
 *
 * 功能：
 * - 用户身份验证
 * - 密码输入和验证
 * - 登录状态反馈
 */

import { useState, useCallback } from 'react';
import { Terminal, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export function LoginPage() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const { login } = useAuthStore();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!password.trim()) {
        setError('请输入密码');
        setShake(true);
        setTimeout(() => setShake(false), 300);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const success = await login(password);
        if (!success) {
          setError('密码错误，请重试');
          setShake(true);
          setTimeout(() => setShake(false), 300);
        }
      } catch {
        setError('登录失败，请稍后重试');
      } finally {
        setIsLoading(false);
      }
    },
    [password, login]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        handleSubmit(e);
      }
    },
    [handleSubmit, isLoading]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      {/* 背景装饰 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className={`relative w-full max-w-md ${shake ? 'animate-shake' : ''}`}>
        {/* 登录卡片 */}
        <div className="glass animate-fade-in rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Logo 区域 */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-lg shadow-emerald-500/20">
              <Terminal className="h-8 w-8 text-slate-950" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">在线命令执行器</h1>
            <p className="mt-1 text-sm text-slate-400">安全的远程终端访问</p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                <span className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  访问密码
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="请输入密码"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-slate-100 transition-all placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {error && <p className="animate-fade-in mt-2 text-sm text-red-400">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full transform items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-3 font-semibold text-slate-950 transition-all hover:scale-[1.02] hover:from-emerald-400 hover:to-cyan-400 active:scale-[0.98] disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          {/* 提示信息 */}
          <div className="mt-6 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
            <p className="text-center text-xs text-slate-400">
              演示密码：<span className="font-mono text-emerald-400">admin123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
