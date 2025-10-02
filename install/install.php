<?php
header('Content-Type: application/json');

$adminUser = $_POST['admin_user'] ?? '';
$adminPass = $_POST['admin_pass'] ?? '';
$adminNickname = $_POST['admin_nickname'] ?? '';
$siteName = $_POST['site_name'] ?? '家庭任务管理';

if (empty($adminUser) || empty($adminPass) || empty($adminNickname)) {
    echo json_encode([
        'success' => false,
        'message' => '请填写完整的管理员信息'
    ]);
    exit;
}

try {
    // 加载数据库配置
    require_once '../config/database.php';

    $dsn = "mysql:host=" . DB_HOST . ";port=" . (defined('DB_PORT') ? DB_PORT : '3306') . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $prefix = defined('DB_PREFIX') ? DB_PREFIX : '';

    // 开始事务
    $pdo->beginTransaction();

    // 创建用户表
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS {$prefix}users (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            nickname VARCHAR(50) NOT NULL,
            avatar VARCHAR(255) DEFAULT NULL,
            role ENUM('admin', 'member') DEFAULT 'member',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // 创建任务表
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS {$prefix}tasks (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            creator_id INT UNSIGNED NOT NULL,
            assignee_id INT UNSIGNED DEFAULT NULL,
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
            due_date DATETIME DEFAULT NULL,
            completed_at DATETIME DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES {$prefix}users(id) ON DELETE CASCADE,
            FOREIGN KEY (assignee_id) REFERENCES {$prefix}users(id) ON DELETE SET NULL,
            INDEX idx_status (status),
            INDEX idx_priority (priority),
            INDEX idx_creator (creator_id),
            INDEX idx_assignee (assignee_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // 创建任务评论表
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS {$prefix}task_comments (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            task_id INT UNSIGNED NOT NULL,
            user_id INT UNSIGNED NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES {$prefix}tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES {$prefix}users(id) ON DELETE CASCADE,
            INDEX idx_task (task_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    // 插入管理员账户
    $hashedPassword = password_hash($adminPass, PASSWORD_BCRYPT, ['cost' => 10]);
    $stmt = $pdo->prepare("INSERT INTO {$prefix}users (username, password, nickname, role) VALUES (?, ?, ?, 'admin')");
    $stmt->execute([$adminUser, $hashedPassword, $adminNickname]);

    // 提交事务
    $pdo->commit();

    // 保存应用配置
    $appConfig = "<?php\n";
    $appConfig .= "// 应用配置\n";
    $appConfig .= "define('APP_NAME', '{$siteName}');\n";
    $appConfig .= "define('APP_VERSION', '1.0.0');\n";
    $appConfig .= "define('BASE_URL', '');\n\n";
    $appConfig .= "// 会话配置\n";
    $appConfig .= "define('SESSION_LIFETIME', 7200);\n\n";
    $appConfig .= "// 密码加密配置\n";
    $appConfig .= "define('PASSWORD_ALGO', PASSWORD_BCRYPT);\n";
    $appConfig .= "define('PASSWORD_COST', 10);\n\n";
    $appConfig .= "// 时区\n";
    $appConfig .= "date_default_timezone_set('Asia/Shanghai');\n";

    $configDir = dirname(__DIR__) . '/config';
    file_put_contents($configDir . '/config.php', $appConfig);

    // 创建安装锁定文件
    file_put_contents($configDir . '/installed.lock', date('Y-m-d H:i:s'));

    echo json_encode([
        'success' => true,
        'message' => '安装成功'
    ]);

} catch (PDOException $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    echo json_encode([
        'success' => false,
        'message' => '数据库错误: ' . $e->getMessage()
    ]);
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => '安装失败: ' . $e->getMessage()
    ]);
}
