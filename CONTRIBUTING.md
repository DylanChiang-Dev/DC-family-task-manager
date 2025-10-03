# 貢獻指南

感謝您對「家庭任務管理系統」的關注！我們歡迎所有形式的貢獻。

## 貢獻方式

您可以通過以下方式為項目做出貢獻：

- 🐛 **報告 Bug**：提交詳細的 Issue
- 💡 **提出新功能**：分享您的想法
- 📖 **改進文檔**：修正錯誤或補充說明
- 💻 **提交代碼**：修復 Bug 或實現新功能
- 🌍 **翻譯**：幫助項目支持更多語言
- ⭐ **Star 項目**：讓更多人看到這個項目

## 開發環境設置

### 1. Fork 並克隆項目

```bash
# Fork 項目到您的 GitHub 賬號
# 然後克隆您的 Fork

git clone https://github.com/YOUR_USERNAME/family-task-manager.git
cd family-task-manager
```

### 2. 添加上游倉庫

```bash
git remote add upstream https://github.com/DylanChiang-Dev/family-task-manager.git
git fetch upstream
```

### 3. 啟動開發環境

```bash
# 使用 Docker（推薦）
docker-compose up -d

# 訪問 http://localhost:8080
# 完成安裝向導
```

### 4. 創建特性分支

```bash
git checkout -b feature/your-feature-name
```

## 代碼規範

### PHP 代碼

- 遵循 [PSR-12](https://www.php-fig.org/psr/psr-12/) 編碼標準
- 使用繁體中文註釋
- 所有數據庫操作使用 PDO 預處理語句

```php
<?php
/**
 * 獲取用戶的所有團隊
 */
function getUserTeams($userId)
{
    $db = Database::getInstance()->getConnection();
    
    $stmt = $db->prepare("
        SELECT t.*, tm.role
        FROM teams t
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE tm.user_id = ?
        ORDER BY t.name
    ");
    
    $stmt->execute([$userId]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
```

### JavaScript 代碼

- 使用原生 JavaScript（無需框架）
- 使用 ES6+ 語法（箭頭函數、async/await 等）
- 使用繁體中文註釋

```javascript
// 載入團隊列表
async function loadTeams() {
    try {
        const response = await fetch('/api/teams.php');
        const data = await response.json();
        
        if (data.success) {
            allTeams = data.teams;
            renderTeamList();
        }
    } catch (error) {
        console.error('載入團隊時發生錯誤:', error);
    }
}
```

### API 設計

所有 API 必須返回統一的 JSON 格式：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

錯誤響應：

```json
{
  "success": false,
  "message": "錯誤描述"
}
```

### 數據庫遷移

添加新表或修改表結構時，必須創建遷移文件：

```bash
# 創建遷移
php scripts/make-migration.php "add notifications table"

# 編輯生成的 SQL 文件
# database/migrations/YYYYMMDDHHMMSS_add_notifications_table.sql

# 測試遷移
php scripts/migrate.php
```

## 提交流程

### 1. 編寫代碼

確保您的代碼：
- ✅ 遵循代碼規範
- ✅ 添加了必要的註釋
- ✅ 處理了錯誤情況
- ✅ 不會破壞現有功能

### 2. 測試代碼

```bash
# 測試您的修改
# 確保所有功能正常工作

# 測試數據庫遷移（如有）
php scripts/migrate.php --status
```

### 3. 提交更改

使用語義化的提交信息：

```bash
git add .
git commit -m "feat: 添加任務評論功能"
```

提交信息格式：

- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `style`: 代碼格式調整（不影響功能）
- `refactor`: 代碼重構
- `test`: 測試相關
- `chore`: 構建/工具相關

範例：
```
feat: 添加任務評論功能
fix: 修復團隊切換後任務不更新的問題
docs: 更新 README 安裝說明
style: 格式化 auth.php 代碼
refactor: 重構團隊管理 API 結構
test: 添加用戶註冊單元測試
chore: 更新 Docker 配置
```

### 4. 推送到 GitHub

```bash
git push origin feature/your-feature-name
```

### 5. 創建 Pull Request

1. 訪問您的 Fork 倉庫
2. 點擊「New Pull Request」
3. 填寫 PR 標題和描述
4. 等待代碼審查

## Pull Request 指南

### PR 標題

使用清晰的標題描述您的更改：

- ✅ `feat: 添加任務評論功能`
- ✅ `fix: 修復郵箱登錄驗證問題`
- ❌ `update code`
- ❌ `bug fix`

### PR 描述

請包含以下信息：

```markdown
## 變更類型
- [ ] Bug 修復
- [ ] 新功能
- [ ] 文檔更新
- [ ] 代碼重構

## 變更說明
簡要描述您的更改...

## 測試
說明您如何測試了這些更改...

## 截圖（如適用）
添加截圖幫助審查者理解您的更改...

## 相關 Issue
Closes #123
```

### 代碼審查

- 耐心等待維護者審查您的代碼
- 積極響應審查意見
- 根據反饋修改代碼
- 保持友好和專業的態度

## 報告 Bug

提交 Issue 時請包含：

### 必需信息

1. **Bug 描述**：清晰描述問題
2. **復現步驟**：詳細的復現步驟
3. **預期行為**：應該發生什麼
4. **實際行為**：實際發生了什麼
5. **環境信息**：
   - PHP 版本
   - MySQL 版本
   - 操作系統
   - 瀏覽器（如適用）

### Issue 模板

```markdown
**Bug 描述**
簡要描述 Bug...

**復現步驟**
1. 訪問 '...'
2. 點擊 '...'
3. 滾動到 '...'
4. 看到錯誤

**預期行為**
應該顯示...

**實際行為**
實際顯示...

**截圖**
如果可能，添加截圖...

**環境**
- PHP 版本: 8.1
- MySQL 版本: 8.0
- OS: Ubuntu 22.04
- 瀏覽器: Chrome 120

**錯誤日誌**
```
錯誤日誌內容...
```

**其他信息**
添加任何其他相關信息...
```

## 提出新功能

提交功能請求時請包含：

1. **功能描述**：詳細描述功能
2. **使用場景**：為什麼需要這個功能
3. **實現建議**：您認為如何實現（可選）
4. **替代方案**：是否有其他解決方案

## 文檔貢獻

改進文檔同樣重要！您可以：

- 修正拼寫和語法錯誤
- 改進措辭和格式
- 添加示例和截圖
- 翻譯文檔

## 社區準則

### 行為準則

- 🤝 尊重所有貢獻者
- 💬 使用友好和包容的語言
- 🎯 專注於建設性的討論
- 🚫 拒絕騷擾和歧視行為

### 溝通渠道

- **Issues**：Bug 報告和功能請求
- **Discussions**：一般討論和問答
- **Pull Requests**：代碼審查

## 獲取幫助

遇到問題？

- 📖 查看 [README.md](README.md) 和 [QUICK_START.md](QUICK_START.md)
- 💬 在 [Discussions](https://github.com/DylanChiang-Dev/family-task-manager/discussions) 提問
- 🐛 搜索現有的 [Issues](https://github.com/DylanChiang-Dev/family-task-manager/issues)

## 許可證

提交貢獻即表示您同意您的代碼以 [MIT License](LICENSE) 發布。

---

感謝您的貢獻！ 🎉
