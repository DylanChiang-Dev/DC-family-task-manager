<?php
/**
 * Tasks API
 *
 * Endpoints:
 * - GET /api/tasks.php - Get all tasks (with optional status filter)
 * - POST /api/tasks.php - Create new task
 * - PUT /api/tasks.php?id=X - Update task
 * - DELETE /api/tasks.php?id=X - Delete task
 */

session_start();

// Load configuration
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/Database.php';

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();

    switch ($method) {
        case 'GET':
            handleGetTasks($db, $userId);
            break;

        case 'POST':
            handleCreateTask($db, $userId);
            break;

        case 'PUT':
            handleUpdateTask($db, $userId);
            break;

        case 'DELETE':
            handleDeleteTask($db, $userId);
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
 * Get all tasks
 */
function handleGetTasks($db, $userId)
{
    $status = $_GET['status'] ?? 'all';

    $sql = "SELECT t.*,
                   u1.username as creator_username, u1.nickname as creator_nickname,
                   u2.username as assignee_username, u2.nickname as assignee_nickname
            FROM tasks t
            LEFT JOIN users u1 ON t.creator_id = u1.id
            LEFT JOIN users u2 ON t.assignee_id = u2.id";

    if ($status !== 'all') {
        $sql .= " WHERE t.status = ?";
    }

    $sql .= " ORDER BY t.created_at DESC";

    $stmt = $db->prepare($sql);

    if ($status !== 'all') {
        $stmt->execute([$status]);
    } else {
        $stmt->execute();
    }

    $tasks = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'tasks' => $tasks
    ]);
}

/**
 * Create new task
 */
function handleCreateTask($db, $userId)
{
    // Get JSON input or POST data
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $title = trim($input['title'] ?? '');
    $description = trim($input['description'] ?? '');
    $assigneeId = $input['assignee_id'] ?? null;
    $priority = $input['priority'] ?? 'medium';
    $status = $input['status'] ?? 'pending';
    $dueDate = $input['due_date'] ?? null;

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

    // Convert empty assignee to null
    if ($assigneeId === '' || $assigneeId === '0') {
        $assigneeId = null;
    }

    // Insert task
    $stmt = $db->prepare("INSERT INTO tasks (title, description, creator_id, assignee_id, priority, status, due_date)
                          VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$title, $description, $userId, $assigneeId, $priority, $status, $dueDate]);

    $taskId = $db->lastInsertId();

    echo json_encode([
        'success' => true,
        'message' => 'Task created successfully',
        'task_id' => $taskId
    ]);
}

/**
 * Update task
 */
function handleUpdateTask($db, $userId)
{
    $taskId = $_GET['id'] ?? 0;

    if (empty($taskId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Task ID is required']);
        return;
    }

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);

    // Check if task exists
    $stmt = $db->prepare("SELECT id FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);

    if (!$stmt->fetch()) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Task not found']);
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
 * Delete task
 */
function handleDeleteTask($db, $userId)
{
    $taskId = $_GET['id'] ?? 0;

    if (empty($taskId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Task ID is required']);
        return;
    }

    // Delete task
    $stmt = $db->prepare("DELETE FROM tasks WHERE id = ?");
    $stmt->execute([$taskId]);

    if ($stmt->rowCount() === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Task not found']);
        return;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Task deleted successfully'
    ]);
}
