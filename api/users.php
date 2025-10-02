<?php
/**
 * Users API
 *
 * Endpoints:
 * - GET /api/users.php - Get all users (for task assignment dropdown)
 */

session_start();

// Load configuration
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../lib/Database.php';

header('Content-Type: application/json');

// Check authentication
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

try {
    $db = Database::getInstance()->getConnection();

    // Get all users
    $stmt = $db->query("SELECT id, username, nickname, role FROM users ORDER BY nickname");
    $users = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'users' => $users
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
