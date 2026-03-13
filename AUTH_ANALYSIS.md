# 账号登录、校验、鉴权流程分析

## 📋 流程梳理

### 1️⃣ 登录流程

#### 前端流程

**LoginPage.tsx:**
```
用户输入用户名和密码
    ↓
点击登录按钮
    ↓
handleSubmit()
    ↓
login(username, password)
```

**authStore.ts:**
```
login() 调用
    ↓
apiLogin(username, password)
    ↓
POST /auth/login
    ↓
接收响应
    ↓
设置 isAuthenticated = true
    ↓
保存 token 和 user 到 state
    ↓
persist 中间件保存到 localStorage
```

**LoginPage.tsx (登录成功后):**
```
获取 token
    ↓
initWebSocket(token)
    ↓
WebSocket 连接建立
```

#### 后端流程

**auth.ts (POST /auth/login):**
```
接收用户名和密码
    ↓
验证参数完整性
    ↓
从内存 Map 查找用户
    ↓
bcrypt.compare() 验证密码
    ↓
generateToken() 生成 JWT
    ↓
返回 { token, user }
```

**auth.ts (generateToken):**
```
创建 JWT Payload
    ↓
jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
    ↓
返回 token
```

### 2️⃣ 校验流程

#### 前端路由校验

**App.tsx:**
```
应用启动
    ↓
useAuthStore() 获取状态
    ↓
读取 isAuthenticated
    ↓
根据状态决定路由
    ↓
已认证 → /app
未认证 → /login
```

**authStore.ts (persist 中间件):**
```
应用启动时
    ↓
从 localStorage 读取状态
    ↓
恢复 token 和 isAuthenticated
    ↓
state 初始化完成
```

#### Token 有效性校验

**authStore.ts (checkAuth):**
```
获取 token
    ↓
如果 token 存在
    ↓
getMe(token)
    ↓
GET /auth/me (带 Authorization header)
    ↓
验证成功 → 更新 user 信息
验证失败 → 清除认证状态
```

**后端 auth.ts (GET /auth/me):**
```
authMiddleware 拦截
    ↓
提取 Authorization header
    ↓
jwt.verify() 验证 token
    ↓
验证成功 → ctx.state.user = decoded
验证失败 → 返回 401
    ↓
返回用户信息
```

### 3️⃣ 鉴权流程

#### HTTP API 鉴权

```
前端请求
    ↓
设置 Authorization: Bearer <token>
    ↓
发送请求到后端
    ↓
后端 authMiddleware 拦截
    ↓
提取 token
    ↓
jwt.verify() 验证
    ↓
验证成功 → 继续处理请求
验证失败 → 返回 401
```

#### WebSocket 鉴权

```
前端 initWebSocket(token)
    ↓
创建 WebSocket 连接
    ↓
发送 { type: 'auth', token }
    ↓
后端 WebSocket handler
    ↓
verifyToken(token)
    ↓
验证成功 → 连接建立
验证失败 → 发送错误消息
    ↓
后续操作需要 token
```

---

## ❌ 存在的问题

### 🔴 严重问题

#### 1. 用户数据未持久化

**问题位置：** [server/src/routes/auth.ts:9](file:///Users/bytedance/code/web-terminal/server/src/routes/auth.ts#L9)

**问题描述：**
```typescript
const users: Map<string, User> = new Map();
```

**影响：**
- 后端重启后所有用户数据丢失
- 注册的用户无法保留
- 只能使用硬编码的 admin 账号

**解决方案：**
- 使用数据库（MongoDB、PostgreSQL、MySQL）
- 或使用文件存储（JSON 文件）

---

#### 2. Token 刷新机制缺失

**问题位置：** [server/src/middleware/auth.ts:33](file:///Users/bytedance/code/web-terminal/server/src/middleware/auth.ts#L33)

**问题描述：**
```typescript
return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
```

**影响：**
- Token 24小时后过期
- 用户必须重新登录
- 影响用户体验

**解决方案：**
- 实现 refresh token 机制
- 或实现自动续期机制

---

#### 3. WebSocket 认证不完善

**问题位置：** [server/src/websocket/handler.ts:59-69](file:///Users/bytedance/code/web-terminal/server/src/websocket/handler.ts#L59-L69)

**问题描述：**
```typescript
private handleCreate(ws: WebSocket, message: WebSocketMessage): void {
  if (!message.token) {
    ws.send(JSON.stringify({ type: 'error', data: 'Token required' }));
    return;
  }
  // 只验证了 token 存在，没有验证有效性
  const payload = verifyToken(message.token);
  if (!payload) {
    ws.send(JSON.stringify({ type: 'error', data: 'Invalid token' }));
    return;
  }
  // 创建会话...
}
```

**影响：**
- 每次创建会话都需要传递 token
- 没有在连接建立时统一验证
- 安全性较低

**解决方案：**
- 在 WebSocket 连接建立时立即验证 token
- 验证失败直接关闭连接
- 后续操作无需重复验证

---

#### 4. 前端认证状态不可靠

**问题位置：** [src/src/stores/authStore.ts:95-98](file:///Users/bytedance/code/web-terminal/src/src/stores/authStore.ts#L95-L98)

**问题描述：**
```typescript
partialize: (state) => ({
  token: state.token,
  isAuthenticated: state.isAuthenticated,
}),
```

**影响：**
- 只依赖 localStorage 中的 `isAuthenticated` 标志
- 用户可以手动修改 localStorage 绕过认证
- Token 可能已过期但状态仍为已认证

**解决方案：**
- 应用启动时验证 token 有效性
- 不存储 `isAuthenticated`，而是根据 token 存在性判断
- 定期验证 token 状态

---

### 🟡 中等问题

#### 5. 密码强度未验证

**问题位置：** [server/src/routes/auth.ts:60-67](file:///Users/bytedance/code/web-terminal/server/src/routes/auth.ts#L60-L67)

**问题描述：**
```typescript
router.post('/register', async (ctx) => {
  const { username, password } = ctx.request.body as any;
  
  if (!username || !password) {
    ctx.status = 400;
    ctx.body = { error: 'Username and password required' };
    return;
  }
  // 没有验证密码强度
```

**影响：**
- 用户可以设置弱密码
- 容易被暴力破解

**解决方案：**
- 验证密码长度（至少8位）
- 验证密码复杂度（大小写、数字、特殊字符）
- 使用 zxcvbn 等库评估密码强度

---

#### 6. 登录失败次数未限制

**问题位置：** [server/src/routes/auth.ts:21-58](file:///Users/bytedance/code/web-terminal/server/src/routes/auth.ts#L21-L58)

**问题描述：**
- 没有登录失败次数限制
- 没有账户锁定机制

**影响：**
- 容易遭受暴力破解攻击
- 容易遭受撞库攻击

**解决方案：**
- 记录登录失败次数
- 失败次数过多时锁定账户
- 实现 IP 限流

---

#### 7. Token 无法主动撤销

**问题位置：** 整个认证系统

**问题描述：**
- JWT token 一旦签发无法撤销
- 用户登出后 token 仍然有效

**影响：**
- 安全风险
- 无法强制用户下线

**解决方案：**
- 实现 token 黑名单
- 使用 Redis 存储已撤销的 token
- 或使用短期 token + refresh token

---

#### 8. 未在应用启动时验证 Token

**问题位置：** [src/src/App.tsx:58-80](file:///Users/bytedance/code/web-terminal/src/src/App.tsx#L58-L80)

**问题描述：**
```typescript
function App() {
  const { isAuthenticated } = useAuthStore();
  // 没有调用 checkAuth() 验证 token
```

**影响：**
- Token 可能已过期但前端仍认为已认证
- 用户看到已认证界面但实际无法访问资源

**解决方案：**
- 在 App 组件 useEffect 中调用 checkAuth()
- 验证 token 有效性后再决定路由

---

### 🟢 轻微问题

#### 9. 错误信息不够详细

**问题位置：** [server/src/routes/auth.ts:31-42](file:///Users/bytedance/code/web-terminal/server/src/routes/auth.ts#L31-L42)

**问题描述：**
```typescript
ctx.body = { error: 'Invalid credentials' };
```

**影响：**
- 用户不知道是用户名错误还是密码错误
- 影响用户体验

**解决方案：**
- 提供更详细的错误信息
- 但要注意不要泄露敏感信息

---

#### 10. 缺少审计日志

**问题描述：**
- 没有记录用户登录、登出操作
- 没有记录敏感操作

**影响：**
- 无法追溯安全事件
- 无法分析用户行为

**解决方案：**
- 记录所有认证相关操作
- 存储到数据库或日志文件

---

#### 11. 缺少密码重置功能

**问题描述：**
- 用户忘记密码无法找回
- 没有密码重置流程

**影响：**
- 用户体验差
- 管理员需要手动重置

**解决方案：**
- 实现邮件验证的密码重置
- 或安全问题验证

---

#### 12. 缺少多设备登录控制

**问题描述：**
- 同一账号可以在多个设备登录
- 没有设备管理功能

**影响：**
- 安全风险
- 无法踢出其他设备

**解决方案：**
- 记录活跃会话
- 提供设备管理界面
- 允许用户踢出其他设备

---

## 🔧 优先级修复建议

### P0 - 立即修复

1. **用户数据持久化** - 使用数据库存储用户信息
2. **应用启动时验证 Token** - 在 App.tsx 中调用 checkAuth()
3. **WebSocket 认证完善** - 连接建立时立即验证 token

### P1 - 尽快修复

4. **Token 刷新机制** - 实现 refresh token 或自动续期
5. **密码强度验证** - 添加密码复杂度要求
6. **登录失败限制** - 实现账户锁定机制

### P2 - 计划修复

7. **Token 撤销机制** - 实现 token 黑名单
8. **审计日志** - 记录认证操作
9. **密码重置** - 实现密码找回功能
10. **多设备管理** - 会话管理功能

---

## 📊 当前流程图

```
┌─────────────────────────────────────────────────────────────┐
│                        登录流程                              │
└─────────────────────────────────────────────────────────────┘

用户输入 → LoginPage → authStore.login() → API /auth/login
    ↓
后端验证用户名密码
    ↓
生成 JWT Token (24h)
    ↓
返回 { token, user }
    ↓
前端保存到 localStorage
    ↓
initWebSocket(token)
    ↓
WebSocket 连接建立
    ↓
发送认证消息
    ↓
验证 token
    ↓
连接成功


┌─────────────────────────────────────────────────────────────┐
│                        校验流程                              │
└─────────────────────────────────────────────────────────────┘

应用启动
    ↓
读取 localStorage
    ↓
恢复认证状态
    ↓
根据 isAuthenticated 决定路由
    ↓
❌ 问题：未验证 token 有效性


┌─────────────────────────────────────────────────────────────┐
│                        鉴权流程                              │
└─────────────────────────────────────────────────────────────┘

HTTP 请求
    ↓
添加 Authorization header
    ↓
后端 authMiddleware
    ↓
验证 JWT
    ↓
允许/拒绝访问

WebSocket 操作
    ↓
传递 token
    ↓
验证 token
    ↓
允许/拒绝操作
```

---

## ✅ 安全检查清单

- [x] 密码使用 bcrypt 加密
- [x] JWT Token 签名验证
- [x] Token 过期时间设置
- [x] HTTP API 认证中间件
- [x] WebSocket 认证机制
- [ ] 用户数据持久化
- [ ] Token 刷新机制
- [ ] Token 撤销机制
- [ ] 密码强度验证
- [ ] 登录失败限制
- [ ] 审计日志
- [ ] 密码重置功能
- [ ] 多设备管理
- [ ] 应用启动时验证 token
- [ ] WebSocket 连接时立即认证
