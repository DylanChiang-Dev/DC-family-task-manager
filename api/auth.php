<?php
session_start();
require_once '../config/Database.php';
require_once '../config/config.php';

header('Content-Type: application/json');

$db = Database::getInstance()->getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => '方法不允许']);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['error' => '用户名和密码不能为空']);
            exit;
        }

        $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            http_response_code(401);
            echo json_encode(['error' => '用户名或密码错误']);
            exit;
        }

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['nickname'] = $user['nickname'];
        $_SESSION['role'] = $user['role'];

        echo json_encode([
            'success' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'nickname' => $user['nickname'],
                'role' => $user['role']
            ]
        ]);
        break;

    case 'logout':
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    case 'register':
        if ($method !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => '方法不允许']);
            exit;
        }

        $data = json_decode(file_get_contents('php://input'), true);
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';
        $nickname = trim($data['nickname'] ?? '');

        if (empty($username) || empty($password) || empty($nickname)) {
            http_response_code(400);
            echo json_encode(['error' => '所有字段都必须填写']);
            exit;
        }

        // 检查用户名是否存在
        $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        if ($stmt->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => '用户名已存在']);
            exit;
        }

        // 创建新用户
        $hashedPassword = password_hash($password, PASSWORD_ALGO, ['cost' => PASSWORD_COST]);
        $stmt = $db->prepare("INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)");

        if ($stmt->execute([$username, $hashedPassword, $nickname])) {
            echo json_encode(['success' => true, 'message' => '注册成功']);
        } else {
            http_response_code(500);
            echo json_encode(['error' => '注册失败']);
        }
        break;

    case 'check':
        if (isset($_SESSION['user_id'])) {
            echo json_encode([
                'authenticated' => true,
                'user' => [
                    'id' => $_SESSION['user_id'],
                    'username' => $_SESSION['username'],
                    'nickname' => $_SESSION['nickname'],
                    'role' => $_SESSION['role']
                ]
            ]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => '未知操作']);
}
