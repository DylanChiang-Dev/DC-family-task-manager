<?php
/**
 * Application Configuration Template
 *
 * Copy this file to config.php and customize the values
 */

// Application settings
define('APP_NAME', 'Family Task Manager');
define('APP_ENV', 'development'); // development or production
define('APP_DEBUG', true);

// Timezone
date_default_timezone_set('Asia/Shanghai');

// Session configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 0); // Set to 1 if using HTTPS

// Error reporting
if (APP_DEBUG) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}
