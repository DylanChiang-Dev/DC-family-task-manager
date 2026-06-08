# 05 · 认证方案

> 上一篇：[04 API 设计](./04-api.md) ｜ 下一篇：[06 前端架构](./06-frontend.md)

## 1. 为什么不能照搬老系统的 PHP Session

老系统用 PHP 文件 session（`httponly` + `SameSite=Strict` + 24h 超时 + 登录时 `session_regenerate_id`）。但 Cloudflare Workers：

- **无常驻进程、无本地文件系统** → 无法用文件 session。
- **多节点边缘运行** → 节点间不共享内存。

所以改用 **JWT（无状态）+ KV（存可吊销的 refresh token）** 的组合，这是边缘运行时的标准做法。

## 2. 总体方案：双 Token

| Token | 存活 | 存哪 | 用途 |
|-------|------|------|------|
| **Access Token**（JWT） | 短（15 分钟） | 前端内存 / 不持久化 | 每次 API 请求 `Authorization: Bearer` |
| **Refresh Token** | 长（30 天） | 前端 `httpOnly` cookie 或安全存储；服务端 KV 留存以便吊销 | 换发新 access token |

- Access token 自带签名，无需查库即可验证 → 快、适合边缘。
- Refresh token 在 KV 留一份记录（key = tokenId 或 userId+jti），登出/改密码时删除 → 实现"可吊销"。

### Access Token 载荷（claims）
```jsonc
{
  "sub": 123,              // userId
  "username": "alice",
  "currentTeamId": 45,     // 便于无头请求快速取上下文
  "iat": 1750000000,
  "exp": 1750000900        // 15 min
}
```

> ⚠️ 切换团队会改变 `currentTeamId`。两种处理：(a) 切换后重新签发 access token；(b) 不放进 token，改由 `X-Team-Id` 头每请求带、服务端校验成员资格。**推荐 (b)**，token 不必频繁重签，团队上下文更灵活。token 里可保留 currentTeamId 仅作默认值。

## 3. 密码哈希

- 老系统用 **bcrypt cost=10**。Workers 环境下：
  - bcrypt 纯 JS 实现可用但偏慢；
  - 推荐 **scrypt / PBKDF2 via WebCrypto**（Workers 原生支持 `crypto.subtle`），或用经过验证的轻量库。
- ⚠️ 因为老数据不迁移（全新开始），**无需兼容 bcrypt 旧哈希**，可直接选最适合 Workers 的算法。
- 决策：**优先 scrypt（通过成熟库）或 PBKDF2-HMAC-SHA256（WebCrypto，高迭代）**。最终编码时基准测一下 CPU 时间（Workers 单请求有 CPU 限制）。

## 4. 认证流程

### 4.1 注册
```
POST /auth/register
1. Zod 校验（username 3-50、password ≥6、nickname 必填、teamOption）
2. 检查 username 唯一 → 否则 409
3. 哈希密码
4. 事务（D1 batch）：
   - insert user
   - create 模式：生成唯一邀请码 → insert team → insert team_member(admin) → set user.currentTeamId
   - join 模式：校验邀请码 → insert team_member(member) → set user.currentTeamId
5. 直接签发 access + refresh（注册即登录）
6. 返回 { user, accessToken, refreshToken }
```

### 4.2 登录
```
POST /auth/login
1. 取 user by username
2. verify 密码哈希 → 否则 401（信息模糊，不区分用户名/密码错误）
3. 若 currentTeamId 为空 → 取最早加入的团队补上（沿用老系统逻辑）
4. 签发 access + refresh；refresh 记录写入 KV
5. 返回 { user(含当前团队名+角色), accessToken, refreshToken }
```

### 4.3 刷新
```
POST /auth/refresh
1. 校验 refreshToken 签名 + 未过期
2. 在 KV 中核对该 refresh 仍有效（未被登出/吊销）
3. 签发新 access token（可选：滚动刷新，签发新 refresh 并替换 KV 记录）
4. 返回新 token
```

### 4.4 登出
```
POST /auth/logout
1. 从 KV 删除该 refresh 记录 → 立即失效
2. 前端清除本地 token
（access token 因短命，最多 15 分钟后自然失效）
```

### 4.5 改密码 → 全端登出
```
PATCH /profile（带 newPassword）
1. 校验旧密码
2. 更新 password_hash
3. 吊销该用户所有 refresh（KV 按 userId 前缀批量删）→ 强制重新登录
```

## 5. 中间件设计（Hono）

```ts
// middleware/auth.ts
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json(err('UNAUTHORIZED'), 401);
  const payload = await verifyJwt(token, c.env.JWT_SECRET);   // 验签 + exp
  if (!payload) return c.json(err('UNAUTHORIZED'), 401);
  c.set('userId', payload.sub);
  await next();
};

// middleware/team.ts —— 需团队上下文的路由用
export const teamMiddleware: MiddlewareHandler = async (c, next) => {
  const userId = c.get('userId');
  const teamId = Number(c.req.header('X-Team-Id'));
  if (!teamId) return c.json(err('VALIDATION_ERROR', 'No team selected'), 400);
  const isMember = await db.query.teamMembers... // 校验成员
  if (!isMember) return c.json(err('FORBIDDEN'), 403);
  c.set('teamId', teamId);
  await next();
};

// 角色校验（admin-only 端点）
export const requireAdmin: MiddlewareHandler = async (c, next) => {
  // 查 team_members.role === 'admin'，否则 403
};
```

## 6. 机密与配置

| 机密 | 存放 | 注入 |
|------|------|------|
| `JWT_SECRET`（access 签名） | Workers Secret | `wrangler secret put JWT_SECRET` |
| `JWT_REFRESH_SECRET`（可与上分离） | Workers Secret | 同上 |
| `RESEND_API_KEY`（可选邮件） | Workers Secret | 同上 |

- KV 绑定 `SESSIONS`：存 refresh 记录，key 设计如 `refresh:{userId}:{jti}`，value 存元信息 + TTL=30天（KV 原生过期，自动清理）。

## 7. 安全要点（对齐并超越老系统）

| 项 | 做法 |
|----|------|
| 传输 | 全程 HTTPS（CF 默认） |
| Token 泄漏面 | access 短命；refresh 可吊销；改密码全端失效 |
| CSRF | API 用 Bearer 头而非 cookie 携带 access → 天然抗 CSRF；若 refresh 放 cookie 则设 `SameSite=Strict; httpOnly; Secure` |
| 暴力破解 | 登录失败可加 KV 计数限流（按 IP/username，超阈值短暂封禁） |
| 信息泄漏 | 登录失败统一 401，不区分用户名/密码错误 |
| 密码强度 | Zod 校验最小长度，可加复杂度规则 |
| 邀请码 | 维持唯一、随机、足够长（老系统 6 位，可保留或加长） |

## 8. 前端如何用（详见 06）

- 登录后：access 放内存（React state / 模块变量），refresh 由 cookie 或安全存储管理。
- `api-client` 拦截 401 → 自动调 `/auth/refresh` → 重放原请求；refresh 也失败 → 跳登录页。
- 每个受保护请求自动附带 `Authorization` 和 `X-Team-Id`。

## 9. 决策标记

- ✅ JWT(access 15min) + KV(refresh 可吊销) 双 token。
- ✅ 团队上下文走 `X-Team-Id` 头，token 不强绑团队。
- ⚠️ 密码哈希优先 WebCrypto 系（scrypt/PBKDF2），需基准测 CPU 时间；因不迁移老数据，无 bcrypt 兼容负担。
- ❓ refresh 存 cookie 还是前端安全存储：PWA/移动端友好角度，建议 `httpOnly` cookie；最终编码定。
