<?php
/**
 * Installation Step 1: Environment Check
 */

// Perform environment checks
$checks = [];

// PHP version check (7.4+)
$phpVersion = PHP_VERSION;
$checks['php_version'] = [
    'name' => 'PHP Version (7.4+ required)',
    'detail' => "Your version: $phpVersion",
    'status' => version_compare($phpVersion, '7.4.0', '>=')
];

// PDO MySQL extension
$checks['pdo_mysql'] = [
    'name' => 'PDO MySQL Extension',
    'detail' => 'Required for database connection',
    'status' => extension_loaded('pdo_mysql')
];

// Config directory writable
$configDir = __DIR__ . '/../config';
$checks['config_writable'] = [
    'name' => 'Config Directory Writable',
    'detail' => 'Required to save configuration',
    'status' => is_writable($configDir)
];

// Check if all passed
$allPassed = true;
foreach ($checks as $check) {
    if (!$check['status']) {
        $allPassed = false;
        break;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Family Task Manager Setup - Environment Check</title>
    <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
    <link href="https://fonts.googleapis.com" rel="preconnect"/>
    <link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
    <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;700;900&display=swap" rel="stylesheet"/>
    <link rel="stylesheet" href="/install/style.css"/>
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
                <h2 class="text-lg font-bold leading-tight tracking-[-0.015em]">Family Task Manager Setup</h2>
            </div>
        </header>
        <main class="flex-1 px-4 py-8 sm:px-6 lg:px-8">
            <div class="mx-auto w-full max-w-2xl">
                <div class="text-center">
                    <h1 class="text-3xl font-bold tracking-tight text-black dark:text-white sm:text-4xl">Environment Check</h1>
                    <p class="mt-3 text-base leading-7 text-black/60 dark:text-white/60">Before we proceed, let's ensure your server meets the necessary requirements.</p>
                </div>
                <div class="mt-8 space-y-6 bg-white dark:bg-background-dark/50 rounded-lg p-6 shadow-sm">
                    <?php foreach ($checks as $key => $check): ?>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="flex size-10 items-center justify-center rounded-full <?php echo $check['status'] ? 'bg-primary/10 pass-icon' : 'bg-red-500/10 fail-icon'; ?>">
                                <?php if ($check['status']): ?>
                                <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"></path>
                                </svg>
                                <?php else: ?>
                                <svg fill="currentColor" height="24" viewBox="0 0 256 256" width="24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
                                </svg>
                                <?php endif; ?>
                            </div>
                            <div>
                                <p class="font-medium text-black dark:text-white"><?php echo $check['name']; ?></p>
                                <p class="text-sm text-black/60 dark:text-white/60"><?php echo $check['detail']; ?></p>
                            </div>
                        </div>
                        <span class="text-sm font-semibold <?php echo $check['status'] ? 'pass-text' : 'fail-text'; ?>">
                            <?php echo $check['status'] ? 'Pass' : 'Failed'; ?>
                        </span>
                    </div>
                    <?php if ($key !== array_key_last($checks)): ?>
                    <hr class="border-black/10 dark:border-white/10"/>
                    <?php endif; ?>
                    <?php endforeach; ?>
                </div>

                <?php if (!$allPassed): ?>
                <div class="mt-6 rounded-lg bg-red-500/10 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg aria-hidden="true" class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" fill-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-red-800 dark:text-red-300">One or more checks failed.</h3>
                            <div class="mt-2 text-sm text-red-700 dark:text-red-200">
                                <p>Please resolve the issues above before proceeding. The 'Next' button will be enabled once all checks pass.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <?php endif; ?>

                <div class="mt-8 flex justify-end">
                    <a href="/install/step2.php" class="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary <?php echo !$allPassed ? 'disabled:cursor-not-allowed disabled:bg-primary/50 disabled:text-white/70 pointer-events-none opacity-50' : ''; ?>">
                        Next
                    </a>
                </div>
            </div>
        </main>
    </div>
</div>
</body>
</html>
