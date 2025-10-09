<?php
/**
 * 通知服務類
 *
 * 功能：
 * - createNotification(): 創建通知記錄
 * - sendDueReminder(): 到期提醒通知
 * - sendTaskAssigned(): 任務分配通知
 * - sendStatusChanged(): 狀態變更通知
 * - sendTaskDeleted(): 任務刪除通知
 */

require_once __DIR__ . '/Database.php';

class NotificationService
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * 創建通知記錄
     *
     * @param int $user_id 接收用戶 ID
     * @param string $type 通知類型 (due_reminder|task_assigned|status_changed|team_invite)
     * @param int|null $task_id 關聯任務 ID
     * @param string $content 通知內容
     * @param int|null $created_by 通知創建者用戶 ID（觸發通知的用戶）
     * @return int|false 創建的通知 ID 或 false
     */
    public function createNotification($user_id, $type, $task_id, $content, $created_by = null)
    {
        try {
            $sql = "INSERT INTO notifications (user_id, created_by, task_id, type, content, is_read, created_at)
                    VALUES (:user_id, :created_by, :task_id, :type, :content, 0, NOW())";

            $stmt = $this->db->prepare($sql);
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindParam(':created_by', $created_by, PDO::PARAM_INT);
            $stmt->bindParam(':task_id', $task_id, PDO::PARAM_INT);
            $stmt->bindParam(':type', $type, PDO::PARAM_STR);
            $stmt->bindParam(':content', $content, PDO::PARAM_STR);
            $stmt->execute();

            return $this->db->lastInsertId();

        } catch (PDOException $e) {
            error_log("NotificationService::createNotification() failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 發送到期提醒通知
     *
     * @param int $task_id 任務 ID
     * @return bool 是否成功
     */
    public function sendDueReminder($task_id)
    {
        try {
            // 獲取任務信息
            $stmt = $this->db->prepare("SELECT * FROM tasks WHERE id = :task_id");
            $stmt->bindParam(':task_id', $task_id, PDO::PARAM_INT);
            $stmt->execute();
            $task = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$task) {
                return false;
            }

            // 計算剩餘時間
            $due_date = new DateTime($task['due_date']);
            $now = new DateTime();
            $diff = $now->diff($due_date);
            $hours_left = ($diff->days * 24) + $diff->h;

            $content = sprintf(
                '任務「%s」將在 %d 小時後到期（%s）',
                $task['title'],
                $hours_left,
                $due_date->format('Y-m-d H:i')
            );

            // 通知分配成員
            return $this->createNotification(
                $task['assignee_id'],
                'due_reminder',
                $task_id,
                $content
            ) !== false;

        } catch (Exception $e) {
            error_log("NotificationService::sendDueReminder() failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 發送任務分配通知
     *
     * @param int $task_id 任務 ID
     * @param int $assigner_id 分配者用戶 ID
     * @return bool 是否成功
     */
    public function sendTaskAssigned($task_id, $assigner_id)
    {
        try {
            // 獲取任務信息
            $stmt = $this->db->prepare("
                SELECT t.*, u.nickname as assigner_name
                FROM tasks t
                LEFT JOIN users u ON t.creator_id = u.id
                WHERE t.id = :task_id
            ");
            $stmt->bindParam(':task_id', $task_id, PDO::PARAM_INT);
            $stmt->execute();
            $task = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$task) {
                return false;
            }

            // 不要給創建者自己發通知
            if ($task['assignee_id'] == $assigner_id) {
                return true;
            }

            $assigner_name = $task['assigner_name'] ?? '某人';
            $content = sprintf(
                '%s 分配給你一個任務：「%s」',
                $assigner_name,
                $task['title']
            );

            if ($task['due_date']) {
                $content .= sprintf(' (截止日期: %s)', $task['due_date']);
            }

            // 通知分配成員
            return $this->createNotification(
                $task['assignee_id'],
                'task_assigned',
                $task_id,
                $content,
                $assigner_id
            ) !== false;

        } catch (PDOException $e) {
            error_log("NotificationService::sendTaskAssigned() failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 發送狀態變更通知
     *
     * @param int $task_id 任務 ID
     * @param string $old_status 舊狀態
     * @param string $new_status 新狀態
     * @param int $changer_id 變更者用戶 ID
     * @return bool 是否成功
     */
    public function sendStatusChanged($task_id, $old_status, $new_status, $changer_id)
    {
        try {
            // 獲取任務信息
            $stmt = $this->db->prepare("
                SELECT t.*, u.nickname as changer_name
                FROM tasks t
                LEFT JOIN users u ON u.id = :changer_id
                WHERE t.id = :task_id
            ");
            $stmt->bindParam(':task_id', $task_id, PDO::PARAM_INT);
            $stmt->bindParam(':changer_id', $changer_id, PDO::PARAM_INT);
            $stmt->execute();
            $task = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$task) {
                return false;
            }

            // 狀態映射
            $status_map = [
                'pending' => '待處理',
                'in_progress' => '進行中',
                'completed' => '已完成',
                'cancelled' => '已取消'
            ];

            $old_status_text = $status_map[$old_status] ?? $old_status;
            $new_status_text = $status_map[$new_status] ?? $new_status;
            $changer_name = $task['changer_name'] ?? '某人';

            $content = sprintf(
                '%s 將任務「%s」的狀態從「%s」變更為「%s」',
                $changer_name,
                $task['title'],
                $old_status_text,
                $new_status_text
            );

            // 通知創建者（如果不是變更者本人）
            if ($task['creator_id'] != $changer_id) {
                $this->createNotification(
                    $task['creator_id'],
                    'status_changed',
                    $task_id,
                    $content,
                    $changer_id
                );
            }

            // 通知分配成員（如果不是變更者本人且不是創建者）
            if ($task['assignee_id'] != $changer_id && $task['assignee_id'] != $task['creator_id']) {
                $this->createNotification(
                    $task['assignee_id'],
                    'status_changed',
                    $task_id,
                    $content,
                    $changer_id
                );
            }

            return true;

        } catch (PDOException $e) {
            error_log("NotificationService::sendStatusChanged() failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 發送任務刪除通知
     *
     * @param array $task 任務數據（必須在刪除前獲取）
     * @param int $deleter_id 刪除者用戶 ID
     * @return bool 是否成功
     */
    public function sendTaskDeleted($task, $deleter_id)
    {
        try {
            // 獲取刪除者名稱
            $stmt = $this->db->prepare("SELECT nickname FROM users WHERE id = :deleter_id");
            $stmt->bindParam(':deleter_id', $deleter_id, PDO::PARAM_INT);
            $stmt->execute();
            $deleter = $stmt->fetch(PDO::FETCH_ASSOC);
            $deleter_name = $deleter['nickname'] ?? '某人';

            $content = sprintf(
                '%s 刪除了任務：「%s」',
                $deleter_name,
                $task['title']
            );

            // 通知創建者（如果不是刪除者本人）
            if ($task['creator_id'] != $deleter_id) {
                $this->createNotification(
                    $task['creator_id'],
                    'status_changed',
                    null, // 任務已刪除,無 task_id
                    $content,
                    $deleter_id
                );
            }

            // 通知分配成員（如果不是刪除者本人且不是創建者）
            if ($task['assignee_id'] != $deleter_id && $task['assignee_id'] != $task['creator_id']) {
                $this->createNotification(
                    $task['assignee_id'],
                    'status_changed',
                    null,
                    $content,
                    $deleter_id
                );
            }

            return true;

        } catch (PDOException $e) {
            error_log("NotificationService::sendTaskDeleted() failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 檢查到期任務並發送提醒
     * 此方法應由 cron 任務定期調用
     *
     * @param int $hours_before 提前多少小時提醒（默認 24 小時）
     * @return int 發送的通知數量
     */
    public function checkAndSendDueReminders($hours_before = 24)
    {
        try {
            $now = new DateTime();
            $future = (clone $now)->modify("+{$hours_before} hours");

            // 查找即將到期的任務（狀態不是已完成或已取消）
            $stmt = $this->db->prepare("
                SELECT id
                FROM tasks
                WHERE due_date BETWEEN :now AND :future
                  AND status NOT IN ('completed', 'cancelled')
            ");

            $now_str = $now->format('Y-m-d H:i:s');
            $future_str = $future->format('Y-m-d H:i:s');

            $stmt->bindParam(':now', $now_str, PDO::PARAM_STR);
            $stmt->bindParam(':future', $future_str, PDO::PARAM_STR);
            $stmt->execute();

            $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $count = 0;

            foreach ($tasks as $task) {
                if ($this->sendDueReminder($task['id'])) {
                    $count++;
                }
            }

            return $count;

        } catch (Exception $e) {
            error_log("NotificationService::checkAndSendDueReminders() failed: " . $e->getMessage());
            return 0;
        }
    }
}
