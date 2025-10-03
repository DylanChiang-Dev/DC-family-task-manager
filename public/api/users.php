<?php
/**
 * 用戶 API
 *
 * 端點：
 * - GET /api/users.php - 獲取所有用戶（用於任務指派下拉列表）
 */

// 載入配置（必須在session_start()之前）
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../lib/Database.php';

session_start();

header('Content-Type: application/json');

// 檢查認證
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$currentTeamId = $_SESSION['current_team_id'] ?? null;

try {
    $db = Database::getInstance()->getConnection();

    // 僅獲取當前團隊的用戶
    if ($currentTeamId) {
        $stmt = $db->prepare("
            SELECT u.id, u.username, u.nickname, tm.role
            FROM users u
            INNER JOIN team_members tm ON u.id = tm.user_id
            WHERE tm.team_id = ?
            ORDER BY u.nickname
        ");
        $stmt->execute([$currentTeamId]);
        $users = $stmt->fetchAll();
    } else {
        // 未選擇團隊，返回空列表
        $users = [];
    }

    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
