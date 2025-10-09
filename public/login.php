<!DOCTYPE html>
<html lang="zh-Hant">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登入 / 註冊 - 家庭任務管理系統</title>
    <link rel="stylesheet" href="/css/design-tokens.css">
    <link rel="stylesheet" href="/css/base.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/utilities.css">
    <style>
        /* 登錄頁面專用樣式 */
        .login-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: var(--spacing-4);
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
        }

        .login-card {
            background: var(--color-surface);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-2xl);
            max-width: 480px;
            width: 100%;
            padding: var(--spacing-8);
        }

        .login-header {
            text-align: center;
            margin-bottom: var(--spacing-6);
        }

        .login-header h1 {
            font-size: var(--font-size-3xl);
            font-weight: var(--font-weight-bold);
            color: var(--color-text-primary);
            margin-bottom: var(--spacing-2);
        }

        .login-header p {
            color: var(--color-text-secondary);
            font-size: var(--font-size-sm);
        }

        .tabs {
            display: flex;
            gap: var(--spacing-2);
            margin-bottom: var(--spacing-6);
            border-bottom: 2px solid var(--color-border);
        }

        .tab {
            flex: 1;
            padding: var(--spacing-3) var(--spacing-4);
            text-align: center;
            cursor: pointer;
            border: none;
            background: none;
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-medium);
            color: var(--color-text-secondary);
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
            transition: all var(--transition-base);
        }

        .tab.active {
            color: var(--color-primary);
            border-bottom-color: var(--color-primary);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .form-group {
            margin-bottom: var(--spacing-4);
        }

        .form-group label {
            display: block;
            margin-bottom: var(--spacing-2);
            font-weight: var(--font-weight-medium);
            color: var(--color-text-primary);
            font-size: var(--font-size-sm);
        }

        .form-group input,
        .form-group select {
            width: 100%;
            padding: var(--spacing-3);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            transition: all var(--transition-base);
        }

        .form-group input:focus,
        .form-group select:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px oklch(from var(--color-primary) l c h / 0.1);
        }

        .radio-group {
            display: flex;
            gap: var(--spacing-4);
            margin-bottom: var(--spacing-4);
        }

        .radio-group label {
            display: flex;
            align-items: center;
            gap: var(--spacing-2);
            cursor: pointer;
        }

        .radio-group input[type="radio"] {
            width: auto;
        }

        .team-input-group {
            display: none;
        }

        .team-input-group.active {
            display: block;
        }

        .btn {
            width: 100%;
            padding: var(--spacing-3) var(--spacing-4);
            background: var(--color-primary);
            color: white;
            border: none;
            border-radius: var(--radius-md);
            font-size: var(--font-size-base);
            font-weight: var(--font-weight-medium);
            cursor: pointer;
            transition: all var(--transition-base);
        }

        .btn:hover {
            background: oklch(from var(--color-primary) calc(l * 0.9) c h);
        }

        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .alert {
            padding: var(--spacing-3);
            border-radius: var(--radius-md);
            margin-bottom: var(--spacing-4);
            font-size: var(--font-size-sm);
        }

        .alert-error {
            background: oklch(from var(--color-error) l c h / 0.1);
            color: var(--color-error);
            border: 1px solid oklch(from var(--color-error) l c h / 0.3);
        }

        .alert-success {
            background: oklch(from var(--color-success) l c h / 0.1);
            color: var(--color-success);
            border: 1px solid oklch(from var(--color-success) l c h / 0.3);
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-card">
            <div class="login-header">
                <h1>家庭任務管理系統</h1>
                <p>協作管理家庭事務，讓生活更有條理</p>
            </div>

            <div id="alert-container"></div>

            <div class="tabs">
                <button class="tab active" data-tab="login">登入</button>
                <button class="tab" data-tab="register">註冊</button>
            </div>

            <!-- 登入表單 -->
            <div id="login-form" class="tab-content active">
                <form id="loginForm">
                    <div class="form-group">
                        <label for="login-username">用戶名（郵箱）</label>
                        <input type="email" id="login-username" name="username" required placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label for="login-password">密碼</label>
                        <input type="password" id="login-password" name="password" required placeholder="輸入密碼">
                    </div>
                    <button type="submit" class="btn">登入</button>
                </form>
            </div>

            <!-- 註冊表單 -->
            <div id="register-form" class="tab-content">
                <form id="registerForm">
                    <div class="form-group">
                        <label for="register-username">用戶名（郵箱）</label>
                        <input type="email" id="register-username" name="username" required placeholder="your@email.com">
                    </div>
                    <div class="form-group">
                        <label for="register-password">密碼</label>
                        <input type="password" id="register-password" name="password" required placeholder="至少 6 個字符">
                    </div>
                    <div class="form-group">
                        <label for="register-nickname">暱稱</label>
                        <input type="text" id="register-nickname" name="nickname" required placeholder="顯示名稱">
                    </div>

                    <div class="form-group">
                        <label>團隊選項</label>
                        <div class="radio-group">
                            <label>
                                <input type="radio" name="team-option" value="create" checked>
                                創建新團隊
                            </label>
                            <label>
                                <input type="radio" name="team-option" value="join">
                                加入現有團隊
                            </label>
                        </div>
                    </div>

                    <div id="create-team-input" class="team-input-group active">
                        <div class="form-group">
                            <label for="team-name">團隊名稱</label>
                            <input type="text" id="team-name" name="team_name" placeholder="例如：我的家庭">
                        </div>
                    </div>

                    <div id="join-team-input" class="team-input-group">
                        <div class="form-group">
                            <label for="invite-code">邀請碼</label>
                            <input type="text" id="invite-code" name="invite_code" placeholder="輸入 6 位邀請碼" maxlength="6">
                        </div>
                    </div>

                    <button type="submit" class="btn">註冊</button>
                </form>
            </div>
        </div>
    </div>

    <script>
        // 標籤頁切換
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // 更新標籤頁狀態
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // 更新表單顯示
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById(`${targetTab}-form`).classList.add('active');

                // 清除提示訊息
                document.getElementById('alert-container').innerHTML = '';
            });
        });

        // 團隊選項切換
        document.querySelectorAll('input[name="team-option"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const value = e.target.value;
                document.getElementById('create-team-input').classList.toggle('active', value === 'create');
                document.getElementById('join-team-input').classList.toggle('active', value === 'join');
            });
        });

        // 顯示提示訊息
        function showAlert(message, type = 'error') {
            const alertContainer = document.getElementById('alert-container');
            alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        }

        // 登入表單提交
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const data = {
                action: 'login',
                username: formData.get('username'),
                password: formData.get('password')
            };

            try {
                const response = await fetch('/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showAlert('登入成功，正在跳轉...', 'success');
                    setTimeout(() => {
                        window.location.href = '/index.php';
                    }, 1000);
                } else {
                    showAlert(result.message || '登入失敗，請檢查用戶名和密碼');
                }
            } catch (error) {
                showAlert('網絡錯誤，請稍後再試');
                console.error('Login error:', error);
            }
        });

        // 註冊表單提交
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(e.target);
            const teamOption = formData.get('team-option');

            const data = {
                action: 'register',
                username: formData.get('username'),
                password: formData.get('password'),
                nickname: formData.get('nickname'),
                team_option: teamOption
            };

            // 根據團隊選項添加對應字段
            if (teamOption === 'create') {
                data.team_name = formData.get('team_name');
                if (!data.team_name) {
                    showAlert('請輸入團隊名稱');
                    return;
                }
            } else {
                data.invite_code = formData.get('invite_code');
                if (!data.invite_code || data.invite_code.length !== 6) {
                    showAlert('請輸入 6 位邀請碼');
                    return;
                }
            }

            try {
                const response = await fetch('/api/auth.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showAlert('註冊成功，正在跳轉...', 'success');
                    setTimeout(() => {
                        window.location.href = '/index.php';
                    }, 1000);
                } else {
                    showAlert(result.message || '註冊失敗，請重試');
                }
            } catch (error) {
                showAlert('網絡錯誤，請稍後再試');
                console.error('Register error:', error);
            }
        });

        // 頁面加載時檢查是否已登入
        (async function checkLoginStatus() {
            try {
                const response = await fetch('/api/auth.php?action=check');
                const result = await response.json();

                if (result.loggedIn) {
                    // 已登入，直接跳轉到主頁
                    window.location.href = '/index.php';
                }
            } catch (error) {
                console.error('Check login status error:', error);
            }
        })();
    </script>
</body>
</html>
