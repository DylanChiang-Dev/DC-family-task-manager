<?php
/**
 * Categories API
 * 類別管理 API
 *
 * Endpoints:
 * - GET: 獲取當前團隊的類別列表
 * - POST: 創建新類別（僅管理員）
 * - PUT: 更新類別（僅管理員）
 * - DELETE: 刪除類別（僅管理員，將任務的 category_id 設為 NULL）
 */

// 載入配置和類庫
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../lib/Database.php';
require_once __DIR__ . '/../../lib/TeamHelper.php';
require_once __DIR__ . '/../../lib/SessionManager.php';

// 初始化 Session（T073: 要求用戶已登錄）
SessionManager::init(true);

header('Content-Type: application/json');

$db = Database::getInstance()->getConnection();
$userId = SessionManager::getUserId();
$currentTeamId = SessionManager::getCurrentTeamId();

if (!$currentTeamId) {
    http_response_code(400);
    echo json_encode(['error' => '未選擇團隊']);
    exit;
}

// 驗證團隊成員資格
if (!TeamHelper::isTeamMember($userId, $currentTeamId)) {
    http_response_code(403);
    echo json_encode(['error' => '無權訪問此團隊']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // 獲取團隊類別列表
            $stmt = $db->prepare("
                SELECT c.*, u.nickname as creator_name
                FROM categories c
                LEFT JOIN users u ON c.creator_id = u.id
                WHERE c.team_id = ?
                ORDER BY c.created_at ASC
            ");
            $stmt->execute([$currentTeamId]);
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode($categories);
            break;

        case 'POST':
            // 創建類別（僅管理員）
            if (!TeamHelper::isTeamAdmin($userId, $currentTeamId)) {
                http_response_code(403);
                echo json_encode(['error' => '僅管理員可創建類別']);
                exit;
            }

            $data = json_decode(file_get_contents('php://input'), true);

            if (empty($data['name'])) {
                http_response_code(400);
                echo json_encode(['error' => '類別名稱不能為空']);
                exit;
            }

            $name = trim($data['name']);
            $color = !empty($data['color']) ? trim($data['color']) : '#3B82F6';

            // 驗證顏色格式（HEX）
            if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
                http_response_code(400);
                echo json_encode(['error' => '顏色格式錯誤，請使用 HEX 格式（例如：#3B82F6）']);
                exit;
            }

            // 檢查類別名稱是否已存在
            $stmt = $db->prepare("SELECT id FROM categories WHERE team_id = ? AND name = ?");
            $stmt->execute([$currentTeamId, $name]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => '類別名稱已存在']);
                exit;
            }

            // 創建類別
            $stmt = $db->prepare("
                INSERT INTO categories (team_id, name, color, creator_id)
                VALUES (?, ?, ?, ?)
            ");
            $stmt->execute([$currentTeamId, $name, $color, $userId]);

            $categoryId = $db->lastInsertId();

            // 返回新創建的類別
            $stmt = $db->prepare("
                SELECT c.*, u.nickname as creator_name
                FROM categories c
                LEFT JOIN users u ON c.creator_id = u.id
                WHERE c.id = ?
            ");
            $stmt->execute([$categoryId]);
            $category = $stmt->fetch(PDO::FETCH_ASSOC);

            http_response_code(201);
            echo json_encode($category);
            break;

        case 'PUT':
            // 更新類別（僅管理員）
            if (!TeamHelper::isTeamAdmin($userId, $currentTeamId)) {
                http_response_code(403);
                echo json_encode(['error' => '僅管理員可更新類別']);
                exit;
            }

            if (empty($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => '缺少類別 ID']);
                exit;
            }

            $categoryId = intval($_GET['id']);
            $data = json_decode(file_get_contents('php://input'), true);

            // 驗證類別屬於當前團隊
            $stmt = $db->prepare("SELECT id FROM categories WHERE id = ? AND team_id = ?");
            $stmt->execute([$categoryId, $currentTeamId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => '類別不存在']);
                exit;
            }

            $updates = [];
            $params = [];

            if (isset($data['name']) && !empty(trim($data['name']))) {
                $name = trim($data['name']);

                // 檢查新名稱是否與其他類別衝突
                $stmt = $db->prepare("SELECT id FROM categories WHERE team_id = ? AND name = ? AND id != ?");
                $stmt->execute([$currentTeamId, $name, $categoryId]);
                if ($stmt->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => '類別名稱已存在']);
                    exit;
                }

                $updates[] = "name = ?";
                $params[] = $name;
            }

            if (isset($data['color'])) {
                $color = trim($data['color']);

                // 驗證顏色格式
                if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
                    http_response_code(400);
                    echo json_encode(['error' => '顏色格式錯誤，請使用 HEX 格式（例如：#3B82F6）']);
                    exit;
                }

                $updates[] = "color = ?";
                $params[] = $color;
            }

            if (empty($updates)) {
                http_response_code(400);
                echo json_encode(['error' => '沒有需要更新的內容']);
                exit;
            }

            $params[] = $categoryId;
            $params[] = $currentTeamId;

            $sql = "UPDATE categories SET " . implode(', ', $updates) . " WHERE id = ? AND team_id = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($params);

            // 返回更新後的類別
            $stmt = $db->prepare("
                SELECT c.*, u.nickname as creator_name
                FROM categories c
                LEFT JOIN users u ON c.creator_id = u.id
                WHERE c.id = ?
            ");
            $stmt->execute([$categoryId]);
            $category = $stmt->fetch(PDO::FETCH_ASSOC);

            echo json_encode($category);
            break;

        case 'DELETE':
            // 刪除類別（僅管理員）
            if (!TeamHelper::isTeamAdmin($userId, $currentTeamId)) {
                http_response_code(403);
                echo json_encode(['error' => '僅管理員可刪除類別']);
                exit;
            }

            if (empty($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => '缺少類別 ID']);
                exit;
            }

            $categoryId = intval($_GET['id']);

            // 驗證類別屬於當前團隊
            $stmt = $db->prepare("SELECT id FROM categories WHERE id = ? AND team_id = ?");
            $stmt->execute([$categoryId, $currentTeamId]);
            if (!$stmt->fetch()) {
                http_response_code(404);
                echo json_encode(['error' => '類別不存在']);
                exit;
            }

            // 將使用此類別的任務的 category_id 設為 NULL
            $stmt = $db->prepare("UPDATE tasks SET category_id = NULL WHERE category_id = ? AND team_id = ?");
            $stmt->execute([$categoryId, $currentTeamId]);

            // 刪除類別
            $stmt = $db->prepare("DELETE FROM categories WHERE id = ? AND team_id = ?");
            $stmt->execute([$categoryId, $currentTeamId]);

            echo json_encode(['success' => true, 'message' => '類別已刪除']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => '不支持的請求方法']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => '數據庫錯誤：' . $e->getMessage()]);
}
