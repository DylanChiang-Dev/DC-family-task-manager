<?php
/**
 * 系統更新 API
 *
 * 端點：
 * - GET /api/update.php?action=check - 檢查更新
 * - POST /api/update.php?action=update - 執行更新
 * - GET /api/update.php?action=version - 獲取版本信息
 */

// 載入配置（必須在session_start()之前）
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../lib/Database.php';
require_once __DIR__ . '/../../lib/TeamHelper.php';

session_start();

header('Content-Type: application/json');

// 檢查認證（必須是已登錄用戶）
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? 'version';
$method = $_SERVER['REQUEST_METHOD'];

try {
    $db = Database::getInstance()->getConnection();
    $userId = $_SESSION['user_id'];

    // 檢查用戶是否有管理權限（至少是一個團隊的管理員）
    $stmt = $db->prepare("
        SELECT COUNT(*) as admin_count
        FROM team_members
        WHERE user_id = ? AND role = 'admin'
    ");
    $stmt->execute([$userId]);
    $result = $stmt->fetch();
    $isAdmin = $result['admin_count'] > 0;

    if ($action === 'check') {
        handleCheckUpdate();
    } elseif ($action === 'update') {
        if (!$isAdmin) {
            http_response_code(403);
            echo json_encode(['success' => false, 'message' => '只有團隊管理員才能執行更新']);
            exit;
        }
        handleUpdate();
    } elseif ($action === 'version') {
        handleGetVersion();
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/**
 * 獲取當前版本信息
 */
function handleGetVersion()
{
    $projectRoot = dirname(dirname(__DIR__));

    if (!is_dir($projectRoot . '/.git')) {
        echo json_encode([
            'success' => true,
            'version' => 'unknown',
            'commit' => 'unknown',
            'branch' => 'unknown',
            'is_git' => false,
            'message' => '非 Git 部署，無法檢查更新'
        ]);
        return;
    }

    // 獲取當前分支
    exec('cd ' . escapeshellarg($projectRoot) . ' && git rev-parse --abbrev-ref HEAD 2>&1', $branchOutput, $branchCode);
    $branch = $branchCode === 0 ? trim($branchOutput[0]) : 'unknown';

    // 獲取當前提交哈希
    exec('cd ' . escapeshellarg($projectRoot) . ' && git rev-parse HEAD 2>&1', $commitOutput, $commitCode);
    $commit = $commitCode === 0 ? trim($commitOutput[0]) : 'unknown';
    $shortCommit = substr($commit, 0, 7);

    // 獲取最後提交時間
    exec('cd ' . escapeshellarg($projectRoot) . ' && git log -1 --format=%ci 2>&1', $dateOutput, $dateCode);
    $lastUpdate = $dateCode === 0 ? trim($dateOutput[0]) : 'unknown';

    echo json_encode([
        'success' => true,
        'version' => $shortCommit,
        'commit' => $commit,
        'branch' => $branch,
        'last_update' => $lastUpdate,
        'is_git' => true
    ]);
}

/**
 * 檢查是否有更新
 */
function handleCheckUpdate()
{
    $projectRoot = dirname(dirname(__DIR__));

    if (!is_dir($projectRoot . '/.git')) {
        echo json_encode([
            'success' => false,
            'message' => '非 Git 部署，無法檢查更新'
        ]);
        return;
    }

    // 獲取當前提交
    exec('cd ' . escapeshellarg($projectRoot) . ' && git rev-parse HEAD 2>&1', $currentOutput, $currentCode);
    if ($currentCode !== 0) {
        echo json_encode([
            'success' => false,
            'message' => '無法獲取當前版本信息'
        ]);
        return;
    }
    $currentCommit = trim($currentOutput[0]);

    // 獲取當前分支
    exec('cd ' . escapeshellarg($projectRoot) . ' && git rev-parse --abbrev-ref HEAD 2>&1', $branchOutput, $branchCode);
    $branch = $branchCode === 0 ? trim($branchOutput[0]) : 'main';

    // 獲取遠程更新
    exec('cd ' . escapeshellarg($projectRoot) . ' && git fetch --all 2>&1', $fetchOutput, $fetchCode);
    if ($fetchCode !== 0) {
        echo json_encode([
            'success' => false,
            'message' => '無法連接到遠程倉庫'
        ]);
        return;
    }

    // 獲取遠程提交
    exec('cd ' . escapeshellarg($projectRoot) . ' && git rev-parse origin/' . escapeshellarg($branch) . ' 2>&1', $remoteOutput, $remoteCode);
    if ($remoteCode !== 0) {
        echo json_encode([
            'success' => false,
            'message' => '無法獲取遠程版本信息'
        ]);
        return;
    }
    $remoteCommit = trim($remoteOutput[0]);

    $hasUpdate = $currentCommit !== $remoteCommit;

    // 如果有更新，獲取更新日誌
    $changelog = [];
    if ($hasUpdate) {
        exec('cd ' . escapeshellarg($projectRoot) . ' && git log --oneline --no-merges ' . escapeshellarg($currentCommit . '..' . $remoteCommit) . ' 2>&1', $changelog);
        $changelog = array_slice($changelog, 0, 10); // 最多顯示10條
    }

    echo json_encode([
        'success' => true,
        'has_update' => $hasUpdate,
        'current_version' => substr($currentCommit, 0, 7),
        'remote_version' => substr($remoteCommit, 0, 7),
        'branch' => $branch,
        'changelog' => $changelog
    ]);
}

/**
 * 執行更新
 */
function handleUpdate()
{
    $projectRoot = dirname(dirname(__DIR__));
    $updateScript = $projectRoot . '/update.sh';

    if (!file_exists($updateScript)) {
        echo json_encode([
            'success' => false,
            'message' => '更新腳本不存在'
        ]);
        return;
    }

    // 確保腳本有執行權限
    chmod($updateScript, 0755);

    // 執行更新腳本
    $output = [];
    $returnCode = 0;
    exec('cd ' . escapeshellarg($projectRoot) . ' && bash update.sh 2>&1', $output, $returnCode);

    if ($returnCode === 0) {
        echo json_encode([
            'success' => true,
            'message' => '更新成功',
            'output' => implode("\n", $output)
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => '更新失敗',
            'output' => implode("\n", $output)
        ]);
    }
}
