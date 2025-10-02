<?php
/**
 * Execute Installation API
 * Creates database tables and admin user
 */

header('Content-Type: application/json');

try {
    // Check if already installed
    if (file_exists(__DIR__ . '/../config/installed.lock')) {
        throw new Exception('Already installed');
    }

    // Check if database config exists
    if (!file_exists(__DIR__ . '/../config/database.php')) {
        throw new Exception('Database not configured');
    }

    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    $nickname = trim($input['nickname'] ?? '');

    // Validate inputs
    if (empty($username) || empty($password) || empty($nickname)) {
        throw new Exception('All fields are required');
    }

    if (strlen($username) < 3 || strlen($username) > 50) {
        throw new Exception('Username must be 3-50 characters');
    }

    if (strlen($password) < 8) {
        throw new Exception('Password must be at least 8 characters');
    }

    // Load database configuration
    require_once __DIR__ . '/../config/database.php';
    require_once __DIR__ . '/../lib/Database.php';

    $db = Database::getInstance()->getConnection();

    // Read and execute schema.sql
    $schemaSQL = file_get_contents(__DIR__ . '/../database/schema.sql');
    if ($schemaSQL === false) {
        throw new Exception('Failed to read schema.sql');
    }

    // Remove comments and split by semicolons (handling multi-line statements correctly)
    $schemaSQL = preg_replace('/--.*$/m', '', $schemaSQL); // Remove single-line comments
    $schemaSQL = preg_replace('/\/\*.*?\*\//s', '', $schemaSQL); // Remove multi-line comments

    // Split by semicolons, but keep complete statements together
    $statements = preg_split('/;[\s]*$/m', $schemaSQL);

    // Execute each statement
    foreach ($statements as $statement) {
        $statement = trim($statement);
        if (!empty($statement)) {
            try {
                $db->exec($statement);
            } catch (PDOException $e) {
                // Ignore table already exists errors
                if (strpos($e->getMessage(), 'already exists') === false &&
                    strpos($e->getMessage(), 'Duplicate entry') === false) {
                    throw $e;
                }
            }
        }
    }

    // Delete default admin if exists
    $stmt = $db->prepare("DELETE FROM users WHERE username = 'admin'");
    $stmt->execute();

    // Create admin user with provided credentials
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
    $stmt = $db->prepare("INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, 'admin')");
    $stmt->execute([$username, $hashedPassword, $nickname]);

    // Create installed.lock file
    $lockFile = __DIR__ . '/../config/installed.lock';
    $lockContent = "Installed at: " . date('Y-m-d H:i:s') . "\n";
    $lockContent .= "Admin user: $username\n";

    if (file_put_contents($lockFile, $lockContent) === false) {
        throw new Exception('Failed to create lock file');
    }

    echo json_encode([
        'success' => true,
        'message' => 'Installation completed successfully'
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
