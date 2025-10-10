<?php
/**
 * 通知 API
 *
 * 功能：
 * - GET: 獲取用戶未讀通知列表
 * - POST ?action=mark_read&id={id}: 標記通知為已讀
 * - POST ?action=mark_all_read: 標記所有通知為已讀
 * - DELETE ?id={id}: 刪除通知
 */

session_start();
require_once __DIR__ . '/../../lib/Database.php';
require_once __DIR__ . '/../../lib/TeamHelper.php';

header('Content-Type: application/json; charset=utf-8');

// 檢查登錄狀態
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => '未登錄']);
    exit;
}

$user_id = $_SESSION['user_id'];
$db = Database::getInstance()->getConnection();

/**
 * GET: 獲取用戶通知列表
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $unread_only = isset($_GET['unread_only']) && $_GET['unread_only'] === 'true';

        $sql = "SELECT n.*,
                       t.title as task_title,
                       u.nickname as sender_nickname
                FROM notifications n
                LEFT JOIN tasks t ON n.task_id = t.id
                LEFT JOIN users u ON n.created_by = u.id
                WHERE n.user_id = :user_id";

        if ($unread_only) {
            $sql .= " AND n.is_read = 0";
        }

        $sql .= " ORDER BY n.created_at DESC LIMIT 50";

        $stmt = $db->prepare($sql);
        $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 獲取未讀數量
        $count_stmt = $db->prepare("SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = :user_id AND is_read = 0");
        $count_stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
        $count_stmt->execute();
        $unread_count = $count_stmt->fetch(PDO::FETCH_ASSOC)['unread_count'];

        echo json_encode([
            'success' => true,
            'notifications' => $notifications,
            'unread_count' => (int)$unread_count
        ], JSON_UNESCAPED_UNICODE);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '獲取通知失敗: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

/**
 * POST: 標記已讀或批量操作
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_GET['action'] ?? '';

    try {
        // 標記單個通知為已讀
        if ($action === 'mark_read') {
            $notification_id = $_GET['id'] ?? null;

            if (!$notification_id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => '缺少通知 ID'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // 驗證通知所屬用戶
            $check_stmt = $db->prepare("SELECT user_id FROM notifications WHERE id = :id");
            $check_stmt->bindParam(':id', $notification_id, PDO::PARAM_INT);
            $check_stmt->execute();
            $notification = $check_stmt->fetch(PDO::FETCH_ASSOC);

            if (!$notification) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => '通知不存在'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            if ($notification['user_id'] != $user_id) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => '無權限'], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // 標記為已讀
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE id = :id");
            $stmt->bindParam(':id', $notification_id, PDO::PARAM_INT);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => '已標記為已讀'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // 標記所有通知為已讀
        if ($action === 'mark_all_read') {
            $stmt = $db->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = :user_id AND is_read = 0");
            $stmt->bindParam(':user_id', $user_id, PDO::PARAM_INT);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => '已標記所有通知為已讀'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '無效的操作'], JSON_UNESCAPED_UNICODE);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '操作失敗: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

/**
 * DELETE: 刪除通知
 */
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $notification_id = $_GET['id'] ?? null;

    if (!$notification_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => '缺少通知 ID'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    try {
        // 驗證通知所屬用戶
        $check_stmt = $db->prepare("SELECT user_id FROM notifications WHERE id = :id");
        $check_stmt->bindParam(':id', $notification_id, PDO::PARAM_INT);
        $check_stmt->execute();
        $notification = $check_stmt->fetch(PDO::FETCH_ASSOC);

        if (!$notification) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => '通知不存在'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($notification['user_id'] != $user_id) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => '無權限'], JSON_UNESCAPED_UNICODE);
            exit;
        }

        // 刪除通知
        $stmt = $db->prepare("DELETE FROM notifications WHERE id = :id");
        $stmt->bindParam(':id', $notification_id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => '通知已刪除'], JSON_UNESCAPED_UNICODE);

    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => '刪除失敗: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

// 不支持的請求方法
http_response_code(405);
echo json_encode(['success' => false, 'message' => '不支持的請求方法'], JSON_UNESCAPED_UNICODE);
