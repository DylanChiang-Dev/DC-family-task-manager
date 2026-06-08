<?php
/**
 * 應用版本配置
 * 用於前端資源緩存清除
 *
 * 每次發布新版本時更新 APP_VERSION
 * 前端資源會自動添加版本號參數: /css/style.css?v=1.3.0
 */

// 當前版本號 (遵循語義化版本)
define('APP_VERSION', '1.3.0');

// 構建時間戳 (用於開發環境強制刷新)
define('BUILD_TIMESTAMP', '20250110');

// 獲取資源版本參數
function getAssetVersion($isDev = false) {
    // 開發環境: 使用時間戳強制刷新
    if ($isDev || (defined('APP_ENV') && APP_ENV === 'development')) {
        return time();
    }

    // 生產環境: 使用版本號
    return APP_VERSION;
}

// 生成帶版本號的資源URL
function asset($path, $isDev = false) {
    $version = getAssetVersion($isDev);
    $separator = strpos($path, '?') !== false ? '&' : '?';
    return $path . $separator . 'v=' . $version;
}
