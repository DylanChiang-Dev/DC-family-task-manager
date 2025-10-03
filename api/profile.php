<?php
/**
 * 用戶個人資料 API
 *
 * Endpoints:
 * - POST /api/profile.php - 更新用戶個人資料（暱稱和密碼）
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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $db = Database::getInstance()->getConnection();

    $nickname = trim($_POST['nickname'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // 驗證暱稱
    if (empty($nickname)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '暱稱不能為空']);
        exit;
    }

    // 構建更新查詢
    $fields = ['nickname = ?'];
    $values = [$nickname];

    // 如果提供了新密碼，則更新密碼
    if (!empty($password)) {
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => '密碼至少需要 6 個字符']);
            exit;
        }
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
        $fields[] = 'password = ?';
        $values[] = $hashedPassword;
    }

    $values[] = $userId;
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = ?";

    $stmt = $db->prepare($sql);
    $stmt->execute($values);

    // 更新會話
    $_SESSION['nickname'] = $nickname;

    echo json_encode([
        'success' => true,
        'message' => '個人資料已更新'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
