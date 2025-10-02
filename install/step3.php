<?php
/**
 * Installation Step 3: Admin Account Creation
 */

// Check if already installed
if (file_exists(__DIR__ . '/../config/installed.lock')) {
    header('Location: /public/index.php');
    exit;
}

// Check if database is configured
if (!file_exists(__DIR__ . '/../config/database.php')) {
    header('Location: /install/step2.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>家庭任務管理系統安裝 - 管理員帳號</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com" rel="preconnect"/>
    <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
    <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;700;900&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="/install/style.css"/>
    <script src="/install/install.js"></script>
    <script>
        tailwind.config = {
            darkMode: "class",
            theme: {
                extend: {
                    colors: {
                        "primary": "#137fec",
                        "background-light": "#f6f7f8",
                        "background-dark": "#101922",
                    },
                    fontFamily: {
                        "display": ["Public Sans"]
                    },
                    borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
                },
            },
        }
    </script>
</head>
<body class="bg-background-light dark:bg-background-dark font-display">
<div class="relative flex min-h-screen w-full flex-col">
    <div class="flex h-full grow flex-col">
        <header class="flex items-center justify-between whitespace-nowrap border-b border-black/10 dark:border-white/10 px-10 py-3">
            <div class="flex items-center gap-4 text-black dark:text-white">
                <div class="size-6 text-primary">
                    <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path d="M24 45.8096C19.6865 45.8096 15.4698 44.5305 11.8832 42.134C8.29667 39.7376 5.50128 36.3314 3.85056 32.3462C2.19985 28.361 1.76794 23.9758 2.60947 19.7452C3.451 15.5145 5.52816 11.6284 8.57829 8.5783C11.6284 5.52817 15.5145 3.45101 19.7452 2.60948C23.9758 1.76795 28.361 2.19986 32.3462 3.85057C36.3314 5.50129 39.7376 8.29668 42.134 11.8833C44.5305 15.4698 45.8096 19.6865 45.8096 24L24 24L24 45.8096Z" fill="currentColor"></path>
                    </svg>
                </div>
                <h2 class="text-lg font-bold leading-tight tracking-[-0.015em]">家庭任務管理系統安裝</h2>
            </div>
        </header>
        <main class="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div class="mx-auto w-full max-w-2xl">
                <div class="text-center">
                    <h1 class="text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">建立管理員帳號</h1>
                    <p class="mt-3 text-base leading-7 text-black/60 dark:text-white/60">設定您的管理員帳號以管理系統。</p>
                </div>
                <div class="mt-8 bg-white dark:bg-background-dark/50 rounded-lg p-6 shadow-sm">
                    <form id="admin-form" onsubmit="return handleSubmit(event)" class="space-y-6">
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">使用者名稱</label>
                            <input type="text" name="username" id="username" required minlength="3" maxlength="50"
                                   class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100"/>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">3-50 個字元，僅限字母和數字</p>
                        </div>

                        <div>
                            <label for="nickname" class="block text-sm font-medium text-gray-700 dark:text-gray-300">暱稱</label>
                            <input type="text" name="nickname" id="nickname" required maxlength="50"
                                   class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100"/>
                        </div>

                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">密碼</label>
                            <input type="password" name="password" id="password" required minlength="8" oninput="validatePassword()"
                                   class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100"/>
                            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">至少 8 個字元</p>
                        </div>

                        <div>
                            <label for="confirm_password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">確認密碼</label>
                            <input type="password" name="confirm_password" id="confirm_password" required minlength="8" oninput="validatePassword()"
                                   class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100"/>
                            <p id="password-error" class="mt-1 text-xs text-red-600 dark:text-red-400"></p>
                        </div>
                    </form>
                </div>

                <div class="mt-8 flex justify-between">
                    <a href="/install/step2.php"
                       class="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                        上一步
                    </a>
                    <button type="button" id="install-btn" onclick="handleInstall()" disabled
                            class="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50">
                        安裝
                    </button>
                </div>
            </div>
        </main>
    </div>
</div>

<script>
async function handleInstall() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const nickname = document.getElementById('nickname').value;
    const btn = document.getElementById('install-btn');

    btn.disabled = true;
    btn.innerHTML = '<div class="spinner mr-2"></div>安裝中...';

    try {
        await executeInstallation(username, password, nickname);
    } catch (error) {
        alert('安裝失敗：' + error.message);
        btn.disabled = false;
        btn.textContent = '安裝';
    }
}
</script>
</body>
</html>
