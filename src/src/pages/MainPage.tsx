/**
 * 主应用页面模块
 *
 * 功能：
 * - 管理页面布局和导航
 * - 协调终端、文件管理、历史记录三大模块
 * - 处理侧边栏和导航栏交互
 */

import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { TerminalPage } from './TerminalPage';
import { FilesPage } from './FilesPage';
import { HistoryPage } from './HistoryPage';

export function MainPage() {
  const [activeNav, setActiveNav] = useState<'terminal' | 'files' | 'history'>('terminal');

  return (
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* 顶部导航栏 */}
      <Header activeNav={activeNav} onNavChange={setActiveNav} />

      {/* 主体内容 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 - 仅在终端页面显示 */}
        {activeNav === 'terminal' && <Sidebar />}

        {/* 主内容区域 */}
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="terminal" replace />} />
            <Route path="terminal" element={<TerminalPage />} />
            <Route path="files" element={<FilesPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
