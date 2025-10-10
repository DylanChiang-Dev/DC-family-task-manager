-- 遷移: 為 notifications 表添加 created_by 欄位
-- 用於追蹤是誰觸發的通知（例如任務分配者）

ALTER TABLE notifications
ADD COLUMN created_by BIGINT UNSIGNED NULL COMMENT '通知創建者用戶 ID（觸發通知的用戶）' AFTER user_id,
ADD INDEX idx_created_by (created_by),
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
