# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Family Task Manager** - A PHP+MySQL family todo list management system with WordPress-style web installation wizard. Features multi-user support, task CRUD operations, priority/status management, and responsive design with dark mode support.

- **Tech Stack**: PHP 7.4+, MySQL 8.0, Tailwind CSS 3.x, vanilla JavaScript, RESTful API
- **UI Framework**: Tailwind CSS with custom theme (dark mode enabled)
- **Fonts**: Public Sans, Material Symbols Outlined icons
- **Deployment**: Baota Panel (production), Docker (local dev)
- **GitHub**: https://github.com/DylanChiang-Dev/family-task-manager

## Development Commands

### Docker Environment (Recommended)

```bash
# Start all services (PHP-FPM, Nginx, MySQL, phpMyAdmin)
docker-compose up -d

# View container status
docker-compose ps

# View logs
docker-compose logs -f [web|nginx|db|phpmyadmin]

# Restart services
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# Stop services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v

# Access MySQL shell
docker-compose exec db mysql -u family_user -pfamily_pass family_tasks

# Access PHP container
docker-compose exec web sh
```

### PHP Built-in Server (Alternative)

```bash
# Start development server from project root
cd public && php -S localhost:8000

# Create database first
mysql -u root -p -e "CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### Database Reset

```bash
# Docker environment
docker-compose exec db mysql -u root -proot -e "DROP DATABASE family_tasks; CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Remove installation locks to reinstall
rm -f config/installed.lock config/database.php config/config.php
```

## Architecture & Key Concepts

### Installation Flow

The system uses a **WordPress-style 4-step web installation wizard** instead of manual setup:

1. **Step 1**: Environment check (PHP version, PDO extensions, file permissions)
2. **Step 2**: Database configuration with live connection testing
3. **Step 3**: Admin account creation
4. **Step 4**: Install completion (creates tables, inserts data, creates lock file)

- Entry point: `/install/index.php` (auto-redirect from `/public/index.php` if not installed)
- Installation lock: `/config/installed.lock` (prevents re-installation)
- Backend APIs: `check.php`, `test_db.php`, `save_db.php`, `install.php`

### Database Connection Architecture

**Singleton Pattern** in [config/Database.php](config/Database.php):

```php
Database::getInstance()->getConnection()
```

**Critical detail**: The Database class supports **custom port configuration** for Docker:

```php
$port = defined('DB_PORT') ? DB_PORT : '3306';
$dsn = "mysql:host=" . DB_HOST . ";port=" . $port . ";dbname=" . DB_NAME;
```

This allows Docker containers to use host `db` (service name) while local dev uses `localhost`.

### RESTful API Structure

All APIs follow consistent patterns:

- **Auth API** [api/auth.php](api/auth.php): `?action=login|logout|register|check`
- **Tasks API** [api/tasks.php](api/tasks.php): RESTful methods (GET/POST/PUT/DELETE)
- **Users API** [api/users.php](api/users.php): GET for user listing (task assignment)

Session management via native PHP `$_SESSION`, auth check via `/api/auth.php?action=check`.

### Security Implementation

- **Password hashing**: `password_hash()` with bcrypt (cost=10)
- **SQL injection prevention**: PDO prepared statements throughout
- **Session management**: `session_start()` in all API files
- **Input validation**: Empty checks, trim(), username uniqueness validation
- **Error responses**: Proper HTTP status codes (400, 401, 404, 405, 409, 500)

### Database Schema

**3 tables** with foreign key constraints:

```sql
users (id, username, password, nickname, role, timestamps)
tasks (id, title, description, creator_id, assignee_id, priority, status, due_date, timestamps)
  - FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
  - FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
task_comments (id, task_id, user_id, content, created_at)
  - FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
```

Priority: `low|medium|high`
Status: `pending|in_progress|completed|cancelled`

### Nginx Routing (Docker)

**Critical configuration** in [docker/nginx/default.conf](docker/nginx/default.conf):

- `/` → serves from `/var/www/html/public` (main app)
- `/install` → serves from `/var/www/html` (installation wizard)
- PHP routing uses **dynamic root path** based on URI:

```nginx
set $root_path /var/www/html/public;
if ($uri ~* ^/install/) {
    set $root_path /var/www/html;
}
```

This was added to fix 404 errors on install directory during development.

### Frontend Architecture

**Vanilla JavaScript** (no frameworks) in [public/js/app.js](public/js/app.js):

- AJAX requests via `fetch()` API
- Task CRUD operations with modal dialogs
- Real-time filtering (status-based)
- Session check on page load
- Event delegation for dynamic elements

## Docker Environment Details

**Services** (from docker-compose.yml):

- `web`: Custom PHP 8.1-fpm with PDO MySQL extensions (Dockerfile)
- `nginx`: Nginx Alpine reverse proxy (port 8080)
- `db`: MySQL 8.0 (port 3306, `mysql_native_password` plugin)
- `phpmyadmin`: Database GUI (port 8081)

**Database credentials** (Docker):
- Host: `db` (service name, NOT localhost)
- Port: 3306
- Database: `family_tasks`
- User: `family_user`
- Password: `family_pass`
- Root password: `root`

**Volume mounts**: Project root syncs to `/var/www/html` for live reload.

## Common Development Tasks

### Adding New API Endpoints

1. Create new action in existing API file or new file in `/api/`
2. Follow pattern: check request method, validate input, use prepared statements
3. Return JSON with proper HTTP status codes
4. Update frontend [public/js/app.js](public/js/app.js) to call new endpoint

### Modifying Database Schema

1. Update [database/schema.sql](database/schema.sql)
2. Update [install/install.php](install/install.php) (wizard execution script)
3. Test by removing lock and re-running installation wizard
4. For production: write migration script

### Frontend Changes

- CSS: [public/css/style.css](public/css/style.css)
- JS: [public/js/app.js](public/js/app.js)
- No build process required (vanilla stack)

### Access URLs

**Docker environment**:
- Main app: http://localhost:8080
- phpMyAdmin: http://localhost:8081
- MySQL: localhost:3306

**PHP built-in server**:
- Main app: http://localhost:8000

## Deployment (Baota Panel)

1. Upload code to `/www/wwwroot/your-domain`
2. Set web root to `/public` directory
3. Set permissions: `chmod -R 777 config`
4. Access domain to trigger installation wizard
5. After install: remove `/install` directory, set `config` to 755

## Important Notes

- **Never commit** `config/installed.lock`, `config/database.php`, `config/config.php` (in .gitignore)
- **Default admin** (from schema.sql): `admin` / `admin123` (must change after install)
- **Docker version field** removed from docker-compose.yml (deprecated in newer versions)
- **File permissions** matter: `config/` must be writable during installation
- **Security**: Installation wizard should be removed/disabled in production
