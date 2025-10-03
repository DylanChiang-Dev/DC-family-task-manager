#!/usr/bin/env php
<?php
/**
 * 數據庫遷移腳本
 *
 * 用法：
 *   php scripts/migrate.php           # 執行所有待執行的遷移
 *   php scripts/migrate.php --status  # 查看遷移狀態
 *   php scripts/migrate.php --rollback # 回滾最後一次遷移
 */

// 載入配置
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../lib/Database.php';

// 解析命令行參數
$action = $argv[1] ?? 'migrate';

try {
    $db = Database::getInstance()->getConnection();

    // 確保 migrations 表存在
    createMigrationsTable($db);

    switch ($action) {
        case '--status':
            showMigrationStatus($db);
            break;
        case '--rollback':
            rollbackMigration($db);
            break;
        default:
            runMigrations($db);
            break;
    }

} catch (Exception $e) {
    echo "❌ 錯誤: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * 創建遷移追蹤表
 */
function createMigrationsTable($db)
{
    $sql = "CREATE TABLE IF NOT EXISTS migrations (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        migration VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_migration (migration)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

    $db->exec($sql);
}

/**
 * 獲取所有遷移文件
 */
function getMigrationFiles()
{
    $migrationsDir = __DIR__ . '/../database/migrations';
    $files = glob($migrationsDir . '/*.sql');

    // 過濾掉 .down.sql 文件
    $files = array_filter($files, function($file) {
        return !preg_match('/\.down\.sql$/', $file);
    });

    // 按文件名排序（時間戳順序）
    sort($files);

    return array_map('basename', $files);
}

/**
 * 獲取已執行的遷移
 */
function getExecutedMigrations($db)
{
    $stmt = $db->query("SELECT migration FROM migrations ORDER BY migration");
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * 執行遷移
 */
function runMigrations($db)
{
    $allMigrations = getMigrationFiles();
    $executedMigrations = getExecutedMigrations($db);
    $pendingMigrations = array_diff($allMigrations, $executedMigrations);

    if (empty($pendingMigrations)) {
        echo "✅ 沒有待執行的遷移\n";
        return;
    }

    echo "發現 " . count($pendingMigrations) . " 個待執行的遷移：\n\n";

    foreach ($pendingMigrations as $migration) {
        executeMigration($db, $migration);
    }

    echo "\n✅ 所有遷移執行完成\n";
}

/**
 * 執行單個遷移
 */
function executeMigration($db, $migration)
{
    $migrationPath = __DIR__ . '/../database/migrations/' . $migration;

    echo "執行遷移: $migration ... ";

    try {
        // 開始事務
        $db->beginTransaction();

        // 讀取並執行 SQL
        $sql = file_get_contents($migrationPath);

        // 移除註釋和空行，分割 SQL 語句
        $statements = splitSqlStatements($sql);

        foreach ($statements as $statement) {
            if (!empty(trim($statement))) {
                $db->exec($statement);
            }
        }

        // 記錄遷移
        $stmt = $db->prepare("INSERT INTO migrations (migration) VALUES (?)");
        $stmt->execute([$migration]);

        // 提交事務
        $db->commit();

        echo "✅\n";
    } catch (Exception $e) {
        // 回滾事務
        $db->rollBack();
        echo "❌\n";
        throw new Exception("遷移 $migration 執行失敗: " . $e->getMessage());
    }
}

/**
 * 分割 SQL 語句
 */
function splitSqlStatements($sql)
{
    // 移除 SQL 註釋
    $sql = preg_replace('/--[^\n]*\n/', "\n", $sql);
    $sql = preg_replace('/\/\*.*?\*\//s', '', $sql);

    // 按分號分割（簡單處理，不處理存儲過程等複雜情況）
    $statements = explode(';', $sql);

    return array_filter(array_map('trim', $statements));
}

/**
 * 顯示遷移狀態
 */
function showMigrationStatus($db)
{
    $allMigrations = getMigrationFiles();
    $executedMigrations = getExecutedMigrations($db);

    echo "數據庫遷移狀態：\n";
    echo str_repeat("=", 80) . "\n";
    echo sprintf("%-60s %s\n", "遷移文件", "狀態");
    echo str_repeat("-", 80) . "\n";

    if (empty($allMigrations)) {
        echo "沒有找到遷移文件\n";
        return;
    }

    foreach ($allMigrations as $migration) {
        $status = in_array($migration, $executedMigrations) ? "✅ 已執行" : "⏳ 待執行";
        echo sprintf("%-60s %s\n", $migration, $status);
    }

    echo str_repeat("=", 80) . "\n";
    echo "總計: " . count($allMigrations) . " 個遷移，";
    echo "已執行: " . count($executedMigrations) . " 個，";
    echo "待執行: " . (count($allMigrations) - count($executedMigrations)) . " 個\n";
}

/**
 * 回滾最後一次遷移
 */
function rollbackMigration($db)
{
    $executedMigrations = getExecutedMigrations($db);

    if (empty($executedMigrations)) {
        echo "❌ 沒有可回滾的遷移\n";
        return;
    }

    $lastMigration = end($executedMigrations);
    $rollbackFile = str_replace('.sql', '.down.sql', $lastMigration);
    $rollbackPath = __DIR__ . '/../database/migrations/' . $rollbackFile;

    if (!file_exists($rollbackPath)) {
        echo "❌ 回滾文件不存在: $rollbackFile\n";
        echo "提示: 該遷移沒有提供回滾腳本\n";
        return;
    }

    echo "回滾遷移: $lastMigration ... ";

    try {
        // 開始事務
        $db->beginTransaction();

        // 讀取並執行回滾 SQL
        $sql = file_get_contents($rollbackPath);
        $statements = splitSqlStatements($sql);

        foreach ($statements as $statement) {
            if (!empty(trim($statement))) {
                $db->exec($statement);
            }
        }

        // 移除遷移記錄
        $stmt = $db->prepare("DELETE FROM migrations WHERE migration = ?");
        $stmt->execute([$lastMigration]);

        // 提交事務
        $db->commit();

        echo "✅\n";
        echo "✅ 回滾完成\n";
    } catch (Exception $e) {
        // 回滾事務
        $db->rollBack();
        echo "❌\n";
        throw new Exception("回滾失敗: " . $e->getMessage());
    }
}
