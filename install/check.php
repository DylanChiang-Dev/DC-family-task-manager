<?php
header('Content-Type: application/json');

$checks = [];

// 检查 PHP 版本
$phpVersion = PHP_VERSION;
$checks[] = [
    'name' => 'PHP 版本',
    'passed' => version_compare($phpVersion, '7.4.0', '>='),
    'value' => $phpVersion,
    'message' => version_compare($phpVersion, '7.4.0', '>=') ? $phpVersion : '需要 PHP 7.4 或更高版本'
];

// 检查 PDO 扩展
$checks[] = [
    'name' => 'PDO 扩展',
    'passed' => extension_loaded('pdo'),
    'value' => extension_loaded('pdo') ? '已安装' : '',
    'message' => extension_loaded('pdo') ? '已安装' : '未安装 PDO 扩展'
];

// 检查 PDO MySQL 驱动
$checks[] = [
    'name' => 'PDO MySQL',
    'passed' => extension_loaded('pdo_mysql'),
    'value' => extension_loaded('pdo_mysql') ? '已安装' : '',
    'message' => extension_loaded('pdo_mysql') ? '已安装' : '未安装 PDO MySQL 驱动'
];

// 检查 JSON 扩展
$checks[] = [
    'name' => 'JSON 扩展',
    'passed' => extension_loaded('json'),
    'value' => extension_loaded('json') ? '已安装' : '',
    'message' => extension_loaded('json') ? '已安装' : '未安装 JSON 扩展'
];

// 检查配置目录写入权限
$configDir = dirname(__DIR__) . '/config';
$isWritable = is_writable($configDir);
$checks[] = [
    'name' => '配置目录权限',
    'passed' => $isWritable,
    'value' => $isWritable ? '可写' : '',
    'message' => $isWritable ? '可写' : '配置目录不可写，请设置权限'
];

echo json_encode([
    'success' => true,
    'checks' => $checks
]);
