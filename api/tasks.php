<?php
/**
 * 任務 API
 *
 * 端點：
 * - GET /api/tasks.php - 獲取所有任務（可選狀態過濾）
 * - POST /api/tasks.php - 創建新任務
 * - PUT /api/tasks.php?id=X - 更新任務
 * - DELETE /api/tasks.php?id=X - 刪除任務
 */

session_start();

// 載入配置
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/Database.php';

header('Content-Type: application/json');

// 檢查認證
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$currentTeamId = $_SESSION['current_team_id'] ?? null;

// 檢查用戶是否選擇了團隊
if (!$currentTeamId) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'No team selected']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();

    switch ($method) {
        case 'GET':
            handleGetTasks($db, $userId, $currentTeamId);
            break;

        case 'POST':
            handleCreateTask($db, $userId, $currentTeamId);
            break;

        case 'PUT':
            handleUpdateTask($db, $userId, $currentTeamId);
            break;

        case 'DELETE':
            handleDeleteTask($db, $userId, $currentTeamId);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/**
 * 獲取當前團隊的所有任務
 */
function handleGetTasks($db, $userId, $currentTeamId)
{
    $status = $_GET['status'] ?? 'all';

    $sql = "SELECT t.*,
                   u1.username as creator_username, u1.nickname as creator_nickname,
                   u2.username as assignee_username, u2.nickname as assignee_nickname
            FROM tasks t
            LEFT JOIN users u1 ON t.creator_id = u1.id
            LEFT JOIN users u2 ON t.assignee_id = u2.id
            WHERE t.team_id = ?";

    if ($status !== 'all') {
        $sql .= " AND t.status = ?";
    }

    $sql .= " ORDER BY t.created_at DESC";

    $stmt = $db->prepare($sql);

    if ($status !== 'all') {
        $stmt->execute([$currentTeamId, $status]);
    } else {
        $stmt->execute([$currentTeamId]);
    }

    $tasks = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'tasks' => $tasks
    ]);
}

/**
 * 為當前團隊創建新任務
 */
function handleCreateTask($db, $userId, $currentTeamId)
{
    // Get JSON input or POST data
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $assigneeId = $input['assignee_id'] ?? null;
    $priority = $input['priority'] ?? 'medium';
    $status = $input['status'] ?? 'pending';
    $dueDate = $input['due_date'] ?? null;
    $taskType = $input['task_type'] ?? 'normal';
    $recurrenceConfig = $input['recurrence_config'] ?? null;
    $parentTaskId = $input['parent_task_id'] ?? null;

    // Validate
    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Title is required']);
        return;
    }

    if (!in_array($priority, ['low', 'medium', 'high'])) {
        $priority = 'medium';
    }

    if (!in_array($status, ['pending', 'in_progress', 'completed', 'cancelled'])) {
        $status = 'pending';
    }

    if (!in_array($taskType, ['normal', 'recurring', 'repeatable'])) {
        $taskType = 'normal';
    }

    // Convert empty assignee to null
    if ($assigneeId === '' || $assigneeId === '0') {
        $assigneeId = null;
    }

    // Convert recurrence config to JSON string
    if ($recurrenceConfig && is_array($recurrenceConfig)) {
        $recurrenceConfig = json_encode($recurrenceConfig);
    }

    // Insert task with team_id
    $stmt = $db->prepare("INSERT INTO tasks (team_id, title, description, creator_id, assignee_id, priority, status, due_date, task_type, recurrence_config, parent_task_id)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$currentTeamId, $title, $description, $userId, $assigneeId, $priority, $status, $dueDate, $taskType, $recurrenceConfig, $parentTaskId]);

    $taskId = $db->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Task created successfully',
        'task_id' => $taskId
    ]);
}

/**
 * 更新任務（必須屬於當前團隊）
 */
function handleUpdateTask($db, $userId, $currentTeamId)
{
    $taskId = $_GET['id'] ?? 0;

    if (empty($taskId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Task ID is required']);
        return;
    }

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    // Check if task exists and belongs to current team
    $stmt = $db->prepare("SELECT id FROM tasks WHERE id = ? AND team_id = ?");
    $stmt->execute([$taskId, $currentTeamId]);

    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Task not found or does not belong to your team']);
        return;
    }

    // Build update query dynamically
    $fields = [];
    $values = [];

    if (isset($input['title'])) {
        $fields[] = "title = ?";
        $values[] = trim($input['title']);
    }

    if (isset($input['description'])) {
        $fields[] = "description = ?";
        $values[] = trim($input['description']);
    }

    if (isset($input['assignee_id'])) {
        $fields[] = "assignee_id = ?";
        $values[] = $input['assignee_id'] === '' ? null : $input['assignee_id'];
    }

    if (isset($input['priority'])) {
        $fields[] = "priority = ?";
        $values[] = $input['priority'];
    }

    if (isset($input['status'])) {
        $fields[] = "status = ?";
        $values[] = $input['status'];
    }

    if (isset($input['due_date'])) {
        $fields[] = "due_date = ?";
        $values[] = $input['due_date'];
    }

    if (isset($input['task_type'])) {
        $fields[] = "task_type = ?";
        $values[] = $input['task_type'];
    }

    if (isset($input['recurrence_config'])) {
        $fields[] = "recurrence_config = ?";
        $recurrenceConfig = $input['recurrence_config'];
        if (is_array($recurrenceConfig)) {
            $recurrenceConfig = json_encode($recurrenceConfig);
        }
        $values[] = $recurrenceConfig;
    }

    if (isset($input['parent_task_id'])) {
        $fields[] = "parent_task_id = ?";
        $values[] = $input['parent_task_id'];
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'No fields to update']);
        return;
    }

    $values[] = $taskId;
    $sql = "UPDATE tasks SET " . implode(', ', $fields) . " WHERE id = ?";

    $stmt = $db->prepare($sql);
    $stmt->execute($values);

    echo json_encode([
        'success' => true,
        'message' => 'Task updated successfully'
    ]);
}

/**
 * 刪除任務（必須屬於當前團隊）
 */
function handleDeleteTask($db, $userId, $currentTeamId)
{
    $taskId = $_GET['id'] ?? 0;

    if (empty($taskId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Task ID is required']);
        return;
    }

    // Delete task (only if belongs to current team)
    $stmt = $db->prepare("DELETE FROM tasks WHERE id = ? AND team_id = ?");
    $stmt->execute([$taskId, $currentTeamId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Task not found or does not belong to your team']);
        return;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Task deleted successfully'
    ]);
}
