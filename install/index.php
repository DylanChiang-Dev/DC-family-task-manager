<?php
/**
 * Installation Wizard Entry Point
 *
 * Redirects to appropriate step based on installation state
 */

// Check if already installed
if (file_exists(__DIR__ . '/../config/installed.lock')) {
    header('Location: /public/index.php');
    exit;
}

// Check if database configuration exists
if (file_exists(__DIR__ . '/../config/database.php')) {
    // Database configured, check if tables exist
    require_once __DIR__ . '/../config/database.php';
    try {
        require_once __DIR__ . '/../config/Database.php';
        $db = Database::getInstance()->getConnection();

        // Check if users table exists
        $stmt = $db->query("SHOW TABLES LIKE 'users'");
        if ($stmt->rowCount() > 0) {
            // Tables exist, go to step 4
            header('Location: /install/step4.php');
            exit;
        } else {
            // Tables don't exist, go to step 3
            header('Location: /install/step3.php');
            exit;
        }
    } catch (Exception $e) {
        // Database connection failed, go to step 2
        header('Location: /install/step2.php');
        exit;
    }
}

// No configuration, start from step 1
header('Location: /install/step1.php');
exit;
