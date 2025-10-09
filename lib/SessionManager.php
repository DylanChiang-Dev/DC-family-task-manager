<?php
/**
 * Session 管理器
 *
 * 提供統一的 Session 安全配置和超時檢查
 * T073: Session 安全配置 + 會話超時實現
 */

class SessionManager
{
    /**
     * 初始化 Session（包含安全配置和超時檢查）
     *
     * @param bool $requireAuth 是否要求用戶已登錄（默認 true）
     * @return void
     */
    public static function init($requireAuth = true)
    {
        // 如果 Session 已啟動，直接返回
        if (session_status() === PHP_SESSION_ACTIVE) {
            self::checkTimeout();
            if ($requireAuth) {
                self::requireLogin();
            }
            return;
        }

        // Session 安全配置
        session_set_cookie_params([
            'lifetime' => 0,           // 瀏覽器關閉時清除 Cookie
            'path' => '/',
            'domain' => '',
            'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on', // HTTPS 啟用時設為 true
            'httponly' => true,        // 防止 JavaScript 訪問 Cookie
            'samesite' => 'Strict'     // 防止 CSRF 攻擊
        ]);

        session_start();

        // 會話超時檢查
        self::checkTimeout();

        // 如果要求認證，檢查登錄狀態
        if ($requireAuth) {
            self::requireLogin();
        }
    }

    /**
     * 檢查會話超時（24小時無活動自動登出）
     *
     * @return void
     */
    private static function checkTimeout()
    {
        if (!isset($_SESSION['user_id'])) {
            return;
        }

        $timeout = 86400; // 24 小時（秒）
        $lastActivity = $_SESSION['last_activity'] ?? null;

        if ($lastActivity && (time() - $lastActivity > $timeout)) {
            // 超過 24 小時無活動，銷毀會話
            self::destroy();

            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Session expired. Please login again.'
            ]);
            exit;
        }

        // 更新最後活動時間
        $_SESSION['last_activity'] = time();
    }

    /**
     * 要求用戶已登錄，否則返回 401 錯誤
     *
     * @return void
     */
    private static function requireLogin()
    {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Authentication required'
            ]);
            exit;
        }
    }

    /**
     * 創建用戶會話（登錄時調用）
     *
     * @param array $userData 用戶數據（id, username, nickname, current_team_id）
     * @return void
     */
    public static function create($userData)
    {
        $_SESSION['user_id'] = $userData['id'];
        $_SESSION['username'] = $userData['username'];
        $_SESSION['nickname'] = $userData['nickname'];
        $_SESSION['current_team_id'] = $userData['current_team_id'] ?? null;
        $_SESSION['last_activity'] = time();

        // Session ID 輪換（防止 Session 固定攻擊）
        session_regenerate_id(true);
    }

    /**
     * 銷毀會話（登出時調用）
     *
     * @return void
     */
    public static function destroy()
    {
        session_unset();
        session_destroy();

        // 清除 Cookie
        if (isset($_COOKIE[session_name()])) {
            setcookie(session_name(), '', time() - 3600, '/');
        }
    }

    /**
     * 獲取當前登錄用戶 ID
     *
     * @return int|null
     */
    public static function getUserId()
    {
        return $_SESSION['user_id'] ?? null;
    }

    /**
     * 獲取當前團隊 ID
     *
     * @return int|null
     */
    public static function getCurrentTeamId()
    {
        return $_SESSION['current_team_id'] ?? null;
    }

    /**
     * 更新當前團隊 ID
     *
     * @param int $teamId
     * @return void
     */
    public static function setCurrentTeamId($teamId)
    {
        $_SESSION['current_team_id'] = $teamId;
    }

    /**
     * 檢查用戶是否已登錄
     *
     * @return bool
     */
    public static function isLoggedIn()
    {
        return isset($_SESSION['user_id']);
    }
}
