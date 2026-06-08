#!/usr/bin/env php
<?php
/**
 * 生成新的遷移文件
 *
 * 用法：
 *   php scripts/make-migration.php "add user avatar column"
 *   php scripts/make-migration.php "create notifications table"
 */

if ($argc < 2) {
    echo "用法: php scripts/make-migration.php \"migration description\"\n";
    echo "例如: php scripts/make-migration.php \"add user avatar column\"\n";
    exit(1);
}

$description = $argv[1];

// 清理描述（移除特殊字符，轉換為小寫，空格轉下劃線）
$cleanDescription = strtolower($description);
$cleanDescription = preg_replace('/[^a-z0-9\s]/', '', $cleanDescription);
$cleanDescription = preg_replace('/\s+/', '_', trim($cleanDescription));

// 生成時間戳
$timestamp = date('YmdHis');

// 生成文件名
$filename = $timestamp . '_' . $cleanDescription . '.sql';
$filepath = __DIR__ . '/../database/migrations/' . $filename;

// 生成遷移文件模板
$template = <<<SQL
-- $filename
-- $description

-- 在此處編寫您的遷移 SQL
-- 例如：

-- 添加新欄位
-- ALTER TABLE users
-- ADD COLUMN avatar_url VARCHAR(255) NULL COMMENT '頭像URL' AFTER nickname;

-- 創建新表
-- CREATE TABLE notifications (
--     id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--     user_id INT UNSIGNED NOT NULL,
--     message TEXT NOT NULL,
--     is_read BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加索引
-- ALTER TABLE tasks ADD INDEX idx_due_date (due_date);

SQL;

// 寫入文件
file_put_contents($filepath, $template);

echo "✅ 遷移文件已創建: $filename\n";
echo "路徑: $filepath\n";
echo "\n";
echo "下一步：\n";
echo "1. 編輯遷移文件並添加 SQL 語句\n";
echo "2. 執行遷移: php scripts/migrate.php\n";
echo "3. 檢查狀態: php scripts/migrate.php --status\n";

// 詢問是否創建回滾文件
echo "\n是否創建回滾文件? (y/n): ";
$handle = fopen("php://stdin", "r");
$line = fgets($handle);
if (trim($line) === 'y' || trim($line) === 'Y') {
    $rollbackFilename = $timestamp . '_' . $cleanDescription . '.down.sql';
    $rollbackFilepath = __DIR__ . '/../database/migrations/' . $rollbackFilename;

    $rollbackTemplate = <<<SQL
-- $rollbackFilename
-- 回滾: $description

-- 在此處編寫回滾 SQL（與正向遷移相反的操作）
-- 例如：

-- 移除欄位
-- ALTER TABLE users DROP COLUMN avatar_url;

-- 刪除表
-- DROP TABLE IF EXISTS notifications;

-- 移除索引
-- ALTER TABLE tasks DROP INDEX idx_due_date;

SQL;

    file_put_contents($rollbackFilepath, $rollbackTemplate);
    echo "✅ 回滾文件已創建: $rollbackFilename\n";
}

fclose($handle);
