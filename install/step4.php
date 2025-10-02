<?php
// 读取安装信息
$configFile = '../config/config.php';
$siteName = '家庭任务管理';
if (file_exists($configFile)) {
    include $configFile;
    if (defined('APP_NAME')) {
        $siteName = APP_NAME;
    }
}
?>
<div class="step-content success-content">
    <div class="success-icon">✓</div>
    <h2>安装完成！</h2>
    <p>恭喜，<?php echo htmlspecialchars($siteName); ?> 已成功安装</p>

    <div class="success-info">
        <h3>接下来您可以：</h3>
        <ul>
            <li>✓ 使用管理员账户登录系统</li>
            <li>✓ 邀请家庭成员注册账号</li>
            <li>✓ 开始创建和管理任务</li>
        </ul>
    </div>

    <div class="security-tips">
        <h3>⚠️ 安全提示</h3>
        <ul>
            <li>请删除或重命名 <code>install</code> 目录以防止重复安装</li>
            <li>建议定期备份数据库</li>
            <li>生产环境建议启用 HTTPS</li>
        </ul>
    </div>

    <div class="button-group">
        <a href="../public/index.php" class="btn-primary btn-large">进入系统</a>
    </div>
</div>

<style>
.success-content {
    text-align: center;
}

.success-icon {
    width: 100px;
    height: 100px;
    margin: 0 auto 20px;
    background: #26de81;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 60px;
    color: white;
}

.success-info, .security-tips {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: left;
}

.success-info h3, .security-tips h3 {
    margin-bottom: 10px;
    color: #333;
}

.success-info ul, .security-tips ul {
    list-style: none;
    padding: 0;
}

.success-info li, .security-tips li {
    padding: 8px 0;
    color: #666;
}

.security-tips {
    background: #fff3cd;
}

.security-tips code {
    background: #fff;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
}

.btn-large {
    padding: 15px 40px;
    font-size: 18px;
    margin-top: 20px;
}
</style>
