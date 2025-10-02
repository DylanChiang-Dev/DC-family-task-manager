<div class="step-content">
    <h2>数据库配置</h2>
    <p>请填写数据库连接信息</p>

    <form id="dbForm" class="install-form">
        <div class="form-group">
            <label>数据库主机</label>
            <input type="text" name="db_host" value="localhost" required>
            <small>通常为 localhost 或 127.0.0.1</small>
        </div>

        <div class="form-group">
            <label>数据库端口</label>
            <input type="text" name="db_port" value="3306" required>
            <small>MySQL 默认端口为 3306</small>
        </div>

        <div class="form-group">
            <label>数据库名称</label>
            <input type="text" name="db_name" value="family_tasks" required>
            <small>数据库必须已存在，系统会自动创建表</small>
        </div>

        <div class="form-group">
            <label>数据库用户名</label>
            <input type="text" name="db_user" value="root" required>
        </div>

        <div class="form-group">
            <label>数据库密码</label>
            <input type="password" name="db_pass">
            <small>如果没有密码请留空</small>
        </div>

        <div class="form-group">
            <label>表前缀（可选）</label>
            <input type="text" name="db_prefix" value="">
            <small>如需在同一数据库安装多个系统，请设置表前缀</small>
        </div>

        <div class="button-group">
            <button type="button" class="btn-secondary" onclick="location.href='?step=1'">上一步</button>
            <button type="button" class="btn-primary" onclick="testConnection()">测试连接</button>
            <button type="submit" class="btn-primary" id="nextBtn" style="display: none;">下一步</button>
        </div>
    </form>

    <div id="testResult" class="test-result"></div>
</div>

<script>
function testConnection() {
    const form = document.getElementById('dbForm');
    const formData = new FormData(form);
    const resultDiv = document.getElementById('testResult');

    resultDiv.innerHTML = '<p class="testing">⏳ 正在测试数据库连接...</p>';

    fetch('test_db.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            resultDiv.innerHTML = '<p class="success">✓ 数据库连接成功！</p>';
            document.getElementById('nextBtn').style.display = 'inline-block';
        } else {
            resultDiv.innerHTML = '<p class="error">✗ 连接失败: ' + data.message + '</p>';
            document.getElementById('nextBtn').style.display = 'none';
        }
    })
    .catch(err => {
        resultDiv.innerHTML = '<p class="error">✗ 测试失败: ' + err.message + '</p>';
    });
}

document.getElementById('dbForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);

    fetch('save_db.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            location.href = '?step=3';
        } else {
            alert('保存失败: ' + data.message);
        }
    })
    .catch(err => {
        alert('保存失败: ' + err.message);
    });
});
</script>
