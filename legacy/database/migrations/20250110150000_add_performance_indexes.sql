-- 性能優化: 添加複合索引和查詢優化索引
-- T071: 數據庫查詢優化

-- 任務表複合索引 (最常用的查詢組合)
-- 1. 團隊+狀態查詢 (GET /api/tasks.php?status=pending)
CREATE INDEX IF NOT EXISTS idx_tasks_team_status ON tasks(team_id, status);

-- 2. 團隊+分配成員查詢 (篩選某成員的任務)
CREATE INDEX IF NOT EXISTS idx_tasks_team_assignee ON tasks(team_id, assignee_id);

-- 3. 團隊+截止日期查詢 (日曆視圖、即將到期任務)
CREATE INDEX IF NOT EXISTS idx_tasks_team_due_date ON tasks(team_id, due_date);

-- 4. 團隊+創建時間查詢 (最新任務排序)
CREATE INDEX IF NOT EXISTS idx_tasks_team_created ON tasks(team_id, created_at DESC);

-- 5. 團隊+類別查詢 (按類別篩選)
CREATE INDEX IF NOT EXISTS idx_tasks_team_category ON tasks(team_id, category_id);

-- 通知表複合索引
-- 1. 用戶+未讀狀態查詢 (GET /api/notifications.php?unread_only=true)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- 團隊成員表複合索引
-- 1. 團隊+用戶查詢 (驗證團隊成員資格)
-- 注意: uk_team_user 唯一鍵已經可以作為索引使用,無需重複創建

-- 任務歷史表索引優化
-- 1. 任務+時間查詢 (獲取任務歷史記錄)
CREATE INDEX IF NOT EXISTS idx_task_history_task_created ON task_history(task_id, created_at DESC);

-- 類別表索引
-- 1. 團隊+名稱查詢 (類別列表)
-- 注意: uk_team_name 唯一鍵已經可以作為索引使用

-- 分析現有查詢性能 (可選,生產環境執行)
-- ANALYZE TABLE tasks;
-- ANALYZE TABLE notifications;
-- ANALYZE TABLE team_members;
-- ANALYZE TABLE task_history;

-- 查詢優化建議:
-- 1. 定期執行 ANALYZE TABLE 更新統計信息
-- 2. 監控慢查詢日誌: SET GLOBAL slow_query_log = 'ON';
-- 3. 定期清理過期數據 (如已刪除任務的歷史記錄)
