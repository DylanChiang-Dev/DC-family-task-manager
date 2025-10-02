-- Demo Tasks for Development
-- Run this to add sample tasks for testing
-- Note: Using dynamic user ID lookup

-- Get the first user ID
SET @user_id = (SELECT id FROM users LIMIT 1);

-- Insert demo tasks with various types and priorities
INSERT INTO `tasks` (`title`, `description`, `creator_id`, `assignee_id`, `priority`, `status`, `due_date`, `task_type`, `recurrence_config`) VALUES
-- Today's tasks
('準備晚餐', '今晚做紅燒肉和炒青菜', @user_id, @user_id, 'high', 'pending', CURDATE(), 'normal', NULL),
('檢查作業', '檢查孩子的數學作業', @user_id, @user_id, 'medium', 'in_progress', CURDATE(), 'normal', NULL),
('倒垃圾', '記得帶垃圾下樓', @user_id, NULL, 'low', 'pending', CURDATE(), 'normal', NULL),

-- Tomorrow's tasks
('買菜', '去超市買本週食材：豬肉、青菜、水果', @user_id, @user_id, 'high', 'pending', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'normal', NULL),
('接孩子放學', '下午4點到學校門口接孩子', @user_id, @user_id, 'high', 'pending', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'normal', NULL),

-- This week's tasks
('繳水電費', '記得繳納本月水電費', @user_id, @user_id, 'medium', 'pending', DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'normal', NULL),
('預約牙醫', '小明需要做牙齒檢查', @user_id, @user_id, 'medium', 'pending', DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'normal', NULL),
('洗車', '週末把車洗乾淨', @user_id, NULL, 'low', 'pending', DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'normal', NULL),

-- Next week's tasks
('家長會', '參加學校家長會', @user_id, @user_id, 'high', 'pending', DATE_ADD(CURDATE(), INTERVAL 8 DAY), 'normal', NULL),
('買禮物', '準備爺爺的生日禮物', @user_id, @user_id, 'medium', 'pending', DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'normal', NULL),

-- Recurring tasks (every day)
('晨跑', '每天早上6點晨跑30分鐘', @user_id, @user_id, 'medium', 'pending', CURDATE(), 'recurring', '{"frequency":"daily"}'),
('記帳', '記錄每天的支出', @user_id, @user_id, 'low', 'pending', CURDATE(), 'recurring', '{"frequency":"daily"}'),

-- Recurring tasks (weekly - Monday, Wednesday, Friday)
('打掃客廳', '週一三五打掃客廳', @user_id, NULL, 'medium', 'pending', CURDATE(), 'recurring', '{"frequency":"weekly","days":[1,3,5]}'),

-- Recurring tasks (monthly - 1st and 15th)
('還房貸', '每月1號和15號還房貸', @user_id, @user_id, 'high', 'pending', CURDATE(), 'recurring', '{"frequency":"monthly","dates":[1,15]}'),

-- Completed tasks (for testing)
('洗衣服', '已完成：洗了一週的衣服', @user_id, @user_id, 'medium', 'completed', DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'normal', NULL),
('整理房間', '已完成：整理了臥室', @user_id, NULL, 'low', 'completed', DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'normal', NULL);

-- Show inserted tasks count
SELECT COUNT(*) as '已添加示例任務數量' FROM tasks;
