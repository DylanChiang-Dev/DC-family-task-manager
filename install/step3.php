<div class="step-content">
    <h2>创建管理员账户</h2>
    <p>设置系统管理员账号和密码</p>

    <form id="adminForm" class="install-form">
        <div class="form-group">
            <label>管理员用户名</label>
            <input type="text" name="admin_user" required minlength="4" maxlength="50">
            <small>4-50个字符，建议使用字母和数字</small>
        </div>

        <div class="form-group">
            <label>管理员密码</label>
            <input type="password" name="admin_pass" required minlength="6" id="password">
            <small>至少6个字符，建议使用字母、数字和符号组合</small>
        </div>

        <div class="form-group">
            <label>确认密码</label>
            <input type="password" name="admin_pass_confirm" required minlength="6" id="passwordConfirm">
        </div>

        <div class="form-group">
            <label>管理员昵称</label>
            <input type="text" name="admin_nickname" required maxlength="50">
            <small>显示名称，例如"爸爸"、"妈妈"等</small>
        </div>

        <div class="form-group">
            <label>网站名称</label>
            <input type="text" name="site_name" value="家庭任务管理" required maxlength="100">
        </div>

        <div class="button-group">
            <button type="button" class="btn-secondary" onclick="location.href='?step=2'">上一步</button>
            <button type="submit" class="btn-primary">开始安装</button>
        </div>
    </form>

    <div id="installProgress" class="install-progress" style="display: none;">
        <h3>正在安装...</h3>
        <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
        </div>
        <p id="progressText">准备中...</p>
    </div>
</div>

<script>
document.getElementById('adminForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;

    if (password !== passwordConfirm) {
        alert('两次输入的密码不一致！');
        return;
    }

    const formData = new FormData(this);
    const progressDiv = document.getElementById('installProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    this.style.display = 'none';
    progressDiv.style.display = 'block';

    // 模拟进度
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress <= 90) {
            progressFill.style.width = progress + '%';
        }
    }, 100);

    fetch('install.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        clearInterval(progressInterval);
        progressFill.style.width = '100%';

        if (data.success) {
            progressText.textContent = '安装完成！';
            setTimeout(() => {
                location.href = '?step=4';
            }, 1000);
        } else {
            progressText.textContent = '安装失败: ' + data.message;
            alert('安装失败: ' + data.message);
            document.getElementById('adminForm').style.display = 'block';
            progressDiv.style.display = 'none';
        }
    })
    .catch(err => {
        clearInterval(progressInterval);
        alert('安装失败: ' + err.message);
        document.getElementById('adminForm').style.display = 'block';
        progressDiv.style.display = 'none';
    });
});
</script>
