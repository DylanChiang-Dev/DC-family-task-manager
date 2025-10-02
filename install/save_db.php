<?php
header('Content-Type: application/json');

$host = $_POST['db_host'] ?? '';
$port = $_POST['db_port'] ?? '3306';
$name = $_POST['db_name'] ?? '';
$user = $_POST['db_user'] ?? '';
$pass = $_POST['db_pass'] ?? '';
$prefix = $_POST['db_prefix'] ?? '';

if (empty($host) || empty($name) || empty($user)) {
    echo json_encode([
        'success' => false,
        'message' => '请填写完整的数据库信息'
    ]);
    exit;
}

// 保存数据库配置
$dbConfig = "<?php\n";
$dbConfig .= "// 数据库配置\n";
$dbConfig .= "define('DB_HOST', '{$host}');\n";
$dbConfig .= "define('DB_PORT', '{$port}');\n";
$dbConfig .= "define('DB_NAME', '{$name}');\n";
$dbConfig .= "define('DB_USER', '{$user}');\n";
$dbConfig .= "define('DB_PASS', '" . addslashes($pass) . "');\n";
$dbConfig .= "define('DB_CHARSET', 'utf8mb4');\n";
$dbConfig .= "define('DB_PREFIX', '{$prefix}');\n";

$configDir = dirname(__DIR__) . '/config';
$dbFile = $configDir . '/database.php';

if (file_put_contents($dbFile, $dbConfig)) {
    echo json_encode([
        'success' => true,
        'message' => '数据库配置已保存'
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => '无法写入配置文件，请检查目录权限'
    ]);
}
