// Family Task Manager - Main Application

let currentUser = null;
let allTasks = [];
let allUsers = [];
let currentFilter = 'all';

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
        errorDiv.textContent = 'Login failed. Please try again.';
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
            alert('Registration successful! Please log in.');
            switchTab('login');
            e.target.reset();
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        errorDiv.textContent = 'Registration failed. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

// Initialize main app
async function initializeApp() {
    renderHeader();
    await loadUsers();
    await loadTasks();
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
                        <h1 class="text-xl font-bold text-gray-900 dark:text-white">Family Task Manager</h1>
                    </div>
                    <div class="flex items-center gap-4">
                        <span class="text-sm text-gray-600 dark:text-gray-300">Hi, ${currentUser.nickname}</span>
                        <button onclick="handleLogout()" class="text-sm text-gray-600 dark:text-gray-300 hover:text-primary">Logout</button>
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
    select.innerHTML = '<option value="">Unassigned</option>';

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

// Render tasks
function renderTasks() {
    const main = document.getElementById('app-main');

    const filterButtons = `
        <div class="flex justify-between items-center mb-6">
            <div class="flex gap-2">
                <button onclick="loadTasks('all')" class="px-4 py-2 rounded-lg ${currentFilter === 'all' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">All</button>
                <button onclick="loadTasks('pending')" class="px-4 py-2 rounded-lg ${currentFilter === 'pending' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">Pending</button>
                <button onclick="loadTasks('in_progress')" class="px-4 py-2 rounded-lg ${currentFilter === 'in_progress' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">In Progress</button>
                <button onclick="loadTasks('completed')" class="px-4 py-2 rounded-lg ${currentFilter === 'completed' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">Completed</button>
            </div>
            <button onclick="openTaskModal()" class="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
                <span class="material-symbols-outlined">add</span>
                New Task
            </button>
        </div>
    `;

    const tasksList = allTasks.length === 0 ? `
        <div class="text-center py-12 text-gray-500 dark:text-gray-400">
            No tasks found. Create one to get started!
        </div>
    ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${allTasks.map(task => renderTaskCard(task)).join('')}
        </div>
    `;

    main.innerHTML = filterButtons + tasksList;
}

// Render single task card
function renderTaskCard(task) {
    const priorityClass = `priority-${task.priority}`;
    const statusClass = `status-${task.status}`;
    const statusText = task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    return `
        <div class="task-card" onclick="editTask(${task.id})">
            <div class="flex items-start justify-between mb-2">
                <h3 class="font-semibold text-gray-900 dark:text-white">${task.title}</h3>
                <span class="px-2 py-1 text-xs font-medium rounded-full ${priorityClass}">${task.priority}</span>
            </div>
            ${task.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">${task.description}</p>` : ''}
            <div class="flex items-center justify-between">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${statusClass}">${statusText}</span>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); deleteTask(${task.id})" class="p-1 text-red-500 hover:text-red-700">
                        <span class="material-symbols-outlined text-base">delete</span>
                    </button>
                </div>
            </div>
            ${task.assignee_nickname ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-2">Assigned to: ${task.assignee_nickname}</p>` : ''}
            ${task.due_date ? `<p class="text-xs text-gray-500 dark:text-gray-400">Due: ${task.due_date}</p>` : ''}
        </div>
    `;
}

// Open task modal
function openTaskModal(task = null) {
    const modal = document.getElementById('task-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('task-form');

    if (task) {
        title.textContent = 'Edit Task';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-assignee').value = task.assignee_id || '';
        document.getElementById('task-priority').value = task.priority;
        document.getElementById('task-status').value = task.status;
        document.getElementById('task-due-date').value = task.due_date || '';
    } else {
        title.textContent = 'Create Task';
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
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Failed to save task');
        console.error(error);
    }
}

// Delete task
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
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
            alert('Error: ' + data.message);
        }
    } catch (error) {
        alert('Failed to delete task');
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
