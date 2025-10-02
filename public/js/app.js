// 应用状态
const app = {
    currentFilter: 'all',
    users: [],
    tasks: []
};

// API 请求封装
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    } catch (error) {
        alert(error.message);
        throw error;
    }
}

// 登录
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        await apiRequest('../api/auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        location.reload();
    } catch (error) {
        console.error('登录失败', error);
    }
});

// 注册
document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    try {
        await apiRequest('../api/auth.php?action=register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        alert('注册成功！');
        document.getElementById('showLogin').click();
    } catch (error) {
        console.error('注册失败', error);
    }
});

// 切换登录/注册
document.getElementById('showRegister')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});

// 登出
document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    try {
        await apiRequest('../api/auth.php?action=logout');
        location.reload();
    } catch (error) {
        console.error('登出失败', error);
    }
});

// 加载用户列表
async function loadUsers() {
    try {
        app.users = await apiRequest('../api/users.php');
        const assigneeSelect = document.querySelector('select[name="assignee_id"]');
        if (assigneeSelect) {
            assigneeSelect.innerHTML = '<option value="">未分配</option>' +
                app.users.map(user => `<option value="${user.id}">${user.nickname}</option>`).join('');
        }
    } catch (error) {
        console.error('加载用户失败', error);
    }
}

// 加载任务列表
async function loadTasks(status = null) {
    try {
        const url = status && status !== 'all'
            ? `../api/tasks.php?status=${status}`
            : '../api/tasks.php';

        app.tasks = await apiRequest(url);
        renderTasks();
    } catch (error) {
        console.error('加载任务失败', error);
    }
}

// 渲染任务列表
function renderTasks() {
    const taskList = document.getElementById('taskList');
    if (!taskList) return;

    if (app.tasks.length === 0) {
        taskList.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">暂无任务</p>';
        return;
    }

    taskList.innerHTML = app.tasks.map(task => {
        const statusText = {
            'pending': '待处理',
            'in_progress': '进行中',
            'completed': '已完成',
            'cancelled': '已取消'
        };

        return `
            <div class="task-item priority-${task.priority}" data-id="${task.id}">
                <div class="task-header">
                    <div>
                        <div class="task-title">${escapeHtml(task.title)}</div>
                        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
                    </div>
                    <span class="task-status ${task.status}">${statusText[task.status]}</span>
                </div>
                <div class="task-meta">
                    <span>创建者: ${escapeHtml(task.creator_name)}</span>
                    ${task.assignee_name ? `<span>负责人: ${escapeHtml(task.assignee_name)}</span>` : ''}
                    ${task.due_date ? `<span>截止: ${new Date(task.due_date).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // 绑定点击事件
    document.querySelectorAll('.task-item').forEach(item => {
        item.addEventListener('click', () => openTaskModal(item.dataset.id));
    });
}

// 打开任务模态框
function openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const form = document.getElementById('taskForm');
    const title = document.getElementById('modalTitle');

    if (taskId) {
        const task = app.tasks.find(t => t.id == taskId);
        if (task) {
            title.textContent = '编辑任务';
            form.elements.id.value = task.id;
            form.elements.title.value = task.title;
            form.elements.description.value = task.description || '';
            form.elements.assignee_id.value = task.assignee_id || '';
            form.elements.priority.value = task.priority;
            if (task.due_date) {
                form.elements.due_date.value = task.due_date.slice(0, 16);
            }
        }
    } else {
        title.textContent = '新建任务';
        form.reset();
    }

    modal.style.display = 'block';
}

// 关闭模态框
document.querySelector('.close')?.addEventListener('click', () => {
    document.getElementById('taskModal').style.display = 'none';
});

// 新建任务按钮
document.getElementById('newTaskBtn')?.addEventListener('click', () => {
    openTaskModal();
});

// 提交任务表单
document.getElementById('taskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // 移除空值
    Object.keys(data).forEach(key => {
        if (data[key] === '') delete data[key];
    });

    try {
        if (data.id) {
            // 更新任务
            await apiRequest('../api/tasks.php', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        } else {
            // 创建任务
            delete data.id;
            await apiRequest('../api/tasks.php', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }

        document.getElementById('taskModal').style.display = 'none';
        loadTasks(app.currentFilter);
    } catch (error) {
        console.error('保存任务失败', error);
    }
});

// 筛选标签
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        app.currentFilter = tab.dataset.status;
        loadTasks(app.currentFilter);
    });
});

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初始化
if (document.getElementById('taskList')) {
    loadUsers();
    loadTasks();
}
