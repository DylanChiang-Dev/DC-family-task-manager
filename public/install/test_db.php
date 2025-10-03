<?php
/**
 * Test Database Connection API
 */

header('Content-Type: application/json');

try {
    // Get POST data
    $host = $_POST['db_host'] ?? 'localhost';
    $port = $_POST['db_port'] ?? '3306';
    $dbname = $_POST['db_name'] ?? '';
    $user = $_POST['db_user'] ?? '';
    $pass = $_POST['db_pass'] ?? '';

    // Validate inputs
    if (empty($dbname) || empty($user)) {
        throw new Exception('資料庫名稱和使用者名稱為必填');
    }

    // Attempt connection
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ];

    $pdo = new PDO($dsn, $user, $pass, $options);

    // Test query
    $pdo->query("SELECT 1");

    echo json_encode([
        'success' => true,
        'message' => '連線成功'
    ]);
} catch (PDOException $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
