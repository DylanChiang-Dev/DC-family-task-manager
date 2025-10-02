<?php
/**
 * Main Application Entry Point
 */

// Check if installation is complete
if (!file_exists(__DIR__ . '/../config/installed.lock')) {
    header('Location: /install/index.php');
    exit;
}

session_start();

$isLoggedIn = isset($_SESSION['user_id']);
?>
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>家庭任務管理系統</title>
    <link href="https://fonts.googleapis.com" rel="preconnect"/>
    <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
    <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;700&display=swap" rel="stylesheet"/>
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet"/>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link rel="stylesheet" href="/public/css/style.css"/>
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
                    borderRadius: {
                        "DEFAULT": "0.25rem",
                        "lg": "0.5rem",
                        "xl": "0.75rem",
                        "full": "9999px"
                    },
                },
            },
        }
    </script>
</head>
<body class="bg-background-light dark:bg-background-dark font-display">

<?php if (!$isLoggedIn): ?>
    <!-- Login/Register Screen -->
    <div id="auth-screen" class="flex flex-col min-h-screen">
        <header class="border-b border-slate-200 dark:border-slate-800">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex items-center gap-3">
                        <div class="text-primary">
                            <svg class="h-8 w-8" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.263 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z" fill="currentColor"></path>
                                <path clip-rule="evenodd" d="M10.4485 13.8519C10.4749 13.9271 10.6203 14.246 11.379 14.7361C12.298 15.3298 13.7492 15.9145 15.6717 16.3735C18.0007 16.9296 20.8712 17.2655 24 17.2655C27.1288 17.2655 29.9993 16.9296 32.3283 16.3735C34.2508 15.9145 35.702 15.3298 36.621 14.7361C37.3796 14.246 37.5251 13.9271 37.5515 13.8519C37.5287 13.7876 37.4333 13.5973 37.0635 13.2931C36.5266 12.8516 35.6288 12.3647 34.343 11.9175C31.79 11.0295 28.1333 10.4437 24 10.4437C19.8667 10.4437 16.2099 11.0295 13.657 11.9175C12.3712 12.3647 11.4734 12.8516 10.9365 13.2931C10.5667 13.5973 10.4713 13.7876 10.4485 13.8519ZM37.5563 18.7877C36.3176 19.3925 34.8502 19.8839 33.2571 20.2642C30.5836 20.9025 27.3973 21.2655 24 21.2655C20.6027 21.2655 17.4164 20.9025 14.7429 20.2642C13.1498 19.8839 11.6824 19.3925 10.4436 18.7877V34.1275C10.4515 34.1545 10.5427 34.4867 11.379 35.027C12.298 35.6207 13.7492 36.2054 15.6717 36.6644C18.0007 37.2205 20.8712 37.5564 24 37.5564C27.1288 37.5564 29.9993 37.2205 32.3283 36.6644C34.2508 36.2054 35.702 35.6207 36.621 35.027C37.4573 34.4867 37.5485 34.1546 37.5563 34.1275V18.7877ZM41.5563 13.8546V34.1455C41.5563 36.1078 40.158 37.5042 38.7915 38.3869C37.3498 39.3182 35.4192 40.0389 33.2571 40.5551C30.5836 41.1934 27.3973 41.5564 24 41.5564C20.6027 41.5564 17.4164 41.1934 14.7429 40.5551C12.5808 40.0389 10.6502 39.3182 9.20848 38.3869C7.84205 37.5042 6.44365 36.1078 6.44365 34.1455L6.44365 13.8546C6.44365 12.2684 7.37223 11.0454 8.39581 10.2036C9.43325 9.3505 10.8137 8.67141 12.343 8.13948C15.4203 7.06909 19.5418 6.44366 24 6.44366C28.4582 6.44366 32.5797 7.06909 35.657 8.13948C37.1863 8.67141 38.5667 9.3505 39.6042 10.2036C40.6278 11.0454 41.5563 12.2684 41.5563 13.8546Z" fill="currentColor" fill-rule="evenodd"></path>
                            </svg>
                        </div>
                        <h1 class="text-xl font-bold text-slate-900 dark:text-white">家庭任務管理系統</h1>
                    </div>
                </div>
            </div>
        </header>

        <main class="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="w-full max-w-md space-y-8">
                <div>
                    <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">歡迎</h2>
                    <p class="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">登入以管理您家庭的任務</p>
                </div>

                <div class="bg-white dark:bg-slate-900/50 p-8 shadow-sm rounded-lg">
                    <div class="border-b border-slate-200 dark:border-slate-700">
                        <nav aria-label="Tabs" class="-mb-px flex space-x-8">
                            <button onclick="switchTab('login')" id="login-tab" class="tab-active border-primary text-primary whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">登入</button>
                            <button onclick="switchTab('register')" id="register-tab" class="tab-inactive border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">註冊</button>
                        </nav>
                    </div>

                    <!-- Login Form -->
                    <form id="login-form" class="mt-8 space-y-6">
                        <div class="space-y-4">
                            <div>
                                <label class="text-sm font-medium text-slate-700 dark:text-slate-300" for="login-username">使用者名稱</label>
                                <input autocomplete="username" class="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary focus:ring-primary text-slate-900 dark:text-slate-100" id="login-username" name="username" required type="text"/>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-slate-700 dark:text-slate-300" for="login-password">密碼</label>
                                <input autocomplete="current-password" class="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary focus:ring-primary text-slate-900 dark:text-slate-100" id="login-password" name="password" required type="password"/>
                            </div>
                        </div>
                        <div>
                            <button class="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" type="submit">登入</button>
                        </div>
                        <div id="login-error" class="hidden text-sm text-red-600 dark:text-red-400 text-center"></div>
                    </form>

                    <!-- Register Form -->
                    <form id="register-form" class="mt-8 space-y-6 hidden">
                        <div class="space-y-4">
                            <div>
                                <label class="text-sm font-medium text-slate-700 dark:text-slate-300" for="reg-username">使用者名稱</label>
                                <input class="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary focus:ring-primary text-slate-900 dark:text-slate-100" id="reg-username" name="username" required type="text"/>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-slate-700 dark:text-slate-300" for="reg-nickname">暱稱</label>
                                <input class="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary focus:ring-primary text-slate-900 dark:text-slate-100" id="reg-nickname" name="nickname" required type="text"/>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-slate-700 dark:text-slate-300" for="reg-password">密碼</label>
                                <input class="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-primary focus:ring-primary text-slate-900 dark:text-slate-100" id="reg-password" name="password" required type="password" minlength="6"/>
                            </div>
                        </div>
                        <div>
                            <button class="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary" type="submit">註冊</button>
                        </div>
                        <div id="register-error" class="hidden text-sm text-red-600 dark:text-red-400 text-center"></div>
                    </form>
                </div>
            </div>
        </main>
    </div>
<?php else: ?>
    <!-- Task Manager Dashboard -->
    <div id="app-screen" class="flex flex-col min-h-screen">
        <!-- Header will be injected by JavaScript -->
        <div id="app-header"></div>

        <!-- Main Content -->
        <main id="app-main" class="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Content will be injected by JavaScript -->
        </main>
    </div>

    <!-- Task Modal (for create/edit) -->
    <div id="task-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div class="bg-white dark:bg-slate-900 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 id="modal-title" class="text-xl font-bold text-gray-900 dark:text-white mb-4">建立任務</h3>
            <form id="task-form" class="space-y-4">
                <input type="hidden" id="task-id" name="id"/>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">標題</label>
                    <input type="text" id="task-title" required class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100"/>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">描述</label>
                    <textarea id="task-description" rows="3" class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100"></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">指派給</label>
                    <select id="task-assignee" class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100">
                        <option value="">未指派</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">優先級</label>
                        <select id="task-priority" class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100">
                            <option value="low">低</option>
                            <option value="medium" selected>中</option>
                            <option value="high">高</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">狀態</label>
                        <select id="task-status" class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100">
                            <option value="pending">待處理</option>
                            <option value="in_progress">進行中</option>
                            <option value="completed">已完成</option>
                            <option value="cancelled">已取消</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">截止日期</label>
                    <input type="date" id="task-due-date" class="mt-1 block w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:border-primary focus:ring-primary text-gray-900 dark:text-gray-100"/>
                </div>
                <div class="flex gap-3 mt-6">
                    <button type="button" onclick="closeTaskModal()" class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">取消</button>
                    <button type="submit" class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">儲存</button>
                </div>
            </form>
        </div>
    </div>
<?php endif; ?>

<script src="/public/js/app.js"></script>
</body>
</html>
