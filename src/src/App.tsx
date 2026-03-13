/**
 * 在线命令执行器 - 主入口文件
 *
 * 功能：
 * - 管理应用路由和全局状态
 * - 处理登录认证状态
 * - 配置 Tailwind 主题
 */

import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './global.css';
import { LoginPage } from './pages/LoginPage';
import { MainPage } from './pages/MainPage';
import { useAuthStore } from './stores/authStore';

// 配置 Tailwind 主题
if (typeof window !== 'undefined' && (window as any).tailwind) {
  (window as any).tailwind.config = {
    ...(window as any).tailwind.config,
    theme: {
      extend: {
        colors: {
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          card: 'hsl(var(--card))',
          'card-foreground': 'hsl(var(--card-foreground))',
          primary: 'hsl(var(--primary))',
          'primary-foreground': 'hsl(var(--primary-foreground))',
          secondary: 'hsl(var(--secondary))',
          'secondary-foreground': 'hsl(var(--secondary-foreground))',
          muted: 'hsl(var(--muted))',
          'muted-foreground': 'hsl(var(--muted-foreground))',
          accent: 'hsl(var(--accent))',
          'accent-foreground': 'hsl(var(--accent-foreground))',
          destructive: 'hsl(var(--destructive))',
          'destructive-foreground': 'hsl(var(--destructive-foreground))',
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          terminal: {
            bg: 'hsl(var(--terminal-bg))',
            text: 'hsl(var(--terminal-text))',
            green: 'hsl(var(--terminal-green))',
            blue: 'hsl(var(--terminal-blue))',
            red: 'hsl(var(--terminal-red))',
            yellow: 'hsl(var(--terminal-yellow))',
            purple: 'hsl(var(--terminal-purple))',
          },
        },
        fontFamily: {
          mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
        },
      },
    },
  };
}

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/app" replace /> : <LoginPage />}
        />
        <Route
          path="/app/*"
          element={isAuthenticated ? <MainPage /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </HashRouter>
  );
}

export default App;
