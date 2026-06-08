<?php
/**
 * 任務歷史記錄服務類
 *
 * 功能：記錄任務的所有變更操作，支持審計追蹤
 * - 創建任務時記錄 (action='created')
 * - 更新任務時記錄 (action='updated', changes=JSON)
 * - 刪除任務時記錄 (action='deleted')
 * - 狀態變更時記錄 (action='status_changed')
 *
 * 數據庫表：task_history
 * - id: 主鍵
 * - task_id: 任務 ID
 * - user_id: 操作用戶 ID
 * - action: 操作類型 (created, updated, deleted, status_changed)
 * - changes: 變更內容 (JSON 格式)
 * - created_at: 操作時間
 */

class TaskHistoryService
{
    private $db;

    public function __construct($db = null)
    {
        $this->db = $db ?? Database::getInstance()->getConnection();
    }

    /**
     * 創建歷史記錄
     *
     * @param int $task_id 任務 ID
     * @param int $user_id 操作用戶 ID
     * @param string $action 操作類型 (created|updated|deleted|status_changed)
     * @param array|null $changes 變更內容（僅 updated 和 status_changed 需要）
     * @return bool 是否成功
     */
    public function createHistoryRecord($task_id, $user_id, $action, $changes = null)
    {
        try {
            $sql = "INSERT INTO task_history (task_id, user_id, action, changes, created_at)
                    VALUES (:task_id, :user_id, :action, :changes, NOW())";

            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':task_id', $task_id, PDO::PARAM_INT);
            $stmt->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->bindValue(':action', $action, PDO::PARAM_STR);
            $stmt->bindValue(':changes', $changes ? json_encode($changes, JSON_UNESCAPED_UNICODE) : null, PDO::PARAM_STR);

            return $stmt->execute();
        } catch (PDOException $e) {
            error_log("TaskHistoryService::createHistoryRecord failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 記錄任務創建
     *
     * @param int $task_id 任務 ID
     * @param int $user_id 創建用戶 ID
     * @param array $task_data 任務數據（可選，記錄初始值）
     * @return bool
     */
    public function recordTaskCreated($task_id, $user_id, $task_data = [])
    {
        $changes = $task_data ? ['initial_data' => $task_data] : null;
        return $this->createHistoryRecord($task_id, $user_id, 'created', $changes);
    }

    /**
     * 記錄任務更新
     *
     * @param int $task_id 任務 ID
     * @param int $user_id 操作用戶 ID
     * @param array $old_values 修改前的值
     * @param array $new_values 修改後的值
     * @return bool
     */
    public function recordTaskUpdated($task_id, $user_id, $old_values, $new_values)
    {
        $changes = [
            'old_value' => $old_values,
            'new_value' => $new_values
        ];

        return $this->createHistoryRecord($task_id, $user_id, 'updated', $changes);
    }

    /**
     * 記錄任務刪除
     *
     * @param int $task_id 任務 ID
     * @param int $user_id 操作用戶 ID
     * @param array $task_data 刪除時的任務數據（可選）
     * @return bool
     */
    public function recordTaskDeleted($task_id, $user_id, $task_data = [])
    {
        $changes = $task_data ? ['deleted_data' => $task_data] : null;
        return $this->createHistoryRecord($task_id, $user_id, 'deleted', $changes);
    }

    /**
     * 記錄狀態變更
     *
     * @param int $task_id 任務 ID
     * @param int $user_id 操作用戶 ID
     * @param string $old_status 舊狀態
     * @param string $new_status 新狀態
     * @return bool
     */
    public function recordStatusChanged($task_id, $user_id, $old_status, $new_status)
    {
        $changes = [
            'field' => 'status',
            'old_value' => $old_status,
            'new_value' => $new_status
        ];

        return $this->createHistoryRecord($task_id, $user_id, 'status_changed', $changes);
    }

    /**
     * 獲取任務的歷史記錄
     *
     * @param int $task_id 任務 ID
     * @param int $limit 返回數量限制（默認 50）
     * @param int $offset 偏移量（用於分頁）
     * @return array 歷史記錄列表
     */
    public function getTaskHistory($task_id, $limit = 50, $offset = 0)
    {
        try {
            $sql = "SELECT th.*, u.nickname as user_nickname, u.username as user_email
                    FROM task_history th
                    LEFT JOIN users u ON th.user_id = u.id
                    WHERE th.task_id = :task_id
                    ORDER BY th.created_at DESC
                    LIMIT :limit OFFSET :offset";

            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':task_id', $task_id, PDO::PARAM_INT);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();

            $history = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 解析 JSON changes 字段
            foreach ($history as &$record) {
                $record['changes'] = $record['changes'] ? json_decode($record['changes'], true) : null;
            }

            return $history;
        } catch (PDOException $e) {
            error_log("TaskHistoryService::getTaskHistory failed: " . $e->getMessage());
            return [];
        }
    }

    /**
     * 獲取歷史記錄總數（用於分頁）
     *
     * @param int $task_id 任務 ID
     * @return int
     */
    public function getTaskHistoryCount($task_id)
    {
        try {
            $sql = "SELECT COUNT(*) FROM task_history WHERE task_id = :task_id";
            $stmt = $this->db->prepare($sql);
            $stmt->bindValue(':task_id', $task_id, PDO::PARAM_INT);
            $stmt->execute();

            return (int) $stmt->fetchColumn();
        } catch (PDOException $e) {
            error_log("TaskHistoryService::getTaskHistoryCount failed: " . $e->getMessage());
            return 0;
        }
    }

    /**
     * 格式化歷史記錄為可讀文本
     *
     * @param array $record 歷史記錄
     * @return string 可讀描述
     */
    public function formatHistoryRecord($record)
    {
        $user = $record['user_nickname'] ?? '未知用戶';
        $action = $record['action'];
        $time = $record['created_at'];

        switch ($action) {
            case 'created':
                return "{$user} 創建了任務 ({$time})";

            case 'deleted':
                return "{$user} 刪除了任務 ({$time})";

            case 'status_changed':
                $old_status = $record['changes']['old_value'] ?? '未知';
                $new_status = $record['changes']['new_value'] ?? '未知';
                $status_map = [
                    'pending' => '待處理',
                    'in_progress' => '進行中',
                    'completed' => '已完成',
                    'cancelled' => '已取消'
                ];
                $old = $status_map[$old_status] ?? $old_status;
                $new = $status_map[$new_status] ?? $new_status;
                return "{$user} 將狀態從「{$old}」變更為「{$new}」({$time})";

            case 'updated':
                $changes = $record['changes']['new_value'] ?? [];
                $fields = array_keys($changes);
                $field_count = count($fields);
                $field_text = $field_count > 0 ? implode(', ', array_slice($fields, 0, 3)) : '未知字段';
                if ($field_count > 3) {
                    $field_text .= ' 等';
                }
                return "{$user} 更新了任務（{$field_text}）({$time})";

            default:
                return "{$user} 執行了 {$action} 操作 ({$time})";
        }
    }

    /**
     * 比較任務數據，提取變更字段
     *
     * @param array $old_data 舊數據
     * @param array $new_data 新數據
     * @return array ['old_value' => [...], 'new_value' => [...]]
     */
    public function extractChanges($old_data, $new_data)
    {
        $changes = [
            'old_value' => [],
            'new_value' => []
        ];

        $trackable_fields = ['title', 'description', 'status', 'priority', 'due_date', 'assignee_id', 'category_id'];

        foreach ($trackable_fields as $field) {
            if (isset($new_data[$field]) && isset($old_data[$field])) {
                // 值發生變化
                if ($new_data[$field] != $old_data[$field]) {
                    $changes['old_value'][$field] = $old_data[$field];
                    $changes['new_value'][$field] = $new_data[$field];
                }
            } elseif (isset($new_data[$field]) && !isset($old_data[$field])) {
                // 新增字段
                $changes['new_value'][$field] = $new_data[$field];
            }
        }

        return $changes;
    }
}
