<?php
/**
 * 安裝向導 - 環境檢查 API
 *
 * 功能：檢查系統環境是否滿足安裝要求
 * - PHP 版本 >= 7.4
 * - PDO 和 PDO MySQL 擴展
 * - config/ 目錄寫入權限
 * - database/migrations/ 目錄存在
 *
 * 返回 JSON 格式：
 * {
 *   "success": true,
 *   "checks": {
 *     "php_version": {"pass": true, "message": "PHP 8.1.0"},
 *     "pdo": {"pass": true, "message": "PDO 擴展已啟用"},
 *     "pdo_mysql": {"pass": true, "message": "PDO MySQL 擴展已啟用"},
 *     "config_writable": {"pass": true, "message": "config/ 目錄可寫入"},
 *     "migrations_exists": {"pass": true, "message": "database/migrations/ 目錄存在"}
 *   },
 *   "all_passed": true
 * }
 */

header('Content-Type: application/json; charset=utf-8');

$checks = [];

// 檢查 PHP 版本
$php_version = phpversion();
$php_version_passed = version_compare($php_version, '7.4.0', '>=');
$checks['php_version'] = [
    'pass' => $php_version_passed,
    'message' => $php_version_passed
        ? "PHP {$php_version} (符合要求 >= 7.4.0)"
        : "PHP {$php_version} (不符合要求，需要 >= 7.4.0)",
    'required' => true
];

// 檢查 PDO 擴展
$pdo_enabled = extension_loaded('pdo');
$checks['pdo'] = [
    'pass' => $pdo_enabled,
    'message' => $pdo_enabled
        ? 'PDO 擴展已啟用'
        : 'PDO 擴展未啟用，請在 php.ini 中啟用',
    'required' => true
];

// 檢查 PDO MySQL 擴展
$pdo_mysql_enabled = extension_loaded('pdo_mysql');
$checks['pdo_mysql'] = [
    'pass' => $pdo_mysql_enabled,
    'message' => $pdo_mysql_enabled
        ? 'PDO MySQL 擴展已啟用'
        : 'PDO MySQL 擴展未啟用，請在 php.ini 中啟用',
    'required' => true
];

// 檢查 config/ 目錄寫入權限
$config_dir = dirname(dirname(__DIR__)) . '/config';
$config_writable = is_dir($config_dir) && is_writable($config_dir);

// 如果目錄不存在，嘗試創建
if (!is_dir($config_dir)) {
    @mkdir($config_dir, 0755, true);
    $config_writable = is_dir($config_dir) && is_writable($config_dir);
}

$checks['config_writable'] = [
    'pass' => $config_writable,
    'message' => $config_writable
        ? 'config/ 目錄可寫入'
        : 'config/ 目錄不可寫入，請執行: chmod 777 config/',
    'required' => true
];

// 檢查 database/migrations/ 目錄是否存在
$migrations_dir = dirname(dirname(__DIR__)) . '/database/migrations';
$migrations_exists = is_dir($migrations_dir);

// 如果目錄不存在，嘗試創建
if (!$migrations_exists) {
    @mkdir($migrations_dir, 0755, true);
    $migrations_exists = is_dir($migrations_dir);
}

$checks['migrations_exists'] = [
    'pass' => $migrations_exists,
    'message' => $migrations_exists
        ? 'database/migrations/ 目錄存在'
        : 'database/migrations/ 目錄不存在，請創建該目錄',
    'required' => false  // 非強制要求，可自動創建
];

// 檢查所有必需項是否通過
$all_passed = true;
foreach ($checks as $key => $check) {
    if ($check['required'] && !$check['pass']) {
        $all_passed = false;
        break;
    }
}

// 返回結果
echo json_encode([
    'success' => true,
    'checks' => $checks,
    'all_passed' => $all_passed
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
