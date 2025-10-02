<div class="step-content">
    <h2>环境检测</h2>
    <p>正在检测服务器环境...</p>

    <div class="check-list" id="checkList">
        <div class="check-item checking">
            <span class="check-icon">⏳</span>
            <span class="check-name">PHP 版本 (>= 7.4)</span>
            <span class="check-status"></span>
        </div>
        <div class="check-item checking">
            <span class="check-icon">⏳</span>
            <span class="check-name">PDO 扩展</span>
            <span class="check-status"></span>
        </div>
        <div class="check-item checking">
            <span class="check-icon">⏳</span>
            <span class="check-name">PDO MySQL 驱动</span>
            <span class="check-status"></span>
        </div>
        <div class="check-item checking">
            <span class="check-icon">⏳</span>
            <span class="check-name">JSON 扩展</span>
            <span class="check-status"></span>
        </div>
        <div class="check-item checking">
            <span class="check-icon">⏳</span>
            <span class="check-name">配置目录写入权限</span>
            <span class="check-status"></span>
        </div>
    </div>

    <div class="button-group">
        <button id="checkBtn" class="btn-primary" onclick="checkEnvironment()">开始检测</button>
        <button id="nextBtn" class="btn-primary" style="display: none;" onclick="location.href='?step=2'">下一步</button>
    </div>
</div>

<script>
function checkEnvironment() {
    document.getElementById('checkBtn').style.display = 'none';

    fetch('check.php')
        .then(res => res.json())
        .then(data => {
            const items = document.querySelectorAll('.check-item');
            let allPassed = true;

            data.checks.forEach((check, index) => {
                const item = items[index];
                item.classList.remove('checking');

                if (check.passed) {
                    item.classList.add('passed');
                    item.querySelector('.check-icon').textContent = '✓';
                    item.querySelector('.check-status').textContent = check.value;
                } else {
                    item.classList.add('failed');
                    item.querySelector('.check-icon').textContent = '✗';
                    item.querySelector('.check-status').textContent = check.message;
                    allPassed = false;
                }
            });

            if (allPassed) {
                document.getElementById('nextBtn').style.display = 'inline-block';
            } else {
                alert('环境检测未通过，请解决上述问题后重试');
                document.getElementById('checkBtn').style.display = 'inline-block';
            }
        })
        .catch(err => {
            alert('检测失败: ' + err.message);
            document.getElementById('checkBtn').style.display = 'inline-block';
        });
}

// 自动检测
window.addEventListener('load', () => {
    setTimeout(checkEnvironment, 500);
});
</script>
