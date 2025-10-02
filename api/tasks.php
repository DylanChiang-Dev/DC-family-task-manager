<?php
session_start();
require_once '../config/Database.php';
require_once '../config/config.php';

header('Content-Type: application/json');

// 检查登录
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => '未授权']);
    exit;
}

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$userId = $_SESSION['user_id'];

switch ($method) {
    case 'GET':
        $id = $_GET['id'] ?? null;
        $status = $_GET['status'] ?? null;

        if ($id) {
            // 获取单个任务
            $stmt = $db->prepare("
                SELECT t.*,
                       u1.nickname as creator_name,
                       u2.nickname as assignee_name
                FROM tasks t
                LEFT JOIN users u1 ON t.creator_id = u1.id
                LEFT JOIN users u2 ON t.assignee_id = u2.id
                WHERE t.id = ?
            ");
            $stmt->execute([$id]);
            $task = $stmt->fetch();

            if (!$task) {
                http_response_code(404);
                echo json_encode(['error' => '任务不存在']);
                exit;
            }

            // 获取评论
            $stmt = $db->prepare("
                SELECT c.*, u.nickname as user_name
                FROM task_comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.task_id = ?
                ORDER BY c.created_at ASC
            ");
            $stmt->execute([$id]);
            $task['comments'] = $stmt->fetchAll();

            echo json_encode($task);
        } else {
            // 获取任务列表
            $sql = "
                SELECT t.*,
                       u1.nickname as creator_name,
                       u2.nickname as assignee_name
                FROM tasks t
                LEFT JOIN users u1 ON t.creator_id = u1.id
                LEFT JOIN users u2 ON t.assignee_id = u2.id
                WHERE 1=1
            ";

            $params = [];
            if ($status) {
                $sql .= " AND t.status = ?";
                $params[] = $status;
            }

            $sql .= " ORDER BY
                CASE t.priority
                    WHEN 'high' THEN 1
                    WHEN 'medium' THEN 2
                    WHEN 'low' THEN 3
                END,
                t.created_at DESC
            ";

            $stmt = $db->prepare($sql);
            $stmt->execute($params);
            $tasks = $stmt->fetchAll();

            echo json_encode($tasks);
        }
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        $title = trim($data['title'] ?? '');
        $description = trim($data['description'] ?? '');
        $assigneeId = $data['assignee_id'] ?? null;
        $priority = $data['priority'] ?? 'medium';
        $dueDate = $data['due_date'] ?? null;

        if (empty($title)) {
            http_response_code(400);
            echo json_encode(['error' => '任务标题不能为空']);
            exit;
        }

        $stmt = $db->prepare("
            INSERT INTO tasks (title, description, creator_id, assignee_id, priority, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        ");

        if ($stmt->execute([$title, $description, $userId, $assigneeId, $priority, $dueDate])) {
            $taskId = $db->lastInsertId();
            echo json_encode(['success' => true, 'id' => $taskId]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '创建任务失败']);
        }
        break;

    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $data['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => '任务ID不能为空']);
            exit;
        }

        // 检查任务是否存在
        $stmt = $db->prepare("SELECT * FROM tasks WHERE id = ?");
        $stmt->execute([$id]);
        $task = $stmt->fetch();

        if (!$task) {
            http_response_code(404);
            echo json_encode(['error' => '任务不存在']);
            exit;
        }

        $fields = [];
        $params = [];

        if (isset($data['title'])) {
            $fields[] = 'title = ?';
            $params[] = trim($data['title']);
        }
        if (isset($data['description'])) {
            $fields[] = 'description = ?';
            $params[] = trim($data['description']);
        }
        if (isset($data['assignee_id'])) {
            $fields[] = 'assignee_id = ?';
            $params[] = $data['assignee_id'];
        }
        if (isset($data['priority'])) {
            $fields[] = 'priority = ?';
            $params[] = $data['priority'];
        }
        if (isset($data['status'])) {
            $fields[] = 'status = ?';
            $params[] = $data['status'];
            if ($data['status'] === 'completed') {
                $fields[] = 'completed_at = NOW()';
            }
        }
        if (isset($data['due_date'])) {
            $fields[] = 'due_date = ?';
            $params[] = $data['due_date'];
        }

        if (empty($fields)) {
            http_response_code(400);
            echo json_encode(['error' => '没有需要更新的字段']);
            exit;
        }

        $params[] = $id;
        $sql = "UPDATE tasks SET " . implode(', ', $fields) . " WHERE id = ?";
        $stmt = $db->prepare($sql);

        if ($stmt->execute($params)) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '更新任务失败']);
        }
        break;

    case 'DELETE':
        $id = $_GET['id'] ?? null;

        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => '任务ID不能为空']);
            exit;
        }

        $stmt = $db->prepare("DELETE FROM tasks WHERE id = ?");

        if ($stmt->execute([$id])) {
            echo json_encode(['success' => true]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '删除任务失败']);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => '方法不允许']);
}
