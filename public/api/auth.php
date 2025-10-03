<?php
/**
 * 認證 API
 *
 * 端點：
 * - POST ?action=register - 註冊新用戶
 * - POST ?action=login - 用戶登錄
 * - POST ?action=logout - 用戶登出
 * - GET ?action=check - 檢查登錄狀態
 */

// 載入配置（必須在session_start()之前）
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../lib/Database.php';
require_once __DIR__ . '/../../lib/TeamHelper.php';

session_start();

// CORS 標頭（可選，用於 API 訪問）
header('Content-Type: application/json');

// 獲取操作
$action = $_GET['action'] ?? '';

try {
    $db = Database::getInstance()->getConnection();

    switch ($action) {
        case 'register':
            handleRegister($db);
            break;

        case 'login':
            handleLogin($db);
            break;

        case 'logout':
            handleLogout();
            break;

        case 'check':
            handleCheck($db);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/**
 * 處理用戶註冊
 */
function handleRegister($db)
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }

    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $nickname = trim($_POST['nickname'] ?? '');
    $inviteCode = strtoupper(trim($_POST['invite_code'] ?? ''));
    $teamName = trim($_POST['team_name'] ?? '');

    // 驗證輸入
    if (empty($username) || empty($password) || empty($nickname)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'All fields are required']);
        return;
    }

    if (strlen($username) < 3 || strlen($username) > 50) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username must be 3-50 characters']);
        return;
    }

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
        return;
    }

    // 判斷註冊模式：有邀請碼就加入團隊，否則創建新團隊
    $teamId = null;
    $registerMode = !empty($inviteCode) ? 'join' : 'create';

    if ($registerMode === 'join') {
        // 驗證邀請碼是否存在
        $team = TeamHelper::getTeamByInviteCode($db, $inviteCode);
        if (!$team) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Invalid invite code']);
            return;
        }
        $teamId = $team['id'];
    } else {
        // 如果沒有提供團隊名稱，使用默認名稱
        if (empty($teamName)) {
            $teamName = $nickname . '的團隊';
        }
    }

    // 檢查用戶名是否已存在
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);

    if ($stmt->fetch()) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Username already exists']);
        return;
    }

    // 哈希密碼
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);

    // 開始事務
    $db->beginTransaction();

    try {
        // 插入用戶
        $stmt = $db->prepare("INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)");
        $stmt->execute([$username, $hashedPassword, $nickname]);
        $userId = $db->lastInsertId();

        // 創建或加入團隊
        if ($registerMode === 'create') {
            // 創建新團隊
            $inviteCode = TeamHelper::generateInviteCode($db);
            $stmt = $db->prepare("INSERT INTO teams (name, invite_code, created_by) VALUES (?, ?, ?)");
            $stmt->execute([$teamName, $inviteCode, $userId]);
            $teamId = $db->lastInsertId();

            // 將用戶添加為管理員
            TeamHelper::addUserToTeam($db, $userId, $teamId, 'admin');
        } else {
            // 加入現有團隊
            TeamHelper::addUserToTeam($db, $userId, $teamId, 'member');
        }

        // 設置當前團隊
        $stmt = $db->prepare("UPDATE users SET current_team_id = ? WHERE id = ?");
        $stmt->execute([$teamId, $userId]);

        $db->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Registration successful'
        ]);
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
}

/**
 * 處理用戶登錄
 */
function handleLogin($db)
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
        return;
    }

    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');

    // 驗證輸入
    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Username and password are required']);
        return;
    }

    // 獲取用戶
    $stmt = $db->prepare("SELECT id, username, password, nickname, current_team_id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid username or password']);
        return;
    }

    // 如果用戶沒有當前團隊，自動設置為第一個團隊
    $currentTeamId = $user['current_team_id'];
    if (!$currentTeamId) {
        $stmt = $db->prepare("SELECT team_id FROM team_members WHERE user_id = ? ORDER BY joined_at ASC LIMIT 1");
        $stmt->execute([$user['id']]);
        $firstTeam = $stmt->fetch();

        if ($firstTeam) {
            $currentTeamId = $firstTeam['team_id'];
            // 更新用戶的當前團隊
            $updateStmt = $db->prepare("UPDATE users SET current_team_id = ? WHERE id = ?");
            $updateStmt->execute([$currentTeamId, $user['id']]);
        }
    }

    // 設置會話
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['nickname'] = $user['nickname'];
    $_SESSION['current_team_id'] = $currentTeamId;

    // 獲取當前團隊信息
    $teamInfo = null;
    if ($currentTeamId) {
        $stmt = $db->prepare("SELECT t.name, tm.role FROM teams t INNER JOIN team_members tm ON t.id = tm.team_id WHERE t.id = ? AND tm.user_id = ?");
        $stmt->execute([$currentTeamId, $user['id']]);
        $teamInfo = $stmt->fetch();
    }

    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'nickname' => $user['nickname'],
            'current_team_id' => $currentTeamId,
            'current_team_name' => $teamInfo ? $teamInfo['name'] : null,
            'current_team_role' => $teamInfo ? $teamInfo['role'] : null
        ]
    ]);
}

/**
 * 處理用戶登出
 */
function handleLogout()
{
    session_destroy();
    echo json_encode([
        'success' => true,
        'message' => 'Logout successful'
    ]);
}

/**
 * 檢查登錄狀態
 */
function handleCheck($db)
{
    if (isset($_SESSION['user_id'])) {
        // 如果current_team_id為NULL，自動設置為第一個團隊
        if (!isset($_SESSION['current_team_id']) || $_SESSION['current_team_id'] === null) {
            $stmt = $db->prepare("SELECT team_id FROM team_members WHERE user_id = ? ORDER BY joined_at ASC LIMIT 1");
            $stmt->execute([$_SESSION['user_id']]);
            $firstTeam = $stmt->fetch();

            if ($firstTeam) {
                $_SESSION['current_team_id'] = $firstTeam['team_id'];
                // 同時更新數據庫
                $updateStmt = $db->prepare("UPDATE users SET current_team_id = ? WHERE id = ?");
                $updateStmt->execute([$firstTeam['team_id'], $_SESSION['user_id']]);
            }
        }

        echo json_encode([
            'success' => true,
            'logged_in' => true,
            'user' => [
                'id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
                'nickname' => $_SESSION['nickname'],
                'current_team_id' => $_SESSION['current_team_id'] ?? null
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'logged_in' => false
        ]);
    }
}
