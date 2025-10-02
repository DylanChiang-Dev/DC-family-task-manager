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

switch ($method) {
    case 'GET':
        // 获取所有用户（用于任务分配）
        $stmt = $db->prepare("
            SELECT id, username, nickname, role, created_at
            FROM users
            ORDER BY created_at ASC
        ");
        $stmt->execute();
        $users = $stmt->fetchAll();

        echo json_encode($users);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => '方法不允许']);
}
