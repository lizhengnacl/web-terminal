# Web Terminal - 在线命令执行器

一个基于 WebSocket 的在线终端系统，支持实时命令执行和交互。

## 🏗️ 系统架构

```
web-terminal/
├── src/                    # 前端代码
│   ├── components/         # React 组件
│   ├── pages/              # 页面组件
│   ├── services/           # API 和 WebSocket 服务
│   ├── stores/             # Zustand 状态管理
│   └── utils/              # 工具函数
└── server/                 # 后端代码
    ├── src/
    │   ├── middleware/     # Koa 中间件
    │   ├── pty/            # PTY 进程管理
    │   ├── routes/         # API 路由
    │   ├── types/          # TypeScript 类型定义
    │   ├── utils/          # 工具函数
    │   └── websocket/      # WebSocket 处理器
    └── package.json
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 前端依赖
pnpm install

# 后端依赖
cd server && pnpm install
```

### 2. 启动服务

#### 方式一：一键启动（推荐）

项目提供了一键启动脚本，会自动安装依赖并启动前后端服务：

**macOS / Linux:**
```bash
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
start.bat
```

#### 方式二：手动启动

```bash
# 启动后端服务器（在 server 目录）
cd server
pnpm run dev

# 启动前端开发服务器（在项目根目录，新开终端窗口）
cd ..
pnpm run dev
```

### 3. 访问应用

- 前端地址: http://localhost:3000
- 后端 API: http://localhost:3001
- WebSocket: ws://localhost:3001

### 4. 登录

使用演示账号登录：
- 用户名: `admin`
- 密码: `admin123`

## 🔧 功能特性

### ✅ 已实现

1. **用户认证**
   - JWT Token 认证
   - 用户登录/注册
   - 密码加密存储

2. **WebSocket 实时通信**
   - 双向通信
   - 自动重连
   - 心跳检测

3. **PTY 进程管理**
   - 真实 Shell 进程
   - 多会话支持
   - 会话隔离

4. **命令过滤**
   - 危险命令拦截
   - 命令白名单
   - 输入消毒

5. **终端功能**
   - 多标签支持
   - ANSI 颜色渲染
   - 自动滚动
   - 快捷键支持

6. **会话管理**
   - 自动清理不活跃会话
   - 会话历史记录
   - 用户会话隔离

### 🚧 待实现

1. **文件操作**
   - 文件上传
   - 文件下载
   - 文件浏览

2. **高级终端功能**
   - 命令自动补全
   - 命令历史搜索
   - 多窗口支持

3. **安全增强**
   - 资源限制（CPU、内存）
   - 审计日志
   - IP 白名单

## 📡 API 文档

### 认证 API

#### POST /auth/login
登录获取 Token

**请求体:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**响应:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "xxx",
    "username": "admin",
    "role": "admin"
  }
}
```

#### POST /auth/register
注册新用户

#### GET /auth/me
获取当前用户信息（需要认证）

### WebSocket 消息格式

#### 客户端 → 服务器

**认证:**
```json
{
  "type": "auth",
  "token": "jwt-token"
}
```

**创建会话:**
```json
{
  "type": "create",
  "token": "jwt-token",
  "cols": 80,
  "rows": 24
}
```

**发送输入:**
```json
{
  "type": "input",
  "sessionId": "session-id",
  "data": "ls -la\n"
}
```

**调整大小:**
```json
{
  "type": "resize",
  "sessionId": "session-id",
  "cols": 120,
  "rows": 40
}
```

**关闭会话:**
```json
{
  "type": "close",
  "sessionId": "session-id"
}
```

#### 服务器 → 客户端

**输出数据:**
```json
{
  "type": "output",
  "sessionId": "session-id",
  "data": "file1.txt\nfile2.txt\n"
}
```

**会话创建成功:**
```json
{
  "type": "created",
  "sessionId": "session-id"
}
```

**会话关闭:**
```json
{
  "type": "closed",
  "sessionId": "session-id"
}
```

## 🔒 安全措施

1. **命令过滤**
   - 阻止危险命令（如 `rm -rf /`）
   - 支持命令白名单
   - 特殊字符转义

2. **认证授权**
   - JWT Token 认证
   - 密码 bcrypt 加密
   - 会话用户隔离

3. **会话管理**
   - 自动清理不活跃会话（30分钟）
   - 用户会话隔离
   - 连接关闭时自动清理

## 🛠️ 技术栈

### 前端
- React 18
- TypeScript
- Zustand (状态管理)
- Tailwind CSS
- Lucide React (图标)
- ansi-to-html (ANSI 转义序列)

### 后端
- Koa.js
- TypeScript
- WebSocket (ws)
- node-pty (伪终端)
- JWT (jsonwebtoken)
- bcryptjs (密码加密)

## 📝 开发说明

### 环境变量

在 `server/.env` 文件中配置：

```env
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
ALLOWED_COMMANDS=ls,pwd,cd,cat,echo,date,whoami,uname,clear,help
```

### 运行格式化

```bash
pnpm run format
```

### 构建生产版本

```bash
# 前端
pnpm run build

# 后端
cd server && pnpm run build
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
