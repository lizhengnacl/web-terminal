/**
 * 历史记录页面模块
 *
 * 功能：
 * - 查看命令执行历史
 * - 搜索和筛选历史记录
 * - 一键复用命令
 */

import { useState, useMemo } from 'react';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Terminal,
  ChevronDown,
  ChevronUp,
  Play,
  Calendar,
  Filter,
  Trash2,
} from 'lucide-react';
import { useTerminalStore, HistoryItem } from '../stores/terminalStore';
import { useNavigate } from 'react-router-dom';

type StatusFilter = 'all' | 'success' | 'error';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

const StatusBadge = ({ status }: { status: 'success' | 'error' }) => {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" />
        成功
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
      <XCircle className="h-3 w-3" />
      失败
    </span>
  );
};

function HistoryCard({
  item,
  expanded,
  onToggle,
  onReuse,
}: {
  item: HistoryItem;
  expanded: boolean;
  onToggle: () => void;
  onReuse: (command: string) => void;
}) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 transition-all hover:border-slate-700">
      <div className="flex cursor-pointer items-center gap-4 px-4 py-3" onClick={onToggle}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <Terminal className="h-4 w-4 shrink-0 text-slate-500" />
            <code className="truncate font-mono text-sm text-slate-200">{item.command}</code>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {formatTime(item.timestamp)}
            </span>
            <StatusBadge status={item.status} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReuse(item.command);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <Play className="h-3 w-3" />
            复用
          </button>
          <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-3">
          <p className="mb-2 text-xs text-slate-500">命令输出：</p>
          <div className="terminal-scroll max-h-48 space-y-1 overflow-y-auto font-mono text-sm text-slate-300">
            {item.output.length > 0 ? (
              item.output.map((line, index) => (
                <div
                  key={index}
                  className="break-words"
                  dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                />
              ))
            ) : (
              <span className="italic text-slate-500">无输出</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryPage() {
  const { history, sessions, createSession, setActiveSession, addCommandToSession } =
    useTerminalStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    let result = [...history];

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.command.toLowerCase().includes(query));
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter((item) => item.status === statusFilter);
    }

    // 时间筛选
    if (timeFilter !== 'all') {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      switch (timeFilter) {
        case 'today':
          result = result.filter((item) => now - item.timestamp < oneDay);
          break;
        case 'week':
          result = result.filter((item) => now - item.timestamp < 7 * oneDay);
          break;
        case 'month':
          result = result.filter((item) => now - item.timestamp < 30 * oneDay);
          break;
      }
    }

    return result;
  }, [history, searchQuery, statusFilter, timeFilter]);

  const stats = useMemo(() => {
    const total = history.length;
    const success = history.filter((h) => h.status === 'success').length;
    const error = history.filter((h) => h.status === 'error').length;
    return { total, success, error };
  }, [history]);

  const handleReuse = (command: string) => {
    // 确保有活动的终端会话
    let targetSessionId = sessions.find((s) => s.id)?.id;

    if (!targetSessionId) {
      targetSessionId = createSession();
    }

    // 导航到终端页面并执行命令
    navigate('/app/terminal');

    // 稍延迟后添加命令
    setTimeout(() => {
      if (targetSessionId) {
        addCommandToSession(targetSessionId, command);
      }
    }, 100);
  };

  const clearHistory = () => {
    if (confirm('确定要清空所有历史记录吗？')) {
      // 清空历史记录
      useTerminalStore.setState({ history: [] });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 统计栏 */}
      <div className="flex items-center gap-4 border-b border-slate-800 bg-slate-900/30 px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5">
          <span className="text-xs text-slate-500">总计</span>
          <span className="text-sm font-semibold text-slate-200">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5">
          <span className="text-xs text-emerald-500">成功</span>
          <span className="text-sm font-semibold text-emerald-400">{stats.success}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-1.5">
          <span className="text-xs text-red-500">失败</span>
          <span className="text-sm font-semibold text-red-400">{stats.error}</span>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        {/* 搜索框 */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索命令..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2 pl-10 pr-4 text-sm text-slate-200 transition-colors placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
          />
        </div>

        {/* 状态筛选 */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-700 text-slate-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              statusFilter === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            成功
          </button>
          <button
            onClick={() => setStatusFilter('error')}
            className={`rounded px-3 py-1.5 text-sm transition-colors ${
              statusFilter === 'error'
                ? 'bg-red-500/20 text-red-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            失败
          </button>
        </div>

        {/* 时间筛选 */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-500" />
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none"
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">最近7天</option>
            <option value="month">最近30天</option>
          </select>
        </div>

        {/* 清空按钮 */}
        <button
          onClick={clearHistory}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-sm">清空</span>
        </button>
      </div>

      {/* 历史列表 */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onReuse={handleReuse}
            />
          ))
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <Filter className="mb-4 h-12 w-12 opacity-50" />
            <p>没有找到匹配的历史记录</p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setTimeFilter('all');
                }}
                className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
              >
                清除筛选条件
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
