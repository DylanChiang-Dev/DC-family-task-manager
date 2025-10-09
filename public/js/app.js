// 家庭任務管理系統 - 主應用程序

let currentUser = null;
let allTasks = [];
let allUsers = [];
let allTeams = [];
let currentTeam = null;
let selectedDate = new Date();
let currentMonth = new Date();
let currentFilter = 'all';
let currentPriority = 'all'; // 優先級篩選 ('all', 'low', 'medium', 'high')
let currentCategory = 'all'; // 類別篩選 ('all', 或類別ID)
let currentSortBy = 'due_date'; // 排序方式 ('due_date', 'priority', 'created_at', 'updated_at')
let currentSortOrder = 'asc'; // 排序順序 ('asc', 'desc')
let isTeamDropdownOpen = false;
let allCategories = []; // 所有類別列表

// ============================================
// 暗色模式管理
// ============================================

/**
 * 初始化暗色模式
 * 優先級: localStorage > 系統偏好 > 默認淺色
 */

/**
 * 主題模式枚舉
 */
const THEME_MODES = {
    LIGHT: 'light',
    DARK: 'dark'
};

/**
 * 初始化主題系統
 */
function initThemeSystem() {
    // 自动检测系统主题偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = prefersDark ? THEME_MODES.DARK : THEME_MODES.LIGHT;

    const savedTheme = localStorage.getItem('theme') || defaultTheme;
    applyTheme(savedTheme);
    updateThemeIcon(savedTheme);
}

/**
 * 應用主題
 */
function applyTheme(theme) {
    localStorage.setItem('theme', theme);

    // 清除所有主題類
    document.documentElement.classList.remove('light', 'dark');

    switch (theme) {
        case THEME_MODES.LIGHT:
            document.documentElement.classList.add('light');
            break;
        case THEME_MODES.DARK:
            document.documentElement.classList.add('dark');
            break;
        case THEME_MODES.SYSTEM:
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            // 系統模式下不添加任何類，讓CSS處理
            break;
    }
}

/**
 * 更新主題圖標
 */
function updateThemeIcon(theme) {
    const lightIcon = document.getElementById('theme-icon-light');
    const darkIcon = document.getElementById('theme-icon-dark');

    // 隱藏所有圖標
    if (lightIcon) lightIcon.classList.add('hidden');
    if (darkIcon) darkIcon.classList.add('hidden');

    // 顯示當前主題圖標
    switch (theme) {
        case THEME_MODES.LIGHT:
            if (lightIcon) lightIcon.classList.remove('hidden');
            break;
        case THEME_MODES.DARK:
            if (darkIcon) darkIcon.classList.remove('hidden');
            break;
    }
}

/**
 * 切換主題模式（輪循：light -> dark -> light）
 */
function toggleThemeMode() {
    const currentTheme = localStorage.getItem('theme') || THEME_MODES.LIGHT;
    const nextTheme = currentTheme === THEME_MODES.LIGHT ? THEME_MODES.DARK : THEME_MODES.LIGHT;

    applyTheme(nextTheme);
    updateThemeIcon(nextTheme);
}

/**
 * 監聽系統主題變化 - 當用戶沒有手動設置時，自動跟隨系統
 */
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // 只有當用戶沒有手動設置主題偏好時，才跟隨系統
    if (!localStorage.getItem('theme')) {
        if (e.matches) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
});

// ============================================
// 農曆轉換
// ============================================

// 使用本地農曆轉換庫進行農曆轉換
function solarToLunar(year, month, day) {
    try {
        if (typeof LunarCalendar !== 'undefined') {
            return LunarCalendar.solarToLunar(year, month, day);
        }
    } catch (e) {
        console.error('Lunar conversion error:', e);
    }
    return null;
}

// 初始化應用
document.addEventListener('DOMContentLoaded', () => {
    initThemeSystem(); // 初始化主題系統
    checkLoginStatus();
    setupEventListeners();
});

// 為日曆視圖生成週期任務實例
function generateRecurringTaskInstances(tasks, startDate, endDate) {
    const instances = [];

    tasks.forEach(task => {
        if (task.task_type === 'recurring' && task.recurrence_config) {
            const config = typeof task.recurrence_config === 'string'
                ? JSON.parse(task.recurrence_config)
                : task.recurrence_config;

            const start = new Date(startDate);
            const end = new Date(endDate);

            // Generate instances based on frequency
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                if (shouldShowRecurringTask(d, config)) {
                    // Create a virtual task instance for this date
                    instances.push({
                        ...task,
                        due_date: d.toISOString().split('T')[0],
                        isRecurringInstance: true
                    });
                }
            }
        } else {
            // Regular tasks or repeatable tasks - add as-is
            instances.push(task);
        }
    });

    return instances;
}

// 檢查週期任務是否應在特定日期顯示
function shouldShowRecurringTask(date, config) {
    const { frequency } = config;

    if (frequency === 'daily') {
        return true;
    } else if (frequency === 'weekly' && config.days) {
        return config.days.includes(date.getDay());
    } else if (frequency === 'monthly' && config.dates) {
        return config.dates.includes(date.getDate());
    } else if (frequency === 'yearly' && config.month && config.date) {
        return date.getMonth() + 1 === config.month && date.getDate() === config.date;
    }

    return false;
}

// 檢查用戶是否已登錄
async function checkLoginStatus() {
    try {
        const response = await fetch('/api/auth.php?action=check');
        const data = await response.json();

        if (data.logged_in) {
            currentUser = data.user;
            if (document.getElementById('app-screen')) {
                initializeApp();
            }
        }
    } catch (error) {
        console.error('檢查登錄狀態時發生錯誤:', error);
    }
}

// 設置事件監聽器
function setupEventListeners() {
    // 登錄表單
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 註冊表單
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 任務表單
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }

    // 設置表單
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSubmit);
    }

}

// 根據註冊模式切換團隊設置字段
function toggleTeamFields() {
    const registerMode = document.querySelector('input[name="register_mode"]:checked').value;
    const createFields = document.getElementById('create-team-fields');
    const joinFields = document.getElementById('join-team-fields');
    const teamNameInput = document.getElementById('team-name');
    const inviteCodeInput = document.getElementById('invite-code');

    if (registerMode === 'create') {
        createFields.classList.remove('hidden');
        joinFields.classList.add('hidden');
        teamNameInput.required = true;
        inviteCodeInput.required = false;
    } else {
        createFields.classList.add('hidden');
        joinFields.classList.remove('hidden');
        teamNameInput.required = false;
        inviteCodeInput.required = true;
    }
}

// 切換自定義郵箱域名輸入框
function toggleCustomDomain() {
    const emailDomain = document.getElementById('email-domain').value;
    const customDomainInput = document.getElementById('custom-domain');

    if (emailDomain === 'custom') {
        customDomainInput.classList.remove('hidden');
        customDomainInput.required = true;
    } else {
        customDomainInput.classList.add('hidden');
        customDomainInput.required = false;
        customDomainInput.value = '';
    }
}

// 在登錄和註冊標籤之間切換
function switchTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tab === 'login') {
        loginTab.className = 'tab-active border-primary text-primary whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm';
        registerTab.className = 'tab-inactive border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm';
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
    } else {
        loginTab.className = 'tab-inactive border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm';
        registerTab.className = 'tab-active border-primary text-primary whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm';
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    }
}

// 處理登錄
async function handleLogin(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const errorDiv = document.getElementById('login-error');

    try {
        const response = await fetch('/api/auth.php?action=login', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            window.location.reload();
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = '登入失敗。請重試。';
        errorDiv.classList.remove('hidden');
    }
}

// 處理註冊
async function handleRegister(e) {
    e.preventDefault();

    const errorDiv = document.getElementById('register-error');

    // 獲取郵箱組件
    const emailUsername = document.getElementById('email-username').value.trim();
    const emailDomainSelect = document.getElementById('email-domain').value;
    const customDomain = document.getElementById('custom-domain').value.trim();

    // 拼接完整郵箱地址
    let emailDomain = emailDomainSelect;
    if (emailDomainSelect === 'custom') {
        if (!customDomain) {
            errorDiv.textContent = '請輸入自定義郵箱域名';
            errorDiv.classList.remove('hidden');
            return;
        }
        emailDomain = customDomain;
    }

    const fullEmail = emailUsername + '@' + emailDomain;

    // 驗證郵箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fullEmail)) {
        errorDiv.textContent = '郵箱格式不正確';
        errorDiv.classList.remove('hidden');
        return;
    }

    // 獲取其他表單數據
    const nickname = document.getElementById('reg-nickname').value.trim();
    const password = document.getElementById('reg-password').value;
    const passwordConfirm = document.getElementById('reg-password-confirm').value;

    // 驗證密碼確認
    if (password !== passwordConfirm) {
        errorDiv.textContent = '兩次輸入的密碼不一致';
        errorDiv.classList.remove('hidden');
        return;
    }

    const formData = new FormData(e.target);
    const registerMode = formData.get('register_mode');
    const inviteCode = formData.get('invite_code');

    // 僅驗證加入團隊時的邀請碼
    if (registerMode === 'join') {
        if (!inviteCode || inviteCode.trim() === '') {
            errorDiv.textContent = '請輸入邀請碼';
            errorDiv.classList.remove('hidden');
            return;
        }
        if (inviteCode.length !== 6) {
            errorDiv.textContent = '邀請碼必須是6位字符';
            errorDiv.classList.remove('hidden');
            return;
        }
    }

    try {
        // 創建新的 FormData，使用完整郵箱地址作為 username
        const submitData = new FormData();
        submitData.append('username', fullEmail);
        submitData.append('nickname', nickname);
        submitData.append('password', password);

        // 如果有邀請碼就加入團隊，否則創建新團隊
        if (inviteCode && inviteCode.trim()) {
            submitData.append('invite_code', inviteCode.trim());
        }

        // team_name為可選，為空時後端會使用默認名稱
        const teamName = formData.get('team_name');
        if (teamName && teamName.trim()) {
            submitData.append('team_name', teamName.trim());
        }

        const response = await fetch('/api/auth.php?action=register', {
            method: 'POST',
            body: submitData
        });

        const data = await response.json();

        if (data.success) {
            alert('註冊成功！請登入。');
            switchTab('login');
            e.target.reset();
            errorDiv.classList.add('hidden');
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = '註冊失敗。請重試。';
        errorDiv.classList.remove('hidden');
    }
}

// Initialize main app
async function initializeApp() {
    await loadTeams();
    renderHeader();
    renderMainLayout();
    await loadUsers();
    await loadCategories(); // 加載類別列表
    await loadTasks();
}

// Render main layout with calendar and task list
function renderMainLayout() {
    const main = document.getElementById('app-main');
    main.className = 'flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8';
    main.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <!-- Left: Calendar (2/3 width) - 手機版隱藏 -->
            <div class="hidden lg:block lg:col-span-2 space-y-6">
                <!-- 今日任務 -->
                <div class="bg-white dark:bg-slate-900/50 rounded-lg shadow-sm p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                            </svg>
                            今日任務
                        </h2>
                        <span id="today-task-count" class="text-sm text-gray-500 dark:text-gray-400">0 項任務</span>
                    </div>
                    <div id="today-tasks-list" class="space-y-2"></div>
                </div>

                <!-- 日曆 -->
                <div class="bg-white dark:bg-slate-900/50 rounded-lg shadow-sm p-6">
                    <div id="calendar-container"></div>
                </div>
            </div>

            <!-- Right: Task List (1/3 width) - 手機版全寬顯示 -->
            <div class="lg:col-span-1">
                <div class="bg-white dark:bg-slate-900/50 rounded-lg shadow-sm p-6 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
                    <!-- 手機版：今日任務標題 -->
                    <div class="lg:hidden flex items-center justify-between mb-6">
                        <div class="flex items-center gap-2">
                            <svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                            </svg>
                            <h2 class="text-xl font-bold text-gray-900 dark:text-white">今日任務</h2>
                        </div>
                        <span id="today-task-count-mobile" class="text-sm text-gray-500 dark:text-gray-400">0 項任務</span>
                    </div>

                    <!-- 桌面版：任務列表標題 -->
                    <div class="hidden lg:flex items-center justify-between mb-6">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">任務列表</h2>
                        <button onclick="openTaskModal()" class="inline-flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- 手機版：新建任務按鈕 -->
                    <div class="lg:hidden mb-4">
                        <button onclick="openTaskModal()" class="w-full inline-flex items-center justify-center px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">
                            <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            新建任務
                        </button>
                    </div>

                    <!-- 手機版：今日任務列表 -->
                    <div class="lg:hidden mb-6">
                        <div id="today-tasks-list-mobile" class="space-y-2"></div>
                        <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                            <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">所有任務</h3>
                        </div>
                    </div>

                    <!-- Filter buttons -->
                    <div class="flex flex-col gap-2 mb-4">
                        <button onclick="filterTasks('all')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-center" data-filter="all">全部</button>
                        <button onclick="filterTasks('pending')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center" data-filter="pending">待處理</button>
                        <button onclick="filterTasks('in_progress')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center" data-filter="in_progress">進行中</button>
                        <button onclick="filterTasks('completed')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center" data-filter="completed">已完成</button>
                    </div>

                    <!-- 優先級篩選器 -->
                    <div class="mb-4">
                        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">優先級</h3>
                        <div class="flex flex-col gap-2">
                            <button onclick="filterByPriority('all')" class="priority-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-left" data-priority="all">
                                <span class="inline-flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-gray-300"></span>
                                    全部
                                </span>
                            </button>
                            <button onclick="filterByPriority('high')" class="priority-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-priority="high">
                                <span class="inline-flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                    高優先級
                                </span>
                            </button>
                            <button onclick="filterByPriority('medium')" class="priority-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-priority="medium">
                                <span class="inline-flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                                    中優先級
                                </span>
                            </button>
                            <button onclick="filterByPriority('low')" class="priority-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-priority="low">
                                <span class="inline-flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                    低優先級
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- 類別導航欄 -->
                    <div class="mb-4">
                        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">類別</h3>
                        <div id="category-filter-list" class="flex flex-col gap-2">
                            <!-- 類別篩選器將通過 JavaScript 動態生成 -->
                        </div>
                    </div>

                    <!-- 排序選項 -->
                    <div class="mb-4">
                        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">排序</h3>
                        <div class="flex flex-col gap-2">
                            <button onclick="sortTasks('due_date')" class="sort-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-left" data-sort="due_date">
                                截止日期
                            </button>
                            <button onclick="sortTasks('priority')" class="sort-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-sort="priority">
                                優先級
                            </button>
                            <button onclick="sortTasks('created_at')" class="sort-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-sort="created_at">
                                創建時間
                            </button>
                            <button onclick="sortTasks('updated_at')" class="sort-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-sort="updated_at">
                                修改時間
                            </button>
                        </div>
                    </div>

                    <!-- Task list -->
                    <div id="task-list" class="space-y-3"></div>
                </div>
            </div>
        </div>
    `;

    renderCalendar();
    renderTodayTasks();
    renderCategoryFilters(); // 渲染類別篩選器
}

// Render today's tasks
function renderTodayTasks() {
    const container = document.getElementById('today-tasks-list');
    const containerMobile = document.getElementById('today-tasks-list-mobile');
    const countElement = document.getElementById('today-task-count');
    const countElementMobile = document.getElementById('today-task-count-mobile');

    if (!container && !containerMobile) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Filter tasks due today (including recurring tasks)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const tasksWithInstances = generateRecurringTaskInstances(allTasks, monthStart, monthEnd);

    const todayTasks = tasksWithInstances.filter(task =>
        task.due_date === todayStr && task.status !== 'cancelled'
    );

    // Update count for both desktop and mobile
    if (countElement) {
        countElement.textContent = `${todayTasks.length} 項任務`;
    }
    if (countElementMobile) {
        countElementMobile.textContent = `${todayTasks.length} 項任務`;
    }

    // Create task HTML for mobile (compact)
    const createMobileTaskHTML = (task) => {
        const assignee = allUsers.find(u => u.id == task.assignee_id);
        const priorityDotColor = task.priority === 'high' ? 'bg-red-500' :
                                task.priority === 'medium' ? 'bg-blue-500' : 'bg-green-500';

        return `
            <div class="group border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all cursor-pointer bg-white dark:bg-slate-800/50" onclick="editTask(${task.id})">
                <div class="flex items-start justify-between mb-1">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                        <div class="w-2 h-2 rounded-full ${priorityDotColor} flex-shrink-0"></div>
                        <h4 class="font-medium text-sm text-gray-900 dark:text-white line-clamp-1">${task.title}</h4>
                    </div>
                    <button onclick="event.stopPropagation(); deleteTask(${task.id})" class="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                        <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
                ${assignee ? `<div class="text-xs text-gray-500 dark:text-gray-400">${assignee.nickname}</div>` : ''}
            </div>
        `;
    };

    // Create task HTML for desktop (detailed)
    const createDesktopTaskHTML = (task) => {
        const assignee = allUsers.find(u => u.id == task.assignee_id);
        const priorityColors = {
            low: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
            medium: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            high: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
        };
        const statusColors = {
            pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
            in_progress: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            completed: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
        };
        const priorityText = {low: '低', medium: '中', high: '高'};
        const statusText = {pending: '待處理', in_progress: '進行中', completed: '已完成'};

        return `
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer" onclick="editTask(${task.id})">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-2 h-2 rounded-full ${priorityColors[task.priority].split(' ')[0]}"></div>
                    <div class="flex-1 min-w-0">
                        <h4 class="font-medium text-sm text-gray-900 dark:text-white truncate">${task.title}</h4>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}">
                                ${priorityText[task.priority]}
                            </span>
                            ${task.status !== 'pending' ? `
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[task.status]}">
                                    ${statusText[task.status]}
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                    ${assignee ? `<span class="text-xs text-gray-500 dark:text-gray-400">${assignee.nickname}</span>` : ''}
                    <button onclick="event.stopPropagation(); deleteTask(${task.id})" class="p-1 text-gray-400 hover:text-red-500 transition-colors">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    };

    // Render tasks in both containers
    const emptyStateHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-sm">今天沒有待辦任務</p>
        </div>
    `;

    if (todayTasks.length === 0) {
        if (container) container.innerHTML = emptyStateHTML;
        if (containerMobile) containerMobile.innerHTML = emptyStateHTML;
        return;
    }

    // Render in desktop container (detailed view)
    if (container) {
        container.innerHTML = todayTasks.map(createDesktopTaskHTML).join('');
    }

    // Render in mobile container (compact view)
    if (containerMobile) {
        containerMobile.innerHTML = todayTasks.map(createMobileTaskHTML).join('');
    }
}

// Render calendar
function renderCalendar() {
    const container = document.getElementById('calendar-container');
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    // Generate recurring task instances for current month
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const tasksWithInstances = generateRecurringTaskInstances(allTasks, monthStart, monthEnd);

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    let html = `
        <div class="calendar">
            <!-- Calendar Header -->
            <div class="flex items-center justify-between mb-6 bg-gradient-to-r from-primary/10 to-blue-500/10 dark:from-primary/20 dark:to-blue-500/20 p-4 rounded-xl">
                <button onclick="previousMonth()" class="p-2.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-all hover:scale-110">
                    <svg class="h-6 w-6 text-primary dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white tracking-wide">${year}年 ${monthNames[month]}</h3>
                <button onclick="nextMonth()" class="p-2.5 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-all hover:scale-110">
                    <svg class="h-6 w-6 text-primary dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>

            <!-- Week days -->
            <div class="grid grid-cols-7 gap-2 mb-3">
                ${weekDays.map(day => `<div class="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">${day}</div>`).join('')}
            </div>

            <!-- Calendar days -->
            <div class="grid grid-cols-7 gap-2">
    `;

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
        html += '<div class="aspect-square min-h-32"></div>';
    }

    // Days in month
    const today = new Date();
    const isToday = (day) => {
        return today.getDate() === day &&
               today.getMonth() === month &&
               today.getFullYear() === year;
    };

    const isSelected = (day) => {
        return selectedDate.getDate() === day &&
               selectedDate.getMonth() === month &&
               selectedDate.getFullYear() === year;
    };

    for (let day = 1; day <= daysInMonth; day++) {
        const todayClass = isToday(day) ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 shadow-lg' : '';
        const isSelectedDay = isSelected(day);
        const selectedClass = isSelectedDay ? 'bg-primary/10 dark:bg-primary/20 border-primary dark:border-primary shadow-md scale-[1.02]' : 'bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-md';

        // Get tasks for this day (including recurring instances)
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = tasksWithInstances.filter(task => task.due_date === dateStr);

        // Get lunar date
        const lunar = solarToLunar(year, month + 1, day);
        // Show month name on the first day of lunar month, otherwise just show day
        const lunarText = lunar ? (lunar.day === '初一' ? lunar.month : lunar.day) : '';

        // Build task list HTML with colored dots
        let tasksHtml = '';
        if (dayTasks.length > 0) {
            const visibleTasks = dayTasks.slice(0, 4);
            tasksHtml = '<div class="w-full space-y-1 mt-2">';
            tasksHtml += visibleTasks.map(task => {
                const priorityColor = task.priority === 'high' ? 'bg-red-500' :
                                     task.priority === 'medium' ? 'bg-blue-500' : 'bg-green-500';
                return `<div class="flex items-center gap-1.5 w-full">
                    <div class="w-1.5 h-1.5 rounded-full ${priorityColor} flex-shrink-0 shadow-sm"></div>
                    <span class="text-xs truncate text-gray-700 dark:text-gray-300" title="${task.title}">${task.title}</span>
                </div>`;
            }).join('');
            tasksHtml += '</div>';

            if (dayTasks.length > 4) {
                tasksHtml += `<div class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">+${dayTasks.length - 4} 更多</div>`;
            }
        }

        const dateNumColor = isSelectedDay ? 'text-primary dark:text-blue-400 font-extrabold' : isToday(day) ? 'text-primary dark:text-blue-400' : 'text-gray-900 dark:text-gray-100';
        const lunarColor = isSelectedDay ? 'text-primary/70 dark:text-blue-400/70' : 'text-gray-500 dark:text-gray-400';

        html += `
            <button onclick="selectDate(${year}, ${month}, ${day})"
                    class="relative min-h-32 p-3 flex flex-col items-start rounded-xl text-sm transition-all duration-200 border ${selectedClass} ${todayClass}">
                <div class="flex items-baseline gap-2 w-full">
                    <span class="font-bold text-base ${dateNumColor}">${day}</span>
                    ${lunarText ? `<span class="text-xs ${lunarColor} font-medium">${lunarText}</span>` : ''}
                </div>
                ${tasksHtml}
            </button>
        `;
    }

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Calendar navigation
function previousMonth() {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    renderCalendar();
}

function nextMonth() {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    renderCalendar();
}

function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    renderCalendar();
    showSelectedDateTasks();
}

// Show tasks for selected date in right panel
function showSelectedDateTasks() {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const selectedTasks = allTasks.filter(task => {
        return task.due_date === dateStr;
    });

    const taskList = document.getElementById('task-list');
    const selectedDatePanel = document.getElementById('selected-date-tasks');

    // Show selected date info
    const selectedDateElement = document.getElementById('selected-date-info');
    if (selectedDateElement) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = selectedDate.toLocaleDateString('zh-TW', options);
        selectedDateElement.textContent = `${formattedDate} 的任務`;
    }

    // Update task list title
    const taskListTitle = document.getElementById('task-list-title');
    if (taskListTitle) {
        taskListTitle.textContent = '當天任務';
    }

    // Show selected date tasks in task panel
    if (selectedTasks.length > 0) {
        taskList.innerHTML = selectedTasks.map(task => renderTaskCard(task)).join('');
    } else {
        taskList.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 011 18 0z"></path>
                </svg>
                <p class="text-sm">這一天沒有任務</p>
                <button onclick="quickCreateTaskForDate('${dateStr}')" class="mt-4 inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                    <svg class="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                    快速創建任務
                </button>
            </div>
        `;
    }

    // Scroll task list to top
    if (taskList) {
        taskList.scrollTop = 0;
    }
}

// Filter tasks by selected date
function filterTasksByDate() {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const filtered = allTasks.filter(task => {
        if (!task.due_date) return false;
        return task.due_date === dateStr;
    });

    renderTasks(filtered.length > 0 ? filtered : allTasks);
}

// 渲染頁首
function renderHeader() {
    const header = document.getElementById('app-header');

    // 構建團隊切換器下拉菜單
    const teamDropdown = allTeams.length > 0 ? `
        <div class="relative">
            <button onclick="toggleTeamDropdown(event)" id="team-dropdown-btn" class="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors min-w-0">
                <svg class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                <span class="hidden sm:inline truncate max-w-24 lg:max-w-32">${currentTeam?.name || '未選擇團隊'}</span>
                <span class="sm:hidden truncate max-w-16">${currentTeam?.name || '未選擇'}</span>
                <svg class="h-4 w-4 transition-transform flex-shrink-0" id="team-dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            <div id="team-dropdown-menu" class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 hidden">
                ${allTeams.map(team => `
                    <button
                        onclick="switchCurrentTeam(${team.id})"
                        class="block w-full text-left px-4 py-2 text-sm ${team.id == currentUser.current_team_id ? 'text-primary font-semibold' : 'text-gray-700 dark:text-gray-300'} hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        ${team.name}
                        ${team.id == currentUser.current_team_id ? '<span class="float-right">✓</span>' : ''}
                    </button>
                `).join('')}
            </div>
        </div>
    ` : '';

    header.innerHTML = `
        <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex items-center gap-2 sm:gap-4">
                        <!-- 桌面版：完整logo和标题 -->
                        <div class="hidden sm:flex items-center gap-3">
                            <svg class="h-8 w-8 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.263 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z" fill="currentColor"></path>
                                <path clip-rule="evenodd" d="M10.4485 13.8519C10.4749 13.9271 10.6203 14.246 11.379 14.7361C12.298 15.3298 13.7492 15.9145 15.6717 16.3735C18.0007 16.9296 20.8712 17.2655 24 17.2655C27.1288 17.2655 29.9993 16.9296 32.3283 16.3735C34.2508 15.9145 35.702 15.3298 36.621 14.7361C37.3796 14.246 37.5251 13.9271 37.5515 13.8519C37.5287 13.7876 37.4333 13.5973 37.0635 13.2931C36.5266 12.8516 35.6288 12.3647 34.343 11.9175C31.79 11.0295 28.1333 10.4437 24 10.4437C19.8667 10.4437 16.2099 11.0295 13.657 11.9175C12.3712 12.3647 11.4734 12.8516 10.9365 13.2931C10.5667 13.5973 10.4713 13.7876 10.4485 13.8519ZM37.5563 18.7877C36.3176 19.3925 34.8502 19.8839 33.2571 20.2642C30.5836 20.9025 27.3973 21.2655 24 21.2655C20.6027 21.2655 17.4164 20.9025 14.7429 20.2642C13.1498 19.8839 11.6824 19.3925 10.4436 18.7877V34.1275C10.4515 34.1545 10.5427 34.4867 11.379 35.027C12.298 35.6207 13.7492 36.2054 15.6717 36.6644C18.0007 37.2205 20.8712 37.5564 24 37.5564C27.1288 37.5564 29.9993 37.2205 32.3283 36.6644C34.2508 36.2054 35.702 35.6207 36.621 35.027C37.4573 34.4867 37.5485 34.1546 37.5563 34.1275V18.7877ZM41.5563 13.8546V34.1455C41.5563 36.1078 40.158 37.5042 38.7915 38.3869C37.3498 39.3182 35.4192 40.0389 33.2571 40.5551C30.5836 41.1934 27.3973 41.5564 24 41.5564C20.6027 41.5564 17.4164 41.1934 14.7429 40.5551C12.5808 40.0389 10.6502 39.3182 9.20848 38.3869C7.84205 37.5042 6.44365 36.1078 6.44365 34.1455L6.44365 13.8546C6.44365 12.2684 7.37223 11.0454 8.39581 10.2036C9.43325 9.3505 10.8137 8.67141 12.343 8.13948C15.4203 7.06909 19.5418 6.44366 24 6.44366C28.4582 6.44366 32.5797 7.06909 35.657 8.13948C37.1863 8.67141 38.5667 9.3505 39.6042 10.2036C40.6278 11.0454 41.5563 12.2684 41.5563 13.8546Z" fill="currentColor" fill-rule="evenodd"></path>
                            </svg>
                            <h1 class="text-xl font-bold text-gray-900 dark:text-white">任務管理系統</h1>
                        </div>
                        <!-- 移动版：简化标题 -->
                        <div class="flex sm:hidden items-center gap-2">
                            <svg class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19.5 17V7C19.5 7.8 18.5 8.5 16.5 9C15 9.5 13.5 9.5 12 9.5C10.5 9.5 9 9.5 7.5 9C5.5 8.5 4.5 7.8 4.5 7V17C4.5 17.8 5.5 18.5 7.5 19C9 19.5 10.5 19.5 12 19.5C13.5 19.5 15 19.5 16.5 19C18.5 18.5 19.5 17.8 19.5 17Z" fill="currentColor"></path>
                                <path d="M7.5 9C9 9.5 10.5 9.5 12 9.5C13.5 9.5 15 9.5 16.5 9C18.5 8.5 19.5 7.8 19.5 7C19.5 6.2 18.5 5.5 16.5 5C15 4.5 13.5 4.5 12 4.5C10.5 4.5 9 4.5 7.5 5C5.5 5.5 4.5 6.2 4.5 7C4.5 7.8 5.5 8.5 7.5 9Z" fill="currentColor"></path>
                            </svg>
                            <h1 class="text-base font-bold text-gray-900 dark:text-white">任務</h1>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 sm:gap-4">
                        ${teamDropdown}
                        <button
                            onclick="toggleThemeMode()"
                            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors flex-shrink-0"
                            title="切換主題模式"
                            aria-label="切換主題模式"
                        >
                            <!-- 白天模式圖標 -->
                            <svg id="theme-icon-light" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"></path>
                            </svg>
                            <!-- 暗色模式圖標 -->
                            <svg id="theme-icon-dark" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                            </svg>
                            </button>
                        <span class="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 truncate max-w-20">您好，${currentUser.nickname}</span>
                        <button onclick="showSettings()" class="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 hover:text-primary">設置</button>
                        <button onclick="handleLogout()" class="hidden sm:inline text-sm text-gray-600 dark:text-gray-300 hover:text-primary">登出</button>
                        <div class="sm:hidden flex items-center gap-1">
                            <button onclick="showSettings()" class="p-1.5 text-gray-600 dark:text-gray-300 hover:text-primary" title="設置">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572z"></path>
                                </svg>
                            </button>
                            <button onclick="handleLogout()" class="p-1.5 text-gray-600 dark:text-gray-300 hover:text-primary" title="登出">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4 4m4-4H3m14 4v-12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    `;

    // 确保主题图标正确显示
    setTimeout(() => {
        // 自动检测系统主题偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const defaultTheme = prefersDark ? THEME_MODES.DARK : THEME_MODES.LIGHT;

        const currentTheme = localStorage.getItem('theme') || defaultTheme;
        updateThemeIcon(currentTheme);
    }, 50);
}

// 載入團隊列表
async function loadTeams() {
    try {
        const response = await fetch('/api/teams.php');
        const data = await response.json();

        if (data.success) {
            allTeams = data.teams;
            // 查找當前團隊
            if (currentUser?.current_team_id) {
                currentTeam = allTeams.find(t => t.id == currentUser.current_team_id);
            }
        }
    } catch (error) {
        console.error('載入團隊時發生錯誤:', error);
    }
}

// 切換當前團隊
async function switchCurrentTeam(teamId) {
    try {
        const formData = new URLSearchParams();
        formData.append('team_id', teamId);

        const response = await fetch('/api/teams.php?action=switch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            // 更新當前用戶和團隊
            currentUser.current_team_id = teamId;
            currentTeam = allTeams.find(t => t.id == teamId);

            // 刷新介面
            isTeamDropdownOpen = false;
            renderHeader();
            await loadUsers();
            await loadTasks();
        } else {
            alert(data.message || '切換團隊失敗');
        }
    } catch (error) {
        console.error('切換團隊時發生錯誤:', error);
        alert('切換團隊時發生錯誤');
    }
}

// 切換團隊下拉菜單
function toggleTeamDropdown(event) {
    event.stopPropagation();
    isTeamDropdownOpen = !isTeamDropdownOpen;

    const menu = document.getElementById('team-dropdown-menu');
    const arrow = document.getElementById('team-dropdown-arrow');

    if (isTeamDropdownOpen) {
        menu.classList.remove('hidden');
        arrow.style.transform = 'rotate(180deg)';
    } else {
        menu.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }
}

// 點擊外部關閉團隊下拉菜單
document.addEventListener('click', function(event) {
    if (isTeamDropdownOpen) {
        const menu = document.getElementById('team-dropdown-menu');
        const btn = document.getElementById('team-dropdown-btn');

        if (menu && btn && !menu.contains(event.target) && !btn.contains(event.target)) {
            isTeamDropdownOpen = false;
            menu.classList.add('hidden');
            const arrow = document.getElementById('team-dropdown-arrow');
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    }
});

// Load users for dropdown
async function loadUsers() {
    try {
        const response = await fetch('/api/users.php');
        const data = await response.json();

        if (data.success) {
            allUsers = data.users;
            populateUserDropdown();
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Populate user dropdown in task modal
function populateUserDropdown() {
    const select = document.getElementById('task-assignee');
    select.innerHTML = '<option value="">未指派</option>';

    allUsers.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.nickname;
        select.appendChild(option);
    });
}

// Populate category dropdown in task modal
function populateCategoryDropdown() {
    const select = document.getElementById('task-category');
    if (!select) return;

    select.innerHTML = '<option value="">無類別</option>';

    if (allCategories && allCategories.length > 0) {
        allCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            option.style.color = category.color || '#3B82F6';
            select.appendChild(option);
        });
    }
}

// Load tasks
// Load categories from API
async function loadCategories() {
    try {
        const response = await fetch('/api/categories.php');
        const data = await response.json();

        if (data.success) {
            allCategories = data.categories || [];
            renderCategoryFilters();
            populateCategoryDropdown(); // 填充類別下拉選單
        }
    } catch (error) {
        console.error('Error loading categories:', error);
        allCategories = [];
    }
}

// Render category filters in the sidebar
function renderCategoryFilters() {
    const container = document.getElementById('category-filter-list');
    if (!container) return;

    // Start with "全部" button
    let html = `
        <button onclick="filterByCategory('all')" class="category-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} text-left" data-category="all">
            <span class="inline-flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-gray-400"></span>
                全部任務
            </span>
        </button>
    `;

    // Add category buttons
    if (allCategories && allCategories.length > 0) {
        allCategories.forEach(category => {
            const isActive = currentCategory == category.id;
            html += `
                <button onclick="filterByCategory('${category.id}')" class="category-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'} text-left" data-category="${category.id}">
                    <span class="inline-flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full" style="background-color: ${category.color || '#3B82F6'}"></span>
                        ${category.name}
                    </span>
                </button>
            `;
        });
    } else {
        html += `
            <p class="text-xs text-gray-500 dark:text-gray-400 italic px-3">
                尚未創建任何類別
            </p>
        `;
    }

    container.innerHTML = html;
}

async function loadTasks(status = 'all') {
    currentFilter = status;
    const url = status === 'all' ? '/api/tasks.php' : `/api/tasks.php?status=${status}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            allTasks = data.tasks;
            applyFiltersAndSort(); // 使用新的篩選和排序函數
            // Re-render calendar and today's tasks
            renderCalendar();
            renderTodayTasks();
        }
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

// Filter tasks by status
function filterTasks(status) {
    currentFilter = status;

    // Update filter button styles
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === status) {
            btn.className = 'filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-center';
        } else {
            btn.className = 'filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center';
        }
    });

    // Apply all filters and sorting
    applyFiltersAndSort();
}

// Filter tasks by priority
function filterByPriority(priority) {
    currentPriority = priority;

    // Update priority button styles
    document.querySelectorAll('.priority-btn').forEach(btn => {
        if (btn.dataset.priority === priority) {
            btn.className = 'priority-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-left';
        } else {
            btn.className = 'priority-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left';
        }
    });

    // Apply all filters and sorting
    applyFiltersAndSort();
}

// Filter tasks by category
function filterByCategory(categoryId) {
    currentCategory = categoryId;

    // Update category button styles
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.category === categoryId) {
            btn.className = 'category-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-left';
        } else {
            btn.className = 'category-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left';
        }
    });

    // Apply all filters and sorting
    applyFiltersAndSort();
}

// Sort tasks
function sortTasks(sortBy) {
    // Toggle sort order if clicking the same sort button
    if (currentSortBy === sortBy) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortBy = sortBy;
        currentSortOrder = 'asc';
    }

    // Update sort button styles
    document.querySelectorAll('.sort-btn').forEach(btn => {
        if (btn.dataset.sort === sortBy) {
            btn.className = 'sort-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-left';
        } else {
            btn.className = 'sort-btn px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left';
        }
    });

    // Apply all filters and sorting
    applyFiltersAndSort();
}

// Apply all filters and sorting
function applyFiltersAndSort() {
    let filtered = allTasks;

    // Filter by status
    if (currentFilter !== 'all') {
        filtered = filtered.filter(task => task.status === currentFilter);
    }

    // Filter by priority
    if (currentPriority !== 'all') {
        filtered = filtered.filter(task => task.priority === currentPriority);
    }

    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(task => task.category_id == currentCategory);
    }

    // Sort tasks
    filtered = sortTaskArray(filtered, currentSortBy, currentSortOrder);

    // Render filtered and sorted tasks
    renderTasks(filtered);
}

// Sort task array by specified field
function sortTaskArray(tasks, sortBy, order = 'asc') {
    const sorted = [...tasks].sort((a, b) => {
        let compareA, compareB;

        switch (sortBy) {
            case 'priority':
                // Priority order: high > medium > low
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                compareA = priorityOrder[a.priority] || 0;
                compareB = priorityOrder[b.priority] || 0;
                break;

            case 'due_date':
                // Sort by due date (null values last)
                compareA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
                compareB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
                break;

            case 'created_at':
                compareA = new Date(a.created_at).getTime();
                compareB = new Date(b.created_at).getTime();
                break;

            case 'updated_at':
                compareA = new Date(a.updated_at).getTime();
                compareB = new Date(b.updated_at).getTime();
                break;

            default:
                return 0;
        }

        if (order === 'asc') {
            return compareA - compareB;
        } else {
            return compareB - compareA;
        }
    });

    return sorted;
}

// Render tasks - updated to work with new layout
function renderTasks(tasksToRender = null) {
    const taskList = document.getElementById('task-list');
    const tasks = tasksToRender || allTasks;

    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                沒有找到任務。建立一個開始吧！
            </div>
        `;
        return;
    }

    taskList.innerHTML = tasks.map(task => renderTaskCard(task)).join('');
}

// Render single task card
function renderTaskCard(task) {
    const statusClass = `status-${task.status}`;

    // Map status to Chinese text
    const statusMap = {
        'pending': '待處理',
        'in_progress': '進行中',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    const statusText = statusMap[task.status] || task.status;

    // Priority dot color
    const priorityDotColor = task.priority === 'high' ? 'bg-red-500' :
                             task.priority === 'medium' ? 'bg-blue-500' : 'bg-green-500';

    const assigneeName = task.assignee_name || '未指派';
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '';

    // Task type badge
    const taskTypeBadge = task.task_type === 'recurring' ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">🔄 週期</span>' :
                         task.task_type === 'repeatable' ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">📋 重複</span>' : '';

    return `
        <div class="group border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-primary hover:shadow-md transition-all cursor-pointer bg-white dark:bg-slate-800/50" onclick="editTask(${task.id})">
            <div class="flex items-start justify-between mb-2">
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    <div class="w-2.5 h-2.5 rounded-full ${priorityDotColor} flex-shrink-0 shadow-sm"></div>
                    <h3 class="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">${task.title}</h3>
                </div>
                <button onclick="event.stopPropagation(); deleteTask(${task.id})" class="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>

            ${task.description ? `<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2 ml-5">${task.description}</p>` : ''}

            <div class="flex items-center gap-1 flex-wrap mb-2 ml-5">
                <span class="px-2 py-0.5 text-xs font-medium rounded-full ${statusClass}">${statusText}</span>
                ${taskTypeBadge}
            </div>

            <div class="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400 ml-5">
                ${task.assignee_name ? `
                    <div class="flex items-center">
                        <svg class="h-3 w-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        <span class="truncate">${assigneeName}</span>
                    </div>
                ` : ''}
                ${dueDate ? `
                    <div class="flex items-center">
                        <svg class="h-3 w-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span>${dueDate}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Toggle recurrence options visibility
function toggleRecurrenceOptions() {
    const taskType = document.getElementById('task-type').value;
    const recurrenceOptions = document.getElementById('recurrence-options');

    if (taskType === 'recurring') {
        recurrenceOptions.classList.remove('hidden');
        updateRecurrenceFields();
    } else {
        recurrenceOptions.classList.add('hidden');
    }
}

// Update recurrence fields based on frequency
function updateRecurrenceFields() {
    const frequency = document.getElementById('recurrence-frequency').value;
    document.getElementById('weekly-options').classList.add('hidden');
    document.getElementById('monthly-options').classList.add('hidden');
    document.getElementById('yearly-options').classList.add('hidden');

    if (frequency === 'weekly') {
        document.getElementById('weekly-options').classList.remove('hidden');
    } else if (frequency === 'monthly') {
        document.getElementById('monthly-options').classList.remove('hidden');
    } else if (frequency === 'yearly') {
        document.getElementById('yearly-options').classList.remove('hidden');
    }
}

// Build recurrence config object from form
function buildRecurrenceConfig() {
    const taskType = document.getElementById('task-type').value;
    if (taskType !== 'recurring') {
        return null;
    }

    const frequency = document.getElementById('recurrence-frequency').value;
    const config = { frequency };

    if (frequency === 'weekly') {
        const days = Array.from(document.querySelectorAll('.recurrence-weekday:checked'))
            .map(cb => parseInt(cb.value));
        config.days = days;
    } else if (frequency === 'monthly') {
        const datesInput = document.getElementById('recurrence-monthly-dates').value;
        config.dates = datesInput.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    } else if (frequency === 'yearly') {
        config.month = parseInt(document.getElementById('recurrence-yearly-month').value);
        config.date = parseInt(document.getElementById('recurrence-yearly-date').value);
    }

    return config;
}

// Open task modal
function openTaskModal(task = null) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('task-form');

    if (task) {
        title.textContent = '編輯任務';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-assignee').value = task.assignee_id || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-due-date').value = task.due_date || '';
        document.getElementById('task-type').value = task.task_type || 'normal';
        document.getElementById('task-category').value = task.category_id || '';

        // Load recurrence config if exists
        if (task.task_type === 'recurring' && task.recurrence_config) {
            const config = typeof task.recurrence_config === 'string'
                ? JSON.parse(task.recurrence_config)
                : task.recurrence_config;

            document.getElementById('recurrence-frequency').value = config.frequency;
            toggleRecurrenceOptions();
            updateRecurrenceFields();

            if (config.frequency === 'weekly' && config.days) {
                config.days.forEach(day => {
                    const checkbox = document.querySelector(`.recurrence-weekday[value="${day}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            } else if (config.frequency === 'monthly' && config.dates) {
                document.getElementById('recurrence-monthly-dates').value = config.dates.join(',');
            } else if (config.frequency === 'yearly') {
                document.getElementById('recurrence-yearly-month').value = config.month;
                document.getElementById('recurrence-yearly-date').value = config.date;
            }
        } else {
            toggleRecurrenceOptions();
        }
    } else {
        title.textContent = '建立任務';
        form.reset();
        document.getElementById('task-id').value = '';
        document.getElementById('task-type').value = 'normal';

        // 設置默認值：指派給當前用戶，截止日期為今天
        if (currentUser && currentUser.id) {
            document.getElementById('task-assignee').value = currentUser.id;
        }

        // 設置截止日期為今天
        const today = new Date();
        const todayStr = today.getFullYear() + '-' +
                        String(today.getMonth() + 1).padStart(2, '0') + '-' +
                        String(today.getDate()).padStart(2, '0');
        document.getElementById('task-due-date').value = todayStr;

        toggleRecurrenceOptions();
    }

    modal.classList.remove('hidden');
}

// Close task modal
function closeTaskModal() {
    const modal = document.getElementById('task-modal');
    modal.classList.add('hidden');
}

// Edit task
function editTask(taskId) {
    const task = allTasks.find(t => t.id == taskId);
    if (task) {
        openTaskModal(task);
    }
}

// Handle task form submission
async function handleTaskSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('task-id').value;
    const taskData = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-description').value,
        assignee_id: document.getElementById('task-assignee').value,
        priority: document.getElementById('task-priority').value,
        status: document.getElementById('task-status').value,
        due_date: document.getElementById('task-due-date').value,
        task_type: document.getElementById('task-type').value,
        category_id: document.getElementById('task-category').value || null
    };

    // Add recurrence config if task is recurring
    const recurrenceConfig = buildRecurrenceConfig();
    if (recurrenceConfig) {
        taskData.recurrence_config = recurrenceConfig;
    }

    try {
        const url = taskId ? `/api/tasks.php?id=${taskId}` : '/api/tasks.php';
        const method = taskId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        const data = await response.json();

        if (data.success) {
            closeTaskModal();
            loadTasks(currentFilter);
        } else {
            alert('錯誤：' + data.message);
        }
    } catch (error) {
        alert('儲存任務失敗');
        console.error(error);
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('您確定要刪除此任務嗎？')) {
        return;
    }

    try {
        const response = await fetch(`/api/tasks.php?id=${taskId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            loadTasks(currentFilter);
        } else {
            alert('錯誤：' + data.message);
        }
    } catch (error) {
        alert('刪除任務失敗');
        console.error(error);
    }
}

// 處理登出
async function handleLogout() {
    try {
        await fetch('/api/auth.php?action=logout', { method: 'POST' });
        window.location.reload();
    } catch (error) {
        console.error('登出錯誤:', error);
    }
}

// 顯示設置模態框
function showSettings() {
    const modal = document.getElementById('settings-modal');

    // 重置為個人設置標籤
    switchSettingsTab('profile');

    // 填充個人設置
    document.getElementById('settings-nickname').value = currentUser.nickname;
    document.getElementById('settings-password').value = '';
    document.getElementById('settings-password-confirm').value = '';

  
    modal.classList.remove('hidden');
}

// 切換設置標籤
function switchSettingsTab(tab) {
    const profileTab = document.getElementById('profile-tab');
    const teamTab = document.getElementById('team-tab');
    const categoryTab = document.getElementById('category-tab');
    const profileSettings = document.getElementById('profile-settings');
    const teamSettings = document.getElementById('team-settings');
    const categorySettings = document.getElementById('category-settings');

    // 重置所有標籤
    [profileTab, teamTab, categoryTab].forEach(tabEl => {
        tabEl.classList.remove('text-primary', 'border-b-2', 'border-primary');
        tabEl.classList.add('text-gray-500', 'dark:text-gray-400');
    });

    // 隱藏所有設置面板
    [profileSettings, teamSettings, categorySettings].forEach(panel => {
        panel.classList.add('hidden');
    });

    // 顯示選中的標籤和面板
    if (tab === 'profile') {
        profileTab.classList.add('text-primary', 'border-b-2', 'border-primary');
        profileTab.classList.remove('text-gray-500', 'dark:text-gray-400');
        profileSettings.classList.remove('hidden');
    } else if (tab === 'team') {
        teamTab.classList.add('text-primary', 'border-b-2', 'border-primary');
        teamTab.classList.remove('text-gray-500', 'dark:text-gray-400');
        teamSettings.classList.remove('hidden');
        loadAllTeamsSettings();
    } else if (tab === 'category') {
        categoryTab.classList.add('text-primary', 'border-b-2', 'border-primary');
        categoryTab.classList.remove('text-gray-500', 'dark:text-gray-400');
        categorySettings.classList.remove('hidden');
        loadCategoriesSettings();
    }
}

// 載入所有團隊設置
async function loadAllTeamsSettings() {
    const allTeamsList = document.getElementById('all-teams-list');
    allTeamsList.innerHTML = '<div class="text-center py-4 text-gray-500 dark:text-gray-400">載入中...</div>';

    try {
        // 載入所有團隊的詳細信息
        const teamsData = await Promise.all(
            allTeams.map(async team => {
                const [teamResponse, membersResponse] = await Promise.all([
                    fetch(`/api/teams.php?id=${team.id}`),
                    fetch(`/api/teams.php?id=${team.id}&action=members`)
                ]);

                const teamData = await teamResponse.json();
                const membersData = await membersResponse.json();

                return {
                    ...teamData.team,
                    members: membersData.members || []
                };
            })
        );

        // 渲染所有團隊
        allTeamsList.innerHTML = teamsData.map(team => {
            const isAdmin = team.user_role === 'admin';
            const isCurrent = team.id == currentUser.current_team_id;

            return `
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${isCurrent ? 'ring-2 ring-primary' : ''}">
                    <!-- 團隊標題 -->
                    <div class="flex items-center justify-between mb-4">
                        <div class="flex items-center gap-2">
                            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${team.name}</h3>
                            ${isCurrent ? '<span class="px-2 py-1 text-xs font-medium bg-primary text-white rounded">當前團隊</span>' : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            ${isAdmin ? `<button onclick="toggleTeamEdit(${team.id})" class="text-sm text-primary hover:underline">編輯</button>` : ''}
                            ${isAdmin ? `<button onclick="confirmDeleteTeam(${team.id}, '${team.name}')" class="text-sm text-red-600 hover:underline dark:text-red-400">刪除</button>` : ''}
                        </div>
                    </div>

                    <!-- 團隊名稱編輯表單（默認隱藏） -->
                    <div id="team-edit-${team.id}" class="hidden mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">團隊名稱</label>
                        <div class="flex gap-2">
                            <input type="text" id="team-name-${team.id}" value="${team.name}" class="flex-1 rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"/>
                            <button onclick="saveTeamName(${team.id})" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">保存</button>
                            <button onclick="toggleTeamEdit(${team.id})" class="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600">取消</button>
                        </div>
                    </div>

                    <!-- 邀請碼 -->
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">邀請碼</label>
                        <div class="flex gap-2">
                            <input type="text" value="${team.invite_code}" readonly class="flex-1 rounded-lg border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-lg tracking-wider"/>
                            <button onclick="copyTeamInviteCode('${team.invite_code}')" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">複製</button>
                            ${isAdmin ? `<button onclick="regenerateTeamInviteCode(${team.id})" class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">重新生成</button>` : ''}
                        </div>
                        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">分享此邀請碼給其他人，讓他們加入您的團隊</p>
                    </div>

                    <!-- 團隊成員 -->
                    <div>
                        <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">團隊成員 (${team.members.length})</h4>
                        <div class="space-y-2">
                            ${team.members.map(member => `
                                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold">
                                            ${member.nickname.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div class="font-medium text-gray-900 dark:text-white">${member.nickname}</div>
                                            <div class="text-xs text-gray-500 dark:text-gray-400">${member.username}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="px-2 py-1 text-xs font-medium rounded ${member.role === 'admin' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'}">
                                            ${member.role === 'admin' ? '管理員' : '成員'}
                                        </span>
                                        ${isAdmin && member.user_id != currentUser.id ? `
                                            <button onclick="removeTeamMember(${team.id}, ${member.user_id})" class="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                                                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                </svg>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('載入團隊設置時發生錯誤:', error);
        allTeamsList.innerHTML = '<div class="text-center py-4 text-red-600">載入失敗，請重試</div>';
    }
}

// 切換團隊編輯模式
function toggleTeamEdit(teamId) {
    const editDiv = document.getElementById(`team-edit-${teamId}`);
    editDiv.classList.toggle('hidden');
}

// 保存團隊名稱
async function saveTeamName(teamId) {
    const newName = document.getElementById(`team-name-${teamId}`).value.trim();

    if (!newName) {
        alert('團隊名稱不能為空');
        return;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('name', newName);

        const response = await fetch(`/api/teams.php?id=${teamId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            // 更新團隊列表
            const teamIndex = allTeams.findIndex(t => t.id == teamId);
            if (teamIndex !== -1) {
                allTeams[teamIndex].name = newName;
                if (currentTeam && currentTeam.id == teamId) {
                    currentTeam.name = newName;
                    renderHeader();
                }
            }

            // 重新載入團隊設置
            loadAllTeamsSettings();
            alert('團隊名稱已更新');
        } else {
            alert(data.message || '保存失敗');
        }
    } catch (error) {
        console.error('保存團隊名稱時發生錯誤:', error);
        alert('保存團隊名稱時發生錯誤');
    }
}

// 複製團隊邀請碼
function copyTeamInviteCode(inviteCode) {
    navigator.clipboard.writeText(inviteCode).then(() => {
        alert('邀請碼已複製到剪貼板！');
    }).catch(err => {
        console.error('複製失敗:', err);
        alert('複製失敗，請手動複製');
    });
}

// 重新生成團隊邀請碼
async function regenerateTeamInviteCode(teamId) {
    if (!confirm('重新生成邀請碼後，舊的邀請碼將失效。確定要繼續嗎？')) {
        return;
    }

    try {
        const response = await fetch(`/api/teams.php?id=${teamId}&action=regenerate_code`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            // 更新團隊列表中的邀請碼
            const teamIndex = allTeams.findIndex(t => t.id == teamId);
            if (teamIndex !== -1) {
                allTeams[teamIndex].invite_code = data.invite_code;
                if (currentTeam && currentTeam.id == teamId) {
                    currentTeam.invite_code = data.invite_code;
                }
            }

            // 重新載入團隊設置
            loadAllTeamsSettings();
            alert('邀請碼已重新生成！');
        } else {
            alert(data.message || '重新生成失敗');
        }
    } catch (error) {
        console.error('重新生成邀請碼時發生錯誤:', error);
        alert('重新生成邀請碼時發生錯誤');
    }
}

// 移除團隊成員
async function removeTeamMember(teamId, userId) {
    if (!confirm('確定要移除此成員嗎？')) {
        return;
    }

    try {
        const response = await fetch(`/api/teams.php?id=${teamId}&user_id=${userId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            // 重新載入團隊設置
            loadAllTeamsSettings();
            alert('成員已移除');
        } else {
            alert(data.message || '移除失敗');
        }
    } catch (error) {
        console.error('移除成員時發生錯誤:', error);
        alert('移除成員時發生錯誤');
    }
}

// 顯示創建團隊表單
function showCreateTeamForm() {
    const form = document.getElementById('create-team-form');
    form.classList.remove('hidden');
    document.getElementById('new-team-name').value = '';
    document.getElementById('new-team-name').focus();
}

// 隱藏創建團隊表單
function hideCreateTeamForm() {
    const form = document.getElementById('create-team-form');
    form.classList.add('hidden');
    document.getElementById('new-team-name').value = '';
}

// 創建新團隊
async function createNewTeam() {
    const teamName = document.getElementById('new-team-name').value.trim();

    if (!teamName) {
        alert('團隊名稱不能為空');
        return;
    }

    try {
        const response = await fetch('/api/teams.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: teamName })
        });
        const data = await response.json();

        if (data.success) {
            // 添加新團隊到列表
            allTeams.push(data.team);

            // 如果成功創建後自動切換到新團隊，更新當前團隊
            currentTeam = data.team;
            currentUser.current_team_id = data.team.id;

            // 重新載入團隊設置
            hideCreateTeamForm();
            await loadAllTeamsSettings();
            renderHeader();

            alert('團隊創建成功！');
        } else {
            alert(data.message || '創建失敗');
        }
    } catch (error) {
        console.error('創建團隊時發生錯誤:', error);
        alert('創建團隊時發生錯誤');
    }
}

// 確認刪除團隊
function confirmDeleteTeam(teamId, teamName) {
    if (confirm(`確定要刪除團隊「${teamName}」嗎？\n\n刪除團隊將會：\n- 移除所有團隊成員\n- 刪除所有團隊任務\n- 此操作無法撤銷！`)) {
        deleteTeam(teamId);
    }
}

// 刪除團隊
async function deleteTeam(teamId) {
    try {
        const response = await fetch(`/api/teams.php?id=${teamId}`, {
            method: 'DELETE'
        });
        const data = await response.json();

        if (data.success) {
            // 如果刪除的是當前團隊，後端會自動切換到另一個團隊
            // 需要重新載入用戶信息以獲取新的 current_team_id
            await checkLoginStatus();

            // 重新載入團隊列表和當前團隊
            await loadTeams();

            // 刷新界面
            renderHeader();
            await loadUsers();
            await loadTasks();
            await loadAllTeamsSettings();

            alert('團隊已刪除');
        } else {
            alert(data.message || '刪除失敗');
        }
    } catch (error) {
        console.error('刪除團隊時發生錯誤:', error);
        alert('刪除團隊時發生錯誤');
    }
}

// 關閉設置模態框
function closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.add('hidden');
}

// 處理設置表單提交
async function handleSettingsSubmit(e) {
    e.preventDefault();

    const nickname = document.getElementById('settings-nickname').value.trim();
    const password = document.getElementById('settings-password').value;
    const passwordConfirm = document.getElementById('settings-password-confirm').value;

    // 驗證輸入
    if (!nickname) {
        alert('暱稱不能為空');
        return;
    }

    // 如果要修改密碼，檢查密碼確認
    if (password || passwordConfirm) {
        if (password !== passwordConfirm) {
            alert('兩次輸入的密碼不一致');
            return;
        }
        if (password.length < 6) {
            alert('密碼至少需要 6 個字符');
            return;
        }
    }

    try {
        const formData = new URLSearchParams();
        formData.append('nickname', nickname);
        if (password) {
            formData.append('password', password);
        }

        const response = await fetch('/api/profile.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            // 更新當前用戶信息
            currentUser.nickname = nickname;
            // 重新渲染頁首以顯示新暱稱
            renderHeader();
            closeSettings();
            alert('設置已保存');
        } else {
            alert(data.message || '保存失敗');
        }
    } catch (error) {
        console.error('保存設置時發生錯誤:', error);
        alert('保存設置時發生錯誤');
    }
}

// ============================================
// 增強日期選擇器功能
// ============================================

// 初始化增強日期選擇器
function initEnhancedDatePicker() {
    const dateInput = document.querySelector('#task-due-date');
    if (!dateInput) return;

    // 檢查是否已經存在按鈕，避免重複創建
    const existingBtn = dateInput.parentNode.querySelector('.enhanced-date-picker-btn');
    if (existingBtn) return;

    // 添加增強日期選擇器按鈕
    const enhancedPickerBtn = document.createElement('button');
    enhancedPickerBtn.type = 'button';
    enhancedPickerBtn.textContent = '選擇日期';
    enhancedPickerBtn.className = 'enhanced-date-picker-btn mt-2 w-full text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-md transition-colors';
    enhancedPickerBtn.onclick = () => showEnhancedDatePicker(dateInput);

    // 將按鈕插入到日期輸入框之後
    dateInput.parentNode.insertBefore(enhancedPickerBtn, dateInput.nextSibling);
}

// 顯示增強日期選擇器
function showEnhancedDatePicker(dateInput) {
    // 移除現有的增強選擇器
    const existingPicker = document.querySelector('#enhanced-date-picker');
    if (existingPicker) {
        existingPicker.remove();
    }

    // 創建增強日期選擇器容器
    const picker = document.createElement('div');
    picker.id = 'enhanced-date-picker';
    picker.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    picker.onclick = (e) => {
        if (e.target === picker) {
            picker.remove();
        }
    };

    // 獲取當前日期
    const currentDate = dateInput.value ? new Date(dateInput.value) : new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // 生成月份曆
    const monthCalendar = generateMonthCalendar(currentYear, currentMonth, dateInput);

    picker.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4">
                <button onclick="changeEnhancedPickerMonth(-1)" class="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                    ◀
                </button>
                <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">
                    ${currentYear}年${currentMonth + 1}月
                </h3>
                <button onclick="changeEnhancedPickerMonth(1)" class="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
                    ▶
                </button>
            </div>
            <div class="grid grid-cols-7 gap-1 mb-4">
                <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">日</div>
                <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">一</div>
                <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">二</div>
                <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">三</div>
                <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">四</div>
                <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">五</div>
                <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">六</div>
                ${monthCalendar}
            </div>
            <div class="flex justify-between">
                <button onclick="setEnhancedPickerToday()" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
                    今天
                </button>
                <button onclick="setEnhancedPickerClear()" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors">
                    清除
                </button>
                <button onclick="closeEnhancedDatePicker()" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                    取消
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(picker);

    // 存儲當前狀態
    window.enhancedPickerState = {
        dateInput: dateInput,
        currentYear: currentYear,
        currentMonth: currentMonth
    };
}

// 生成月份曆 HTML
function generateMonthCalendar(year, month, dateInput) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const selectedDate = dateInput.value ? new Date(dateInput.value) : null;
    const today = new Date();

    let html = '';

    // 填充空白日期
    for (let i = 0; i < firstDay; i++) {
        html += '<div></div>';
    }

    // 填充日期
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isSelected = selectedDate &&
            selectedDate.getFullYear() === year &&
            selectedDate.getMonth() === month &&
            selectedDate.getDate() === day;
        const isToday = today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;

        let classes = 'text-center py-2 rounded cursor-pointer transition-colors ';
        if (isSelected) {
            classes += 'bg-blue-500 text-white hover:bg-blue-600 ';
        } else if (isToday) {
            classes += 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 ';
        } else {
            classes += 'hover:bg-gray-100 dark:hover:bg-gray-700 ';
        }

        html += `<div class="${classes}" onclick="selectEnhancedPickerDate('${dateStr}')">${day}</div>`;
    }

    return html;
}

// 選擇日期
function selectEnhancedPickerDate(dateStr) {
    if (window.enhancedPickerState) {
        window.enhancedPickerState.dateInput.value = dateStr;
        // 觸發 change 事件
        const event = new Event('change', { bubbles: true });
        window.enhancedPickerState.dateInput.dispatchEvent(event);
    }
    closeEnhancedDatePicker();
}

// 設置為今天
function setEnhancedPickerToday() {
    const today = new Date();
    const dateStr = today.getFullYear() + '-' +
                    String(today.getMonth() + 1).padStart(2, '0') + '-' +
                    String(today.getDate()).padStart(2, '0');
    selectEnhancedPickerDate(dateStr);
}

// 清除日期
function setEnhancedPickerClear() {
    if (window.enhancedPickerState) {
        window.enhancedPickerState.dateInput.value = '';
        // 觸發 change 事件
        const event = new Event('change', { bubbles: true });
        window.enhancedPickerState.dateInput.dispatchEvent(event);
    }
    closeEnhancedDatePicker();
}

// 關閉增強日期選擇器
function closeEnhancedDatePicker() {
    const picker = document.querySelector('#enhanced-date-picker');
    if (picker) {
        picker.remove();
    }
    window.enhancedPickerState = null;
}

// 切換月份
function changeEnhancedPickerMonth(direction) {
    if (!window.enhancedPickerState) return;

    const { dateInput, currentYear, currentMonth } = window.enhancedPickerState;
    const newMonth = currentMonth + direction;
    const newYear = newMonth < 0 ? currentYear - 1 : newMonth > 11 ? currentYear + 1 : currentYear;
    const adjustedMonth = newMonth < 0 ? 11 : newMonth > 11 ? 0 : newMonth;

    // 更新狀態
    window.enhancedPickerState.currentYear = newYear;
    window.enhancedPickerState.currentMonth = adjustedMonth;

    // 更新顯示
    const picker = document.querySelector('#enhanced-date-picker');
    if (picker) {
        const titleElement = picker.querySelector('h3');
        const calendarElement = picker.querySelector('.grid.grid-cols-7');

        titleElement.textContent = `${newYear}年${adjustedMonth + 1}月`;

        // 重新生成月份曆（保留標題行）
        const monthCalendar = generateMonthCalendar(newYear, adjustedMonth, dateInput);
        calendarElement.innerHTML = `
            <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">日</div>
            <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">一</div>
            <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">二</div>
            <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">三</div>
            <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">四</div>
            <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">五</div>
            <div class="text-center text-xs font-medium text-gray-600 dark:text-gray-400">六</div>
            ${monthCalendar}
        `;
    }
}

// 在打開任務模態框時初始化增強日期選擇器
const originalOpenTaskModal = openTaskModal;
openTaskModal = function(task = null) {
    originalOpenTaskModal(task);
    // 延迟初始化，確保模態框完全打開
    setTimeout(() => {
        initEnhancedDatePicker();
    }, 100);
};

// ============================================
// 類別管理功能
// ============================================

// 載入類別設置
async function loadCategoriesSettings() {
    try {
        // 獲取類別列表
        const response = await fetch('/api/categories.php');
        if (!response.ok) throw new Error('Failed to load categories');
        allCategories = await response.json();

        // 檢查當前用戶是否為管理員
        const isAdmin = allTeams.find(t => t.id == currentUser.current_team_id)?.role === 'admin';

        // 顯示/隱藏管理員相關元素
        const createBtn = document.getElementById('create-category-btn-container');
        const adminNotice = document.getElementById('category-admin-notice');

        if (isAdmin) {
            createBtn.classList.remove('hidden');
            adminNotice.classList.add('hidden');
        } else {
            createBtn.classList.add('hidden');
            adminNotice.classList.remove('hidden');
        }

        // 渲染類別列表
        renderCategoriesList(isAdmin);
    } catch (error) {
        console.error('載入類別失敗:', error);
        alert('載入類別失敗');
    }
}

// 渲染類別列表
function renderCategoriesList(isAdmin) {
    const list = document.getElementById('categories-list');

    if (allCategories.length === 0) {
        list.innerHTML = `
            <div class="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg class="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path>
                </svg>
                <p class="text-sm">暫無類別</p>
                ${isAdmin ? '<p class="text-xs mt-1">點擊上方按鈕創建第一個類別</p>' : ''}
            </div>
        `;
        return;
    }

    list.innerHTML = allCategories.map(category => `
        <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1">
                    <div class="w-8 h-8 rounded-full flex-shrink-0" style="background-color: ${category.color}"></div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-white">${category.name}</h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400">創建者：${category.creator_name || '未知'}</p>
                    </div>
                </div>
                ${isAdmin ? `
                    <div class="flex gap-2 flex-shrink-0">
                        <button onclick="editCategory(${category.id})" class="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded" title="編輯">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="deleteCategory(${category.id}, '${category.name}')" class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="刪除">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// 顯示創建類別表單
function showCreateCategoryForm() {
    document.getElementById('create-category-form').classList.remove('hidden');
    document.getElementById('create-category-btn-container').classList.add('hidden');
    // 重置表單
    document.getElementById('new-category-name').value = '';
    document.getElementById('new-category-color').value = '#3B82F6';
    document.getElementById('new-category-color-hex').value = '#3B82F6';
}

// 隱藏創建類別表單
function hideCreateCategoryForm() {
    document.getElementById('create-category-form').classList.add('hidden');
    document.getElementById('create-category-btn-container').classList.remove('hidden');
}

// 創建新類別
async function createNewCategory() {
    const name = document.getElementById('new-category-name').value.trim();
    const color = document.getElementById('new-category-color-hex').value.trim();

    if (!name) {
        alert('請輸入類別名稱');
        return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
        alert('顏色格式錯誤，請使用 HEX 格式（例如：#3B82F6）');
        return;
    }

    try {
        const response = await fetch('/api/categories.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '創建類別失敗');
        }

        hideCreateCategoryForm();
        await loadCategoriesSettings();
        alert('類別創建成功');
    } catch (error) {
        console.error('創建類別失敗:', error);
        alert(error.message || '創建類別失敗');
    }
}

// 編輯類別
async function editCategory(categoryId) {
    const category = allCategories.find(c => c.id == categoryId);
    if (!category) return;

    const newName = prompt('請輸入新的類別名稱:', category.name);
    if (!newName || newName === category.name) return;

    try {
        const response = await fetch(`/api/categories.php?id=${categoryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '更新類別失敗');
        }

        await loadCategoriesSettings();
        alert('類別更新成功');
    } catch (error) {
        console.error('更新類別失敗:', error);
        alert(error.message || '更新類別失敗');
    }
}

// 刪除類別
async function deleteCategory(categoryId, categoryName) {
    if (!confirm(`確定要刪除類別「${categoryName}」嗎？\n\n使用此類別的任務將不再屬於任何類別。`)) {
        return;
    }

    try {
        const response = await fetch(`/api/categories.php?id=${categoryId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '刪除類別失敗');
        }

        await loadCategoriesSettings();
        alert('類別已刪除');
    } catch (error) {
        console.error('刪除類別失敗:', error);
        alert(error.message || '刪除類別失敗');
    }
}

// 顏色選擇器同步
document.addEventListener('DOMContentLoaded', () => {
    const colorPicker = document.getElementById('new-category-color');
    const colorHex = document.getElementById('new-category-color-hex');

    if (colorPicker && colorHex) {
        // 顏色選擇器變更時更新文字框
        colorPicker.addEventListener('input', (e) => {
            colorHex.value = e.target.value.toUpperCase();
        });

        // 文字框變更時更新顏色選擇器
        colorHex.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
                colorPicker.value = value;
            }
        });
    }
});

// ============================================
// 系統更新功能
