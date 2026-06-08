# 04 · API 设计

> 上一篇：[03 数据库](./03-database.md) ｜ 下一篇：[05 认证](./05-auth.md)

## 1. 设计原则

- **RESTful 资源路由**，告别老系统 `?action=xxx` 的查询参数风格，改用 HTTP 方法 + 路径表达语义。
- **统一响应封套**，前端处理一致。
- **JWT 鉴权**，无状态（细节见 05）。
- **Zod 校验**所有输入，校验 schema 来自 `packages/shared`。
- 所有业务路由都隐含"当前团队"上下文（来自 JWT/请求头），返回数据按团队隔离。

## 2. 统一响应封套

成功：
```jsonc
{ "success": true, "data": <T> }
```
失败：
```jsonc
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Title is required", "details": [/* zod issues, 可选 */] }
}
```

- HTTP 状态码语义化：200/201/204、400/401/403/404/409、500。
- 错误 `code` 枚举（示意）：`VALIDATION_ERROR` `UNAUTHORIZED` `FORBIDDEN` `NOT_FOUND` `CONFLICT` `INTERNAL`。

## 3. 路由前缀与版本

- 基础路径：`/api`（Pages 与 Workers 分离部署，前端用绝对 `VITE_API_BASE_URL`）。
- 预留版本：`/api/v1/...`（初期可省略，文档按无版本写，编码时决定是否加 `v1`）。

## 4. 鉴权与团队上下文约定

- 受保护端点要求 `Authorization: Bearer <accessToken>`。
- "当前团队"通过 **请求头 `X-Team-Id`** 或 JWT 内的 `currentTeamId` 传递；服务端 `team` 中间件校验该用户是该团队成员，否则 403。
- 切换团队是显式操作（`POST /teams/switch`），同时更新 `users.current_team_id` 并可影响后续 token。

> ⚠️ 与老系统差异：老系统当前团队存在 PHP session；新系统无状态，需每请求带上下文。推荐放在 `X-Team-Id` 头，简单清晰。

## 5. 端点清单

### 5.1 Auth（`/api/auth`）— 公开

| 方法 | 路径 | Body | 说明 |
|------|------|------|------|
| POST | `/auth/register` | `{ username, password, nickname, teamOption, inviteCode?, teamName? }` | 注册；`teamOption: 'create'｜'join'`。create 时建团队设 admin；join 时校验邀请码加入为 member |
| POST | `/auth/login` | `{ username, password }` | 登录，返回 accessToken + refreshToken + user |
| POST | `/auth/refresh` | `{ refreshToken }` | 用 refresh 换新 access（见 05） |
| POST | `/auth/logout` | `{ refreshToken }` | 失效 refresh（KV 黑名单/删除） |
| GET | `/auth/me` | — | 返回当前用户 + 当前团队信息（替代老 `?action=check`） |

注册规则（沿用老系统）：username 3–50、password ≥6、create 未填团队名默认 `"<昵称>的團隊"`、username 唯一（409）。

### 5.2 Tasks（`/api/tasks`）— 需登录 + 团队

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/tasks?status=all\|pending\|in_progress\|completed\|cancelled` | 列出当前团队任务，含 creator/assignee 昵称，按 createdAt desc |
| GET | `/tasks/:id` | 单个任务详情（校验属当前团队） |
| POST | `/tasks` | 创建。Body 见下。副作用：写 history；分配他人时写 notification |
| PATCH | `/tasks/:id` | 部分更新（对齐老系统动态字段更新）。状态变更/改派均触发对应 history + notification |
| DELETE | `/tasks/:id` | 删除前写 history + 给 creator/assignee 发 task_deleted 通知 |
| GET | `/tasks/:id/history` | 任务变更历史 |
| GET | `/tasks/:id/comments` / POST | 评论列表 / 新增评论 |

创建/更新 Body（PATCH 全部可选）：
```jsonc
{
  "title": "string(1..200)",
  "description": "string?",
  "assigneeId": "number|null",
  "categoryId": "number|null",
  "priority": "low|medium|high",
  "status": "pending|in_progress|completed|cancelled",
  "dueDate": "YYYY-MM-DD|null",
  "taskType": "normal|recurring|repeatable",
  "recurrenceConfig": { /* discriminated union, 见 03/08 */ },
  "parentTaskId": "number|null"
}
```

> 周期任务的"虚拟实例展开"仍在**前端**完成（见 06）。后端只存规则。

### 5.3 Teams（`/api/teams`）— 需登录

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/teams` | 成员 | 我的所有团队 + 当前团队标记 |
| GET | `/teams/:id` | 成员 | 团队详情 + 我的角色 |
| GET | `/teams/:id/members` | 成员 | 成员列表（id, username, nickname, role） |
| POST | `/teams` | 登录 | 创建团队，创建者设 admin，自动切换为当前团队 |
| POST | `/teams/join` | 登录 | `{ inviteCode }` 加入为 member，自动切换 |
| POST | `/teams/switch` | 成员 | `{ teamId }` 切换当前团队 |
| PATCH | `/teams/:id` | admin | `{ name }` 改名 |
| POST | `/teams/:id/invite-code` | admin | 重新生成邀请码 |
| DELETE | `/teams/:id` | admin | 删除团队（禁止删唯一团队；级联） |
| DELETE | `/teams/:id/members/:userId` | admin | 移除成员（禁止管理员移除自己） |

### 5.4 Categories（`/api/categories`）— 需登录 + 团队

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/categories` | 成员 | 当前团队分类列表 |
| POST | `/categories` | admin | `{ name, color? }`，color 默认 `#3B82F6`，HEX 校验，团队内名称唯一 |
| PATCH | `/categories/:id` | admin | 改名/改色 |
| DELETE | `/categories/:id` | admin | 删除（关联任务 categoryId 置 NULL） |

### 5.5 Notifications（`/api/notifications`）— 需登录

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/notifications?unreadOnly=true` | 我的通知（desc，limit 50）+ `unreadCount` |
| POST | `/notifications/:id/read` | 标记单条已读（校验所有权） |
| POST | `/notifications/read-all` | 全部标记已读 |
| DELETE | `/notifications/:id` | 删除（校验所有权） |

### 5.6 Profile / Users（`/api/profile`）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/profile` | 当前用户资料 |
| PATCH | `/profile` | 改昵称/邮箱/密码（改密码需带旧密码） |

### 5.7 文件（可选，`/api/files`）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/files/avatar` | 上传头像到 R2，返回 URL（可选功能） |

## 6. 老 API → 新 API 映射

| 老（PHP） | 新（REST） |
|----------|-----------|
| `auth.php?action=login/register/logout/check` | `POST /auth/login`、`/register`、`/logout`、`GET /auth/me` |
| `tasks.php` GET/POST/PUT?id/DELETE?id | `GET/POST /tasks`、`PATCH/DELETE /tasks/:id` |
| `teams.php`（一堆 action） | `/teams` 下的 REST 路由（见 5.3） |
| `categories.php` | `/categories` 下 REST |
| `notifications.php?action=mark_read/...` | `POST /notifications/:id/read`、`/read-all` |
| `profile.php` | `/profile` |
| `update.php` | 不迁移（老系统的应用自更新机制，新架构由 CF 部署替代） |

## 7. Hono 实现骨架（示意）

```ts
// apps/api/src/app.ts
const app = new Hono<{ Bindings: Env; Variables: { userId: number; teamId: number } }>();

app.use('*', corsMiddleware);
app.route('/api/auth', authRoutes);          // 公开

app.use('/api/*', authMiddleware);           // 之后全部需登录
app.use('/api/tasks/*', teamMiddleware);     // 需团队上下文
app.use('/api/categories/*', teamMiddleware);
app.route('/api/tasks', taskRoutes);
app.route('/api/teams', teamRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/profile', profileRoutes);

app.onError(errorHandler);                   // 统一错误封套
```

校验示例：
```ts
import { zValidator } from '@hono/zod-validator';
import { createTaskSchema } from '@ftm/shared';

taskRoutes.post('/', zValidator('json', createTaskSchema), async (c) => {
  const input = c.req.valid('json');        // 已类型安全
  // ...drizzle insert
});
```

## 8. 决策标记

- ✅ REST 化、统一封套、Zod 校验、JWT。
- ⚠️ 当前团队用 `X-Team-Id` 头传递（替代 PHP session）。
- ❓ 是否加 `/v1` 版本前缀：建议加，开源项目利于演进；最终编码时定。
