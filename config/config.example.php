<?php
// 应用配置示例
// 复制此文件为 config.php

define('APP_NAME', '家庭任务管理');
define('APP_VERSION', '1.0.0');
define('BASE_URL', 'http://localhost');

// 会话配置
define('SESSION_LIFETIME', 7200); // 2小时

// 密码加密配置
define('PASSWORD_ALGO', PASSWORD_BCRYPT);
define('PASSWORD_COST', 10);

// 时区
date_default_timezone_set('Asia/Shanghai');
