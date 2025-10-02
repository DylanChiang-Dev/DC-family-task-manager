// Installation Wizard JavaScript

// Test database connection
async function testDatabaseConnection() {
    const form = document.getElementById('db-form');
    const formData = new FormData(form);
    const testBtn = document.getElementById('test-connection');
    const resultDiv = document.getElementById('test-result');

    testBtn.disabled = true;
    testBtn.innerHTML = '<div class="spinner mr-2"></div>Testing...';

    try {
        const response = await fetch('/install/test_db.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            resultDiv.innerHTML = `
                <div class="rounded-lg bg-green-500/10 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-green-800 dark:text-green-300">Connection successful!</p>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('next-btn').disabled = false;
        } else {
            resultDiv.innerHTML = `
                <div class="rounded-lg bg-red-500/10 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-red-800 dark:text-red-300">Connection failed: ${result.message}</p>
                        </div>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        resultDiv.innerHTML = `
            <div class="rounded-lg bg-red-500/10 p-4">
                <div class="flex">
                    <div class="ml-3">
                        <p class="text-sm font-medium text-red-800 dark:text-red-300">Error: ${error.message}</p>
                    </div>
                </div>
            </div>
        `;
    } finally {
        testBtn.disabled = false;
        testBtn.textContent = 'Test Connection';
    }
}

// Save database configuration and proceed
async function saveDatabaseConfig() {
    const form = document.getElementById('db-form');
    const formData = new FormData(form);
    const submitBtn = document.getElementById('next-btn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner mr-2"></div>Saving...';

    try {
        const response = await fetch('/install/save_db.php', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '/install/step3.php';
        } else {
            alert('Failed to save configuration: ' + result.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Next';
        }
    } catch (error) {
        alert('Error: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Next';
    }
}

// Execute installation
async function executeInstallation(username, password, nickname) {
    try {
        const response = await fetch('/install/install.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password, nickname })
        });

        const result = await response.json();

        if (result.success) {
            window.location.href = '/install/step4.php';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        throw error;
    }
}

// Password validation
function validatePassword() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const submitBtn = document.getElementById('install-btn');

    if (password.length < 8) {
        document.getElementById('password-error').textContent = 'Password must be at least 8 characters';
        submitBtn.disabled = true;
        return false;
    }

    if (password !== confirmPassword) {
        document.getElementById('password-error').textContent = 'Passwords do not match';
        submitBtn.disabled = true;
        return false;
    }

    document.getElementById('password-error').textContent = '';
    submitBtn.disabled = false;
    return true;
}
