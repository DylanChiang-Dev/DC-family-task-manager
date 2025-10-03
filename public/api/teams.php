<?php
/**
 * Teams API
 *
 * Endpoints:
 * - GET /api/teams.php - Get all teams for current user
 * - POST /api/teams.php - Create new team
 * - PUT /api/teams.php?id=X - Update team (admin only)
 * - DELETE /api/teams.php?id=X - Delete team (admin only)
 * - POST /api/teams.php?action=join - Join team via invite code
 * - POST /api/teams.php?action=switch - Switch current team
 * - GET /api/teams.php?id=X&action=members - Get team members
 * - DELETE /api/teams.php?id=X&user_id=Y - Remove member (admin only)
 * - POST /api/teams.php?id=X&action=regenerate_code - Regenerate invite code (admin only)
 */

// Load dependencies（必須在session_start()之前）
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../../lib/Database.php';
require_once __DIR__ . '/../../lib/TeamHelper.php';

session_start();

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$userId = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
$teamId = $_GET['id'] ?? null;

try {
    $db = Database::getInstance()->getConnection();

    // Route based on method and action
    if ($method === 'GET' && $action === 'members' && $teamId) {
        handleGetMembers($db, $userId, $teamId);
    } elseif ($method === 'GET' && $teamId) {
        handleGetTeam($db, $userId, $teamId);
    } elseif ($method === 'GET') {
        handleGetTeams($db, $userId);
    } elseif ($method === 'POST' && $action === 'join') {
        handleJoinTeam($db, $userId);
    } elseif ($method === 'POST' && $action === 'switch') {
        handleSwitchTeam($db, $userId);
    } elseif ($method === 'POST' && $action === 'regenerate_code' && $teamId) {
        handleRegenerateCode($db, $userId, $teamId);
    } elseif ($method === 'POST') {
        handleCreateTeam($db, $userId);
    } elseif ($method === 'PUT' && $teamId) {
        handleUpdateTeam($db, $userId, $teamId);
    } elseif ($method === 'DELETE' && $teamId && isset($_GET['user_id'])) {
        handleRemoveMember($db, $userId, $teamId, $_GET['user_id']);
    } elseif ($method === 'DELETE' && $teamId) {
        handleDeleteTeam($db, $userId, $teamId);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid request']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

/**
 * 獲取當前用戶的所有團隊
 */
function handleGetTeams($db, $userId)
{
    $teams = TeamHelper::getUserTeams($db, $userId);

    // 獲取當前團隊
    $stmt = $db->prepare("SELECT current_team_id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $currentTeamId = $stmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'teams' => $teams,
        'current_team_id' => $currentTeamId
    ]);
}

/**
 * 獲取單個團隊的詳細信息
 */
function handleGetTeam($db, $userId, $teamId)
{
    // 檢查用戶是否為團隊成員
    if (!TeamHelper::isTeamMember($db, $userId, $teamId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You are not a member of this team']);
        return;
    }

    // 獲取團隊信息
    $stmt = $db->prepare("
        SELECT t.*, tm.role as user_role
        FROM teams t
        INNER JOIN team_members tm ON t.id = tm.team_id
        WHERE t.id = ? AND tm.user_id = ?
    ");
    $stmt->execute([$teamId, $userId]);
    $team = $stmt->fetch();

    if (!$team) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Team not found']);
        return;
    }

    echo json_encode([
        'success' => true,
        'team' => $team
    ]);
}

/**
 * 創建新團隊
 */
function handleCreateTeam($db, $userId)
{
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $teamName = trim($input['name'] ?? '');

    if (empty($teamName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Team name is required']);
        return;
    }

    if (strlen($teamName) > 100) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Team name too long (max 100 characters)']);
        return;
    }

    // Generate unique invite code
    $inviteCode = TeamHelper::generateInviteCode($db);

    // Create team
    $stmt = $db->prepare("INSERT INTO teams (name, invite_code, created_by) VALUES (?, ?, ?)");
    $stmt->execute([$teamName, $inviteCode, $userId]);
    $teamId = $db->lastInsertId();

    // Add creator as admin
    TeamHelper::addUserToTeam($db, $userId, $teamId, 'admin');

    // Switch to new team
    TeamHelper::switchTeam($db, $userId, $teamId);
    $_SESSION['current_team_id'] = $teamId;

    echo json_encode([
        'success' => true,
        'message' => 'Team created successfully',
        'team' => [
            'id' => $teamId,
            'name' => $teamName,
            'invite_code' => $inviteCode,
            'role' => 'admin'
        ]
    ]);
}

/**
 * Update team (admin only)
 */
function handleUpdateTeam($db, $userId, $teamId)
{
    // Check if user is admin
    if (!TeamHelper::isTeamAdmin($db, $userId, $teamId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only team admins can update team']);
        return;
    }

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $teamName = trim($input['name'] ?? '');

    if (empty($teamName)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Team name is required']);
        return;
    }

    $stmt = $db->prepare("UPDATE teams SET name = ? WHERE id = ?");
    $stmt->execute([$teamName, $teamId]);

    echo json_encode([
        'success' => true,
        'message' => 'Team updated successfully'
    ]);
}

/**
 * Delete team (admin only)
 */
function handleDeleteTeam($db, $userId, $teamId)
{
    // Check if user is admin
    if (!TeamHelper::isTeamAdmin($db, $userId, $teamId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only team admins can delete team']);
        return;
    }

    // Check if user has other teams
    $teams = TeamHelper::getUserTeams($db, $userId);
    if (count($teams) <= 1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Cannot delete your only team. Create another team first.']);
        return;
    }

    // Delete team (cascade will delete members and tasks)
    $stmt = $db->prepare("DELETE FROM teams WHERE id = ?");
    $stmt->execute([$teamId]);

    // If this was current team, switch to another team
    $stmt = $db->prepare("SELECT current_team_id FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $currentTeamId = $stmt->fetchColumn();

    if ($currentTeamId == $teamId) {
        $teams = TeamHelper::getUserTeams($db, $userId);
        if (!empty($teams)) {
            $newTeamId = $teams[0]['id'];
            TeamHelper::switchTeam($db, $userId, $newTeamId);
            $_SESSION['current_team_id'] = $newTeamId;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Team deleted successfully'
    ]);
}

/**
 * Join team via invite code
 */
function handleJoinTeam($db, $userId)
{
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $inviteCode = strtoupper(trim($input['invite_code'] ?? ''));

    if (empty($inviteCode)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invite code is required']);
        return;
    }

    // Validate invite code
    $team = TeamHelper::getTeamByInviteCode($db, $inviteCode);
    if (!$team) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Invalid invite code']);
        return;
    }

    // Check if already a member
    if (TeamHelper::isTeamMember($db, $userId, $team['id'])) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'You are already a member of this team']);
        return;
    }

    // Add user to team
    TeamHelper::addUserToTeam($db, $userId, $team['id'], 'member');

    // Switch to new team
    TeamHelper::switchTeam($db, $userId, $team['id']);
    $_SESSION['current_team_id'] = $team['id'];

    echo json_encode([
        'success' => true,
        'message' => 'Joined team successfully',
        'team' => [
            'id' => $team['id'],
            'name' => $team['name'],
            'role' => 'member'
        ]
    ]);
}

/**
 * Switch current team
 */
function handleSwitchTeam($db, $userId)
{
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $teamId = $input['team_id'] ?? null;

    if (!$teamId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Team ID is required']);
        return;
    }

    // Verify user is a member
    if (!TeamHelper::isTeamMember($db, $userId, $teamId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You are not a member of this team']);
        return;
    }

    // Switch team
    TeamHelper::switchTeam($db, $userId, $teamId);
    $_SESSION['current_team_id'] = $teamId;

    // Get team info
    $stmt = $db->prepare("SELECT name FROM teams WHERE id = ?");
    $stmt->execute([$teamId]);
    $teamName = $stmt->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Switched team successfully',
        'team' => [
            'id' => $teamId,
            'name' => $teamName
        ]
    ]);
}

/**
 * Get team members
 */
function handleGetMembers($db, $userId, $teamId)
{
    // Verify user is a member
    if (!TeamHelper::isTeamMember($db, $userId, $teamId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'You are not a member of this team']);
        return;
    }

    $members = TeamHelper::getTeamMembers($db, $teamId);

    echo json_encode([
        'success' => true,
        'members' => $members
    ]);
}

/**
 * Remove member from team (admin only)
 */
function handleRemoveMember($db, $userId, $teamId, $targetUserId)
{
    // Check if user is admin
    if (!TeamHelper::isTeamAdmin($db, $userId, $teamId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only team admins can remove members']);
        return;
    }

    // Cannot remove yourself
    if ($userId == $targetUserId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Cannot remove yourself. Delete the team instead.']);
        return;
    }

    // Remove member
    $removed = TeamHelper::removeUserFromTeam($db, $targetUserId, $teamId);

    if (!$removed) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'User is not a member of this team']);
        return;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Member removed successfully'
    ]);
}

/**
 * Regenerate invite code (admin only)
 */
function handleRegenerateCode($db, $userId, $teamId)
{
    // Check if user is admin
    if (!TeamHelper::isTeamAdmin($db, $userId, $teamId)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only team admins can regenerate invite code']);
        return;
    }

    // Generate new code
    $newCode = TeamHelper::generateInviteCode($db);

    $stmt = $db->prepare("UPDATE teams SET invite_code = ? WHERE id = ?");
    $stmt->execute([$newCode, $teamId]);

    echo json_encode([
        'success' => true,
        'message' => 'Invite code regenerated successfully',
        'invite_code' => $newCode
    ]);
}
