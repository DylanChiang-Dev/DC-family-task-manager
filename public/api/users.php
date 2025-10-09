<?php
/**
 * 用戶 API
 *
 * 端點：
 * - GET /api/users.php - 獲取所有用戶（用於任務指派下拉列表）
 */

// 載入配置和類庫
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../lib/Database.php';
require_once __DIR__ . '/../../lib/SessionManager.php';

// 初始化 Session（T073: 要求用戶已登錄）
SessionManager::init(true);

header('Content-Type: application/json');

$userId = SessionManager::getUserId();
$currentTeamId = SessionManager::getCurrentTeamId();

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
