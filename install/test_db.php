<?php
header('Content-Type: application/json');

$host = $_POST['db_host'] ?? '';
$port = $_POST['db_port'] ?? '3306';
$name = $_POST['db_name'] ?? '';
$user = $_POST['db_user'] ?? '';
$pass = $_POST['db_pass'] ?? '';

if (empty($host) || empty($name) || empty($user)) {
    echo json_encode([
        'success' => false,
        'message' => '请填写完整的数据库信息'
    ]);
    exit;
}

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4";
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    // 测试查询
    $pdo->query("SELECT 1");

    echo json_encode([
        'success' => true,
        'message' => '数据库连接成功'
    ]);
} catch (PDOException $e) {
    $message = $e->getMessage();

    // 友好的错误提示
    if (strpos($message, 'Access denied') !== false) {
        $message = '用户名或密码错误';
    } elseif (strpos($message, 'Unknown database') !== false) {
        $message = '数据库不存在，请先创建数据库';
    } elseif (strpos($message, 'Connection refused') !== false) {
        $message = '无法连接到数据库服务器';
    }

    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
}
