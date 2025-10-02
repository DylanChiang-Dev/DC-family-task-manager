<?php
// 检查是否已安装
if (file_exists('../config/installed.lock')) {
    header('Location: ../public/index.php');
    exit;
}

$step = $_GET['step'] ?? 1;
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>家庭任务管理系统 - 安装向导</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="install-container">
        <div class="install-header">
            <h1>🏠 家庭任务管理系统</h1>
            <p>欢迎使用安装向导</p>
        </div>

        <div class="install-steps">
            <div class="step <?php echo $step >= 1 ? 'active' : ''; ?>">
                <span class="step-number">1</span>
                <span class="step-title">环境检测</span>
            </div>
            <div class="step <?php echo $step >= 2 ? 'active' : ''; ?>">
                <span class="step-number">2</span>
                <span class="step-title">数据库配置</span>
            </div>
            <div class="step <?php echo $step >= 3 ? 'active' : ''; ?>">
                <span class="step-number">3</span>
                <span class="step-title">管理员账户</span>
            </div>
            <div class="step <?php echo $step >= 4 ? 'active' : ''; ?>">
                <span class="step-number">4</span>
                <span class="step-title">完成安装</span>
            </div>
        </div>

        <div class="install-content">
            <?php
            switch ($step) {
                case 1:
                    include 'step1.php';
                    break;
                case 2:
                    include 'step2.php';
                    break;
                case 3:
                    include 'step3.php';
                    break;
                case 4:
                    include 'step4.php';
                    break;
                default:
                    include 'step1.php';
            }
            ?>
        </div>
    </div>

    <script src="install.js"></script>
</body>
</html>
