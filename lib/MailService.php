<?php
/**
 * 郵件服務類 (可選功能)
 *
 * 功能：
 * - sendMail(): 使用 SMTP 發送郵件
 * - sendDueReminderEmail(): 到期提醒郵件
 * - sendTaskAssignedEmail(): 任務分配郵件
 *
 * 注意: 此為框架代碼,需要配置 SMTP 服務器才能使用
 * 推薦使用 PHPMailer 或 SwiftMailer 庫
 */

class MailService
{
    private $smtp_host;
    private $smtp_port;
    private $smtp_username;
    private $smtp_password;
    private $from_email;
    private $from_name;
    private $enabled;

    public function __construct()
    {
        // 從配置文件讀取 SMTP 設置
        $this->smtp_host = defined('SMTP_HOST') ? SMTP_HOST : '';
        $this->smtp_port = defined('SMTP_PORT') ? SMTP_PORT : 587;
        $this->smtp_username = defined('SMTP_USERNAME') ? SMTP_USERNAME : '';
        $this->smtp_password = defined('SMTP_PASSWORD') ? SMTP_PASSWORD : '';
        $this->from_email = defined('SMTP_FROM_EMAIL') ? SMTP_FROM_EMAIL : 'noreply@example.com';
        $this->from_name = defined('SMTP_FROM_NAME') ? SMTP_FROM_NAME : '家庭任務管理系統';

        // 如果未配置 SMTP,禁用郵件功能
        $this->enabled = !empty($this->smtp_host) && !empty($this->smtp_username);
    }

    /**
     * 檢查郵件功能是否啟用
     */
    public function isEnabled()
    {
        return $this->enabled;
    }

    /**
     * 發送郵件 (使用 PHP mail() 函數 - 簡單實現)
     *
     * 注意: 生產環境建議使用 PHPMailer 或 SwiftMailer
     *
     * @param string $to 收件人郵箱
     * @param string $subject 郵件主題
     * @param string $body 郵件內容 (HTML)
     * @return bool 是否成功
     */
    public function sendMail($to, $subject, $body)
    {
        if (!$this->enabled) {
            error_log("MailService: 郵件功能未啟用");
            return false;
        }

        try {
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=utf-8',
                "From: {$this->from_name} <{$this->from_email}>",
                'X-Mailer: PHP/' . phpversion()
            ];

            $success = mail(
                $to,
                '=?UTF-8?B?' . base64_encode($subject) . '?=',
                $body,
                implode("\r\n", $headers)
            );

            if (!$success) {
                error_log("MailService: 發送郵件失敗 to={$to}, subject={$subject}");
            }

            return $success;

        } catch (Exception $e) {
            error_log("MailService::sendMail() failed: " . $e->getMessage());
            return false;
        }
    }

    /**
     * 發送到期提醒郵件
     *
     * @param string $user_email 用戶郵箱
     * @param array $task 任務數據
     * @return bool 是否成功
     */
    public function sendDueReminderEmail($user_email, $task)
    {
        if (!$this->enabled) {
            return false;
        }

        $subject = '任務到期提醒:' . $task['title'];

        $body = "
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: 'Microsoft YaHei', Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .footer { padding: 10px; text-align: center; font-size: 12px; color: #6b7280; }
                .task-info { background-color: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>⏰ 任務到期提醒</h1>
                </div>
                <div class='content'>
                    <p>您好,</p>
                    <p>以下任務即將到期,請及時處理:</p>
                    <div class='task-info'>
                        <h3>{$task['title']}</h3>
                        <p><strong>描述:</strong> {$task['description']}</p>
                        <p><strong>截止日期:</strong> {$task['due_date']}</p>
                        <p><strong>優先級:</strong> {$task['priority']}</p>
                    </div>
                    <p><a href='https://yourdomain.com' style='display:inline-block; padding:10px 20px; background-color:#3B82F6; color:white; text-decoration:none; border-radius:5px;'>查看任務</a></p>
                </div>
                <div class='footer'>
                    <p>此郵件由系統自動發送,請勿回覆</p>
                </div>
            </div>
        </body>
        </html>
        ";

        return $this->sendMail($user_email, $subject, $body);
    }

    /**
     * 發送任務分配郵件
     *
     * @param string $user_email 用戶郵箱
     * @param array $task 任務數據
     * @param string $assigner_name 分配者名稱
     * @return bool 是否成功
     */
    public function sendTaskAssignedEmail($user_email, $task, $assigner_name)
    {
        if (!$this->enabled) {
            return false;
        }

        $subject = '新任務分配:' . $task['title'];

        $body = "
        <html>
        <head>
            <meta charset='utf-8'>
            <style>
                body { font-family: 'Microsoft YaHei', Arial, sans-serif; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9fafb; }
                .footer { padding: 10px; text-align: center; font-size: 12px; color: #6b7280; }
                .task-info { background-color: white; padding: 15px; border-radius: 8px; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>📋 新任務分配</h1>
                </div>
                <div class='content'>
                    <p>您好,</p>
                    <p><strong>{$assigner_name}</strong> 分配了一個新任務給您:</p>
                    <div class='task-info'>
                        <h3>{$task['title']}</h3>
                        <p><strong>描述:</strong> {$task['description']}</p>
                        <p><strong>截止日期:</strong> {$task['due_date']}</p>
                        <p><strong>優先級:</strong> {$task['priority']}</p>
                    </div>
                    <p><a href='https://yourdomain.com' style='display:inline-block; padding:10px 20px; background-color:#10B981; color:white; text-decoration:none; border-radius:5px;'>查看任務</a></p>
                </div>
                <div class='footer'>
                    <p>此郵件由系統自動發送,請勿回覆</p>
                </div>
            </div>
        </body>
        </html>
        ";

        return $this->sendMail($user_email, $subject, $body);
    }
}
