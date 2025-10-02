// Family Task Manager - Main Application

let currentUser = null;
let allTasks = [];
let allUsers = [];
let currentFilter = 'all';
let selectedDate = new Date();
let currentMonth = new Date();

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    setupEventListeners();
});

// Check if user is logged in
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
        console.error('Error checking login status:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Task form
    const taskForm = document.getElementById('task-form');
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }
}

// Switch between login and register tabs
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

// Handle login
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

// Handle registration
async function handleRegister(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const errorDiv = document.getElementById('register-error');

    try {
        const response = await fetch('/api/auth.php?action=register', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            alert('註冊成功！請登入。');
            switchTab('login');
            e.target.reset();
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
    renderHeader();
    renderMainLayout();
    await loadUsers();
    await loadTasks();
}

// Render main layout with calendar and task list
function renderMainLayout() {
    const main = document.getElementById('app-main');
    main.className = 'flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8';
    main.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <!-- Left: Calendar (2/3 width) -->
            <div class="lg:col-span-2">
                <div class="bg-white dark:bg-slate-900/50 rounded-lg shadow-sm p-6">
                    <div id="calendar-container"></div>
                </div>
            </div>

            <!-- Right: Task List (1/3 width) -->
            <div class="lg:col-span-1">
                <div class="bg-white dark:bg-slate-900/50 rounded-lg shadow-sm p-6 sticky top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">任務列表</h2>
                        <button onclick="openTaskModal()" class="inline-flex items-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                        </button>
                    </div>

                    <!-- Filter buttons -->
                    <div class="flex flex-col gap-2 mb-6">
                        <button onclick="filterTasks('all')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary text-white text-left" data-filter="all">全部</button>
                        <button onclick="filterTasks('pending')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-filter="pending">待處理</button>
                        <button onclick="filterTasks('in_progress')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-filter="in_progress">進行中</button>
                        <button onclick="filterTasks('completed')" class="filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-left" data-filter="completed">已完成</button>
                    </div>

                    <!-- Task list -->
                    <div id="task-list" class="space-y-3"></div>
                </div>
            </div>
        </div>
    `;

    renderCalendar();
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

    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    let html = `
        <div class="calendar">
            <!-- Calendar Header -->
            <div class="flex items-center justify-between mb-4">
                <button onclick="previousMonth()" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <svg class="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">${year}年 ${monthNames[month]}</h3>
                <button onclick="nextMonth()" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <svg class="h-5 w-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
            </div>

            <!-- Week days -->
            <div class="grid grid-cols-7 gap-1 mb-2">
                ${weekDays.map(day => `<div class="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">${day}</div>`).join('')}
            </div>

            <!-- Calendar days -->
            <div class="grid grid-cols-7 gap-1">
    `;

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
        html += '<div class="aspect-square"></div>';
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
        const todayClass = isToday(day) ? 'ring-2 ring-primary ring-offset-1' : '';
        const selectedClass = isSelected(day) ? 'bg-primary text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800';

        html += `
            <button onclick="selectDate(${year}, ${month}, ${day})"
                    class="aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${selectedClass} ${todayClass} text-gray-900 dark:text-gray-100">
                ${day}
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
    filterTasksByDate();
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

// Render header
function renderHeader() {
    const header = document.getElementById('app-header');
    header.innerHTML = `
        <header class="bg-white dark:bg-background-dark/50 border-b border-gray-200 dark:border-gray-700/50">
            <div class="container mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex items-center gap-4">
                        <svg class="h-8 w-8 text-primary" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M39.5563 34.1455V13.8546C39.5563 15.708 36.8773 17.3437 32.7927 18.3189C30.2914 18.916 27.263 19.2655 24 19.2655C20.737 19.2655 17.7086 18.916 15.2073 18.3189C11.1227 17.3437 8.44365 15.708 8.44365 13.8546V34.1455C8.44365 35.9988 11.1227 37.6346 15.2073 38.6098C17.7086 39.2069 20.737 39.5564 24 39.5564C27.263 39.5564 30.2914 39.2069 32.7927 38.6098C36.8773 37.6346 39.5563 35.9988 39.5563 34.1455Z" fill="currentColor"></path>
                            <path clip-rule="evenodd" d="M10.4485 13.8519C10.4749 13.9271 10.6203 14.246 11.379 14.7361C12.298 15.3298 13.7492 15.9145 15.6717 16.3735C18.0007 16.9296 20.8712 17.2655 24 17.2655C27.1288 17.2655 29.9993 16.9296 32.3283 16.3735C34.2508 15.9145 35.702 15.3298 36.621 14.7361C37.3796 14.246 37.5251 13.9271 37.5515 13.8519C37.5287 13.7876 37.4333 13.5973 37.0635 13.2931C36.5266 12.8516 35.6288 12.3647 34.343 11.9175C31.79 11.0295 28.1333 10.4437 24 10.4437C19.8667 10.4437 16.2099 11.0295 13.657 11.9175C12.3712 12.3647 11.4734 12.8516 10.9365 13.2931C10.5667 13.5973 10.4713 13.7876 10.4485 13.8519ZM37.5563 18.7877C36.3176 19.3925 34.8502 19.8839 33.2571 20.2642C30.5836 20.9025 27.3973 21.2655 24 21.2655C20.6027 21.2655 17.4164 20.9025 14.7429 20.2642C13.1498 19.8839 11.6824 19.3925 10.4436 18.7877V34.1275C10.4515 34.1545 10.5427 34.4867 11.379 35.027C12.298 35.6207 13.7492 36.2054 15.6717 36.6644C18.0007 37.2205 20.8712 37.5564 24 37.5564C27.1288 37.5564 29.9993 37.2205 32.3283 36.6644C34.2508 36.2054 35.702 35.6207 36.621 35.027C37.4573 34.4867 37.5485 34.1546 37.5563 34.1275V18.7877ZM41.5563 13.8546V34.1455C41.5563 36.1078 40.158 37.5042 38.7915 38.3869C37.3498 39.3182 35.4192 40.0389 33.2571 40.5551C30.5836 41.1934 27.3973 41.5564 24 41.5564C20.6027 41.5564 17.4164 41.1934 14.7429 40.5551C12.5808 40.0389 10.6502 39.3182 9.20848 38.3869C7.84205 37.5042 6.44365 36.1078 6.44365 34.1455L6.44365 13.8546C6.44365 12.2684 7.37223 11.0454 8.39581 10.2036C9.43325 9.3505 10.8137 8.67141 12.343 8.13948C15.4203 7.06909 19.5418 6.44366 24 6.44366C28.4582 6.44366 32.5797 7.06909 35.657 8.13948C37.1863 8.67141 38.5667 9.3505 39.6042 10.2036C40.6278 11.0454 41.5563 12.2684 41.5563 13.8546Z" fill="currentColor" fill-rule="evenodd"></path>
                        </svg>
                        <h1 class="text-xl font-bold text-gray-900 dark:text-white">家庭任務管理系統</h1>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm text-gray-600 dark:text-gray-300">您好，${currentUser.nickname}</span>
                        <button onclick="handleLogout()" class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary">登出</button>
                    </div>
                </div>
            </div>
        </header>
    `;
}

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

// Load tasks
async function loadTasks(status = 'all') {
    currentFilter = status;
    const url = status === 'all' ? '/api/tasks.php' : `/api/tasks.php?status=${status}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            allTasks = data.tasks;
            renderTasks();
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
            btn.className = 'filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-primary text-white';
        } else {
            btn.className = 'filter-btn px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
        }
    });

    // Filter and render tasks
    if (status === 'all') {
        renderTasks(allTasks);
    } else {
        const filtered = allTasks.filter(task => task.status === status);
        renderTasks(filtered);
    }
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
    const priorityClass = `priority-${task.priority}`;
    const statusClass = `status-${task.status}`;

    // Map status to Chinese text
    const statusMap = {
        'pending': '待處理',
        'in_progress': '進行中',
        'completed': '已完成',
        'cancelled': '已取消'
    };
    const statusText = statusMap[task.status] || task.status;

    // Map priority to Chinese text
    const priorityMap = {
        'low': '低',
        'medium': '中',
        'high': '高'
    };
    const priorityText = priorityMap[task.priority] || task.priority;

    const assigneeName = task.assignee_name || '未指派';
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' }) : '';

    return `
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-primary transition-all cursor-pointer bg-white dark:bg-slate-800/50" onclick="editTask(${task.id})">
            <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1 flex-1">${task.title}</h3>
                <button onclick="event.stopPropagation(); deleteTask(${task.id})" class="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>

            ${task.description ? `<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">${task.description}</p>` : ''}

            <div class="flex items-center gap-1 flex-wrap mb-2">
                <span class="px-2 py-0.5 text-xs font-medium rounded-full ${priorityClass}">${priorityText}</span>
                <span class="px-2 py-0.5 text-xs font-medium rounded-full ${statusClass}">${statusText}</span>
            </div>

            <div class="flex flex-col gap-1 text-xs text-gray-600 dark:text-gray-400">
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
    } else {
        title.textContent = '建立任務';
        form.reset();
        document.getElementById('task-id').value = '';
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
        due_date: document.getElementById('task-due-date').value
    };

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

// Handle logout
async function handleLogout() {
    try {
        await fetch('/api/auth.php?action=logout', { method: 'POST' });
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
    }
}
