<?php
session_start();
require_once '../config/config.php';

// 检查登录状态
$isLoggedIn = isset($_SESSION['user_id']);
?>
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo APP_NAME; ?></title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div id="app">
        <?php if (!$isLoggedIn): ?>
            <div id="auth-container">
                <div class="auth-box">
                    <h1><?php echo APP_NAME; ?></h1>
                    <div id="login-form" class="form-container">
                        <h2>登录</h2>
                        <form id="loginForm">
                            <input type="text" name="username" placeholder="用户名" required>
                            <input type="password" name="password" placeholder="密码" required>
                            <button type="submit">登录</button>
                        </form>
                        <p>还没有账号？<a href="#" id="showRegister">立即注册</a></p>
                    </div>
                    <div id="register-form" class="form-container" style="display: none;">
                        <h2>注册</h2>
                        <form id="registerForm">
                            <input type="text" name="username" placeholder="用户名" required>
                            <input type="password" name="password" placeholder="密码" required>
                            <input type="text" name="nickname" placeholder="昵称" required>
                            <button type="submit">注册</button>
                        </form>
                        <p>已有账号？<a href="#" id="showLogin">返回登录</a></p>
                    </div>
                </div>
            </div>
        <?php else: ?>
            <nav class="navbar">
                <h1><?php echo APP_NAME; ?></h1>
                <div class="user-info">
                    <span>欢迎，<?php echo htmlspecialchars($_SESSION['nickname']); ?></span>
                    <button id="logoutBtn">退出</button>
                </div>
            </nav>

            <div class="container">
                <div class="task-controls">
                    <button id="newTaskBtn" class="btn-primary">+ 新建任务</button>
                    <div class="filter-tabs">
                        <button class="tab active" data-status="all">全部</button>
                        <button class="tab" data-status="pending">待处理</button>
                        <button class="tab" data-status="in_progress">进行中</button>
                        <button class="tab" data-status="completed">已完成</button>
                    </div>
                </div>

                <div id="taskList" class="task-list"></div>
            </div>

            <!-- 新建/编辑任务模态框 -->
            <div id="taskModal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2 id="modalTitle">新建任务</h2>
                    <form id="taskForm">
                        <input type="hidden" name="id">
                        <input type="text" name="title" placeholder="任务标题" required>
                        <textarea name="description" placeholder="任务描述" rows="4"></textarea>
                        <select name="assignee_id">
                            <option value="">未分配</option>
                        </select>
                        <select name="priority">
                            <option value="low">低优先级</option>
                            <option value="medium" selected>中优先级</option>
                            <option value="high">高优先级</option>
                        </select>
                        <input type="datetime-local" name="due_date" placeholder="截止时间">
                        <button type="submit" class="btn-primary">保存</button>
                    </form>
                </div>
            </div>
        <?php endif; ?>
    </div>

    <script src="js/app.js"></script>
</body>
</html>
