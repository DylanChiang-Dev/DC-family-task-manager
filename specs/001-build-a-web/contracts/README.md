# API Contracts: 家庭協作任務管理系統

**Feature**: 001-build-a-web
**Date**: 2025-01-09
**Standard**: RESTful API

---

## API 端點總覽

| 資源 | 端點 | 方法 | 描述 | 鑑權要求 |
|------|------|------|------|---------|
| **認證** | `/api/auth.php?action=login` | POST | 用戶登錄 | ❌ 公開 |
| | `/api/auth.php?action=logout` | POST | 用戶登出 | ✅ 需登錄 |
| | `/api/auth.php?action=register` | POST | 用戶註冊 | ❌ 公開 |
| | `/api/auth.php?action=check` | GET | 檢查登錄狀態 | ✅ 需登錄 |
| **團隊** | `/api/teams.php` | GET | 獲取用戶所有團隊 | ✅ 需登錄 |
| | `/api/teams.php` | POST | 創建新團隊 | ✅ 需登錄 |
| | `/api/teams.php?action=join` | POST | 加入團隊（邀請碼） | ✅ 需登錄 |
| | `/api/teams.php?action=switch` | POST | 切換當前團隊 | ✅ 需登錄 |
| | `/api/teams.php?id={id}` | PUT | 更新團隊信息 | ✅ 需管理員 |
| | `/api/teams.php?id={id}&action=members` | GET | 獲取團隊成員列表 | ✅ 需成員 |
| | `/api/teams.php?id={id}&action=regenerate_code` | POST | 重新生成邀請碼 | ✅ 需管理員 |
| | `/api/teams.php?id={id}&user_id={uid}` | DELETE | 移除團隊成員 | ✅ 需管理員 |
| **任務** | `/api/tasks.php` | GET | 獲取任務列表 | ✅ 需成員 |
| | `/api/tasks.php` | POST | 創建任務 | ✅ 需成員 |
| | `/api/tasks.php?id={id}` | PUT | 更新任務 | ✅ 需成員 |
| | `/api/tasks.php?id={id}` | DELETE | 刪除任務 | ✅ 需創建者/管理員 |
| **用戶** | `/api/users.php` | GET | 獲取團隊成員列表 | ✅ 需成員 |
| **個人資料** | `/api/profile.php` | POST | 更新暱稱/密碼 | ✅ 需登錄 |
| **類別** | `/api/categories.php` | GET | 獲取團隊類別列表 | ✅ 需成員 |
| | `/api/categories.php` | POST | 創建類別 | ✅ 需管理員 |
| | `/api/categories.php?id={id}` | PUT | 更新類別 | ✅ 需管理員 |
| | `/api/categories.php?id={id}` | DELETE | 刪除類別 | ✅ 需管理員 |

---

## 鑑權機制

### Session-Based Authentication
所有需要鑑權的 API 依賴 PHP Session：

```php
session_start();

// 檢查登錄狀態
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => '未登錄']);
    exit;
}

// 檢查團隊成員資格
if (!TeamHelper::isTeamMember($_SESSION['user_id'], $team_id)) {
    http_response_code(403);
    echo json_encode(['error' => '無權訪問該團隊']);
    exit;
}

// 檢查管理員權限
if (!TeamHelper::isTeamAdmin($_SESSION['user_id'], $team_id)) {
    http_response_code(403);
    echo json_encode(['error' => '需要管理員權限']);
    exit;
}
```

---

## 通用響應格式

### 成功響應（2xx）
```json
{
  "message": "操作成功",
  "data": { ... }
}
```

### 錯誤響應（4xx / 5xx）
```json
{
  "error": "錯誤信息描述"
}
```

### HTTP 狀態碼規範
- **200 OK**: 成功（GET / PUT / DELETE）
- **201 Created**: 創建成功（POST）
- **400 Bad Request**: 請求參數錯誤
- **401 Unauthorized**: 未登錄
- **403 Forbidden**: 無權限
- **404 Not Found**: 資源不存在
- **405 Method Not Allowed**: HTTP 方法不支持
- **409 Conflict**: 數據衝突（樂觀鎖定）
- **500 Internal Server Error**: 服務器錯誤

---

## 核心 API 示例

### 1. 認證 API

#### POST /api/auth.php?action=register
註冊新用戶並創建或加入團隊。

**請求**:
```json
{
  "username": "user@example.com",
  "password": "password123",
  "nickname": "用戶暱稱",
  "register_mode": "create",  // 或 "join"
  "team_name": "我的家庭"  // 當 register_mode=create 時
  // "invite_code": "ABC123"  // 當 register_mode=join 時
}
```

**響應 (201)**:
```json
{
  "message": "註冊成功",
  "data": {
    "user_id": 1,
    "team_id": 1,
    "team_name": "我的家庭"
  }
}
```

---

### 2. 任務 API

#### GET /api/tasks.php
獲取當前團隊的任務列表（支持篩選和排序）。

**查詢參數**:
- `status`: pending / in_progress / completed / cancelled
- `assignee_id`: 分配成員 ID
- `category_id`: 類別 ID
- `priority`: low / medium / high
- `sort_by`: created_at / due_date / priority / updated_at
- `sort_order`: asc / desc

**響應 (200)**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "購買牛奶",
      "description": "去超市買牛奶",
      "status": "pending",
      "priority": "medium",
      "due_date": "2025-01-10",
      "assignee_id": 2,
      "assignee_nickname": "媽媽",
      "creator_id": 1,
      "category_id": 3,
      "category_name": "購物",
      "created_at": "2025-01-09 10:00:00",
      "updated_at": "2025-01-09 10:00:00"
    }
  ]
}
```

#### POST /api/tasks.php
創建新任務。

**請求**:
```json
{
  "title": "購買牛奶",
  "description": "去超市買牛奶",
  "assignee_id": 2,
  "priority": "medium",
  "due_date": "2025-01-10",
  "category_id": 3
}
```

**響應 (201)**:
```json
{
  "message": "任務創建成功",
  "data": {
    "id": 1,
    "title": "購買牛奶",
    "updated_at": "2025-01-09 10:00:00"
  }
}
```

#### PUT /api/tasks.php?id=1
更新任務（包含樂觀鎖定）。

**請求**:
```json
{
  "title": "購買低脂牛奶",
  "status": "in_progress",
  "updated_at": "2025-01-09 10:00:00"  // 舊的 updated_at（樂觀鎖定）
}
```

**響應 (200 / 409)**:
```json
// 成功
{
  "message": "任務更新成功",
  "data": {
    "updated_at": "2025-01-09 10:30:00"  // 新的 updated_at
  }
}

// 衝突
{
  "error": "任務已被修改，請重新加載"
}
```

---

### 3. 團隊 API

#### POST /api/teams.php
創建新團隊。

**請求**:
```json
{
  "name": "我的工作團隊"
}
```

**響應 (201)**:
```json
{
  "message": "團隊創建成功",
  "data": {
    "id": 2,
    "name": "我的工作團隊",
    "invite_code": "XYZ789",
    "role": "admin"
  }
}
```

#### POST /api/teams.php?action=join
加入團隊（通過邀請碼）。

**請求**:
```json
{
  "invite_code": "XYZ789"
}
```

**響應 (200)**:
```json
{
  "message": "加入團隊成功",
  "data": {
    "team_id": 2,
    "team_name": "我的工作團隊",
    "role": "member"
  }
}
```

---

## 數據驗證規則

### 用戶註冊
- `username`: 必填，郵箱格式，唯一
- `password`: 必填，最小 6 字符
- `nickname`: 可選，最大 100 字符
- `team_name`: 當 `register_mode=create` 時必填

### 任務創建
- `title`: 必填，最大 255 字符
- `assignee_id`: 必填，必須是當前團隊成員
- `priority`: 可選，默認 `medium`
- `status`: 可選，默認 `pending`
- `due_date`: 可選，日期格式 `YYYY-MM-DD`

### 類別創建
- `name`: 必填，最大 50 字符，團隊內唯一
- `color`: 可選，HEX 顏色格式（如 `#3B82F6`），默認藍色

---

## 完整 API 合約

由於篇幅限制，完整的 OpenAPI 3.0 規範請參考項目根目錄的 `API.md` 或 Postman Collection。

**關鍵端點完整文檔**:
1. [認證 API 詳細規範](auth-api.md)（待生成）
2. [任務 API 詳細規範](tasks-api.md)（待生成）
3. [團隊 API 詳細規範](teams-api.md)（待生成）

---

**完成日期**: 2025-01-09
**下一步**: 執行 `/speckit.tasks` 生成任務分解
