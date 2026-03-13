/**
 * 文件管理页面模块
 *
 * 功能：
 * - 文件上传、下载
 * - 目录浏览
 * - 文件操作
 */

import { useState, useRef, useCallback } from 'react';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  RefreshCw,
  Search,
  FileText,
  Image,
  FileCode,
  MoreVertical,
  Trash2,
  Edit,
  Copy,
} from 'lucide-react';

interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  size?: string;
  modified?: string;
  children?: FileNode[];
  expanded?: boolean;
}

const mockFileTree: FileNode[] = [
  {
    id: '1',
    name: 'workspace',
    type: 'directory',
    expanded: true,
    children: [
      {
        id: '1-1',
        name: 'projects',
        type: 'directory',
        expanded: false,
        children: [
          { id: '1-1-1', name: 'web-app', type: 'directory', children: [] },
          { id: '1-1-2', name: 'api-server', type: 'directory', children: [] },
        ],
      },
      {
        id: '1-2',
        name: 'documents',
        type: 'directory',
        expanded: false,
        children: [
          { id: '1-2-1', name: 'README.md', type: 'file', size: '2.4 KB', modified: '2026-03-13' },
          { id: '1-2-2', name: 'notes.txt', type: 'file', size: '1.1 KB', modified: '2026-03-12' },
        ],
      },
      { id: '1-3', name: 'script.sh', type: 'file', size: '4.2 KB', modified: '2026-03-10' },
    ],
  },
  {
    id: '2',
    name: 'logs',
    type: 'directory',
    expanded: false,
    children: [
      { id: '2-1', name: 'app.log', type: 'file', size: '12.5 MB', modified: '2026-03-13' },
      { id: '2-2', name: 'error.log', type: 'file', size: '856 KB', modified: '2026-03-13' },
    ],
  },
  { id: '3', name: '.bashrc', type: 'file', size: '3.2 KB', modified: '2026-01-15' },
  { id: '4', name: '.ssh', type: 'directory', expanded: false, children: [] },
];

const getFileIcon = (name: string, type: 'file' | 'directory') => {
  if (type === 'directory') return <Folder className="h-4 w-4 text-yellow-400" />;

  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext || '')) {
    return <Image className="h-4 w-4 text-purple-400" />;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext || '')) {
    return <FileCode className="h-4 w-4 text-blue-400" />;
  }
  if (['md', 'txt', 'json', 'yml', 'yaml'].includes(ext || '')) {
    return <FileText className="h-4 w-4 text-emerald-400" />;
  }
  return <File className="h-4 w-4 text-slate-400" />;
};

function FileTreeItem({
  node,
  level = 0,
  selectedId,
  onSelect,
  onToggle,
}: {
  node: FileNode;
  level?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const isSelected = selectedId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div>
      <div
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
          isSelected ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-300 hover:bg-slate-800'
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node.id)}
      >
        {node.type === 'directory' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="rounded p-0.5 hover:bg-slate-700"
          >
            {node.expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        {node.type === 'file' && <span className="w-4" />}
        {getFileIcon(node.name, node.type)}
        <span className="truncate text-sm">{node.name}</span>
      </div>
      {node.expanded &&
        node.children?.map((child) => (
          <FileTreeItem
            key={child.id}
            node={child}
            level={level + 1}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

export function FilesPage() {
  const [fileTree, setFileTree] = useState<FileNode[]>(mockFileTree);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleNode = useCallback((id: string) => {
    const updateTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, expanded: !node.expanded };
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    };
    setFileTree((prev) => updateTree(prev));
  }, []);

  const findNode = useCallback((nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const selectedNode = selectedId ? findNode(fileTree, selectedId) : null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      simulateUpload(files[0].name);
    }
  };

  const simulateUpload = (filename: string) => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 100) {
          clearInterval(interval);
          return null;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      simulateUpload(file.name);
    }
  };

  return (
    <div className="flex h-full">
      {/* 左侧目录树 */}
      <div className="flex w-64 flex-col border-r border-slate-800 bg-slate-900/30">
        {/* 工具栏 */}
        <div className="flex items-center gap-2 border-b border-slate-800 p-3">
          <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索..."
              className="w-full rounded border border-slate-700 bg-slate-800 py-1 pl-7 pr-2 text-xs text-slate-300 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* 目录树 */}
        <div className="flex-1 overflow-y-auto p-2">
          {fileTree.map((node) => (
            <FileTreeItem
              key={node.id}
              node={node}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggle={toggleNode}
            />
          ))}
        </div>
      </div>

      {/* 右侧内容区 */}
      <div className="flex flex-1 flex-col">
        {/* 上传区域 */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`m-4 rounded-xl border-2 border-dashed p-8 transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
          }`}
        >
          <div className="text-center">
            <Upload className="mx-auto mb-3 h-10 w-10 text-slate-500" />
            <p className="mb-1 font-medium text-slate-300">拖拽文件到此处上传</p>
            <p className="mb-4 text-sm text-slate-500">或</p>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
            >
              选择文件
            </button>
          </div>

          {uploadProgress !== null && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 文件详情 */}
        <div className="flex-1 px-4 pb-4">
          {selectedNode ? (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(selectedNode.name, selectedNode.type)}
                  <div>
                    <h3 className="font-medium text-slate-200">{selectedNode.name}</h3>
                    <p className="text-sm text-slate-500">
                      {selectedNode.type === 'directory' ? '文件夹' : '文件'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {selectedNode.type === 'file' && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="mb-1 text-slate-500">大小</p>
                    <p className="text-slate-300">{selectedNode.size}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-slate-500">修改时间</p>
                    <p className="text-slate-300">{selectedNode.modified}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 flex gap-2 border-t border-slate-800 pt-4">
                {selectedNode.type === 'file' && (
                  <button className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-400 transition-colors hover:bg-emerald-500/20">
                    <Download className="h-4 w-4" />
                    下载
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500">
              <p>选择文件或文件夹查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
