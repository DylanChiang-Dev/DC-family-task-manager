# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Family Task Manager** - A PHP+MySQL multi-team task management system with WordPress-style web installation wizard. Supports both family and work use cases with Slack/Feishu-style workspace architecture.

- **Tech Stack**: PHP 7.4+, MySQL 5.7.8+/8.0, Tailwind CSS 3.x, vanilla JavaScript, RESTful API
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
docker compose exec db mysql -u root -proot -e "DROP DATABASE family_tasks; CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Remove installation locks to reinstall
rm -f config/installed.lock config/database.php config/config.php
```

### Database Operations (中文字符支持)

```bash
# Import data with UTF-8 support (REQUIRED for Chinese characters)
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < file.sql

# Query tasks with UTF-8
docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 -e "SELECT * FROM tasks;" family_tasks

# Backup with UTF-8
docker compose exec db mysqldump -u root -proot --default-character-set=utf8mb4 family_tasks > backup.sql
```

**CRITICAL**: MySQL defaults to `latin1` encoding. Always use `--default-character-set=utf8mb4` to avoid Chinese character corruption. See [database/README.md](database/README.md) for troubleshooting.

### Database Migrations

The project uses a migration system to manage database schema changes:

```bash
# Create new migration
php scripts/make-migration.php "add user avatar column"

# Run pending migrations
php scripts/migrate.php

# Check migration status
php scripts/migrate.php --status

# Rollback last migration (if .down.sql exists)
php scripts/migrate.php --rollback
```

**Migration Naming**: `YYYYMMDDHHMMSS_description.sql` (e.g., `20250103120000_add_user_avatar.sql`)

**Auto-execution**: Migrations run automatically during system updates via `update.sh`

See [database/migrations/README.md](database/migrations/README.md) for detailed usage and examples.

### System Updates

Update system code and database automatically:

```bash
# Run update script (pulls latest code, runs migrations, updates permissions)
bash update.sh

# Or use web interface: Settings → Personal Settings → System Update
```

Features:
- Automatic Git pull from configured branch
- Auto-backup of config files (database.php, config.php, installed.lock)
- Auto-execution of pending database migrations
- Baota Panel permission management
- Update changelog display
- Rollback on failure

**Requirements**: Project must be deployed via Git (not ZIP upload)

### Production Environment Deployment

**IMPORTANT**: When developing features for production environment (e.g., https://list.3331322.xyz/), code changes will NOT take effect immediately due to browser caching and server-side caching.

**Development Workflow for Production**:

1. **Make Code Changes** locally (edit CSS/JS/PHP files)

2. **Commit and Push**:
   ```bash
   git add .
   git commit -m "fix: description of changes"
   git push
   ```

3. **Notify User** to manually update on server:
   ```bash
   # User runs on production server (Baota Panel)
   cd /www/wwwroot/list.3331322.xyz
   git pull origin main
   ```

4. **Clear Browser Cache** (if testing UI changes):
   - Hard refresh: `Cmd+Shift+R` (Mac) / `Ctrl+Shift+R` (Windows)
   - Or add cache-busting query: `?nocache=<random_number>`

**Testing Strategy**:
- ✅ DO: Commit → Push → Tell user to update → User tests
- ❌ DON'T: Test directly on production via MCP without commit/push
- ❌ DON'T: Expect immediate changes without git pull on server

**Why This Workflow**:
- Production uses static file serving with aggressive caching
- PHP opcode cache may need manual clearing
- Browser caches CSS/JS files
- Git is the single source of truth

**Example Workflow**:
```bash
# 1. Claude makes changes
git add public/css/style.css public/js/app.js
git commit -m "fix: mobile UI responsive design"
git push

# 2. Claude tells user:
# "代码已推送，请在生产服务器运行: cd /www/wwwroot/list.3331322.xyz && git pull"

# 3. User runs on server:
cd /www/wwwroot/list.3331322.xyz && git pull

# 4. User hard refreshes browser to test
```

## Project Features

### Multi-Team Architecture (Slack/Feishu Model)

**Core Concept**: Users can belong to multiple teams (workspaces) and switch between them, similar to Slack or Feishu.

- **Registration Flow**: Users choose to either create a new team OR join existing team via 6-character invite code
- **Team Switching**: Click team dropdown in header to switch between teams (e.g., 家庭團隊, 工作團隊一, 工作團隊二)
- **Data Isolation**: Tasks, users, and all data are strictly isolated per team
- **Roles**: Each user has a role (admin/member) within each team independently
- **Team Management**:
  - Admins can modify team name, regenerate invite codes, and remove members
  - Members can view team info and invite codes but cannot modify

**Database Schema**:
```sql
teams (id, name, invite_code, created_by, timestamps)
team_members (team_id, user_id, role) -- Many-to-many with roles
users (id, username, password, nickname, current_team_id, timestamps)
tasks (team_id, title, ...) -- All tasks belong to a team
```

**Key Files**:
- [lib/TeamHelper.php](lib/TeamHelper.php) - Team utility functions (invite code generation, permission checks)
- [api/teams.php](api/teams.php) - Team CRUD, join/switch/members/regenerate_code endpoints
- [api/auth.php](api/auth.php) - Registration with team creation/joining
- [api/tasks.php](api/tasks.php) - Team-scoped task queries
- [api/users.php](api/users.php) - Returns only current team members
- [api/profile.php](api/profile.php) - User profile updates (nickname, password)

**Frontend**:
- Team switcher dropdown in header (public/js/app.js:441-492)
- Settings modal with Profile/Team tabs (public/index.php:311-357)
- **Unified Team Management**: All teams displayed in a single view - no need to switch teams to manage them
  - Shows all teams user belongs to in card layout
  - Each team card displays: name, invite code, member list
  - Admins can edit team name, regenerate invite code, remove members inline
  - Current team highlighted with ring border
  - Located in Settings → Team Settings tab (public/js/app.js:983-1202)

### Recurring Tasks (週期任務)
- **Task Types**: normal (一般), recurring (週期), repeatable (重複)
- **Frequencies**: daily, weekly, monthly, yearly
- **Storage**: JSON config in `tasks.recurrence_config` column
- **Migration**: [database/migrations/add_recurring_tasks.sql](database/migrations/add_recurring_tasks.sql)
- **Details**: See [RECURRING_TASKS.md](RECURRING_TASKS.md)

### Lunar Calendar (農曆顯示)
- **Library**: Pure JavaScript implementation in [public/js/lunar.js](public/js/lunar.js)
- **Range**: 1900-2100 (200 years)
- **Algorithm**: Based on base date 1900-01-31 (正月初一) with day offset calculation
- **Usage**: `LunarCalendar.solarToLunar(year, month, day)` returns `{year, month, day, isLeap}`
- **Details**: See [LUNAR_CALENDAR.md](LUNAR_CALENDAR.md)

### Demo Data
- **File**: [database/seed_demo_tasks.sql](database/seed_demo_tasks.sql) (16 sample tasks)
- **Categories**: Today (3), Tomorrow (2), This Week (3), Next Week (2), Recurring (4), Completed (2)
- **Import**: `docker compose exec db mysql -u root -proot --default-character-set=utf8mb4 family_tasks < database/seed_demo_tasks.sql`
- **CRITICAL**: Always use `--default-character-set=utf8mb4` for Chinese character support

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

**Singleton Pattern** in [lib/Database.php](lib/Database.php):

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

All APIs follow consistent patterns with **team-scoped access control**:

- **Auth API** [api/auth.php](api/auth.php): `?action=login|logout|register|check` (registration includes team creation/joining)
- **Teams API** [api/teams.php](api/teams.php): GET all teams, GET team details, POST create/join/switch, PUT update (admin), DELETE remove members (admin), POST regenerate invite code (admin)
- **Tasks API** [api/tasks.php](api/tasks.php): RESTful methods (GET/POST/PUT/DELETE) - all queries filtered by `current_team_id`
- **Users API** [api/users.php](api/users.php): GET for user listing - returns only current team members
- **Profile API** [api/profile.php](api/profile.php): POST to update nickname and password

Session management via native PHP `$_SESSION`, auth check via `/api/auth.php?action=check`.

### Security Implementation

- **Password hashing**: `password_hash()` with bcrypt (cost=10)
- **SQL injection prevention**: PDO prepared statements throughout
- **Team isolation**: All queries check `team_id` and verify user membership via `TeamHelper::isTeamMember()`
- **Permission checks**: Admin-only operations verified via `TeamHelper::isTeamAdmin()`
- **Input validation**: Empty checks, trim(), username uniqueness validation
- **Error responses**: Proper HTTP status codes (400, 401, 403, 404, 405, 409, 500)

### Database Schema

**Multi-team architecture** with 5 core tables:

```sql
teams (id, name, invite_code, created_by, timestamps)
  - invite_code: 6-character unique code (excluding confusing chars: 0,O,I,1)

team_members (id, team_id, user_id, role, joined_at)
  - role: ENUM('admin', 'member')
  - UNIQUE KEY (team_id, user_id)
  - Many-to-many relationship between users and teams

users (id, username, password, nickname, current_team_id, timestamps)
  - current_team_id: Currently selected team for session

tasks (id, team_id, title, description, creator_id, assignee_id, priority, status, due_date, task_type, recurrence_config, parent_task_id, timestamps)
  - team_id: Team this task belongs to (strict isolation)
  - FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
  - task_type: ENUM('normal', 'recurring', 'repeatable')
  - recurrence_config: JSON for recurring task settings

task_comments (id, team_id, task_id, user_id, content, created_at)
  - team_id: Team isolation for comments
```

Priority: `low|medium|high`
Status: `pending|in_progress|completed|cancelled`

### Nginx Routing (Docker)

**Standard configuration** in [docker/nginx/default.conf](docker/nginx/default.conf):

- Web root: `/var/www/html/public`
- All files (including `/install`) are served from public directory
- No special routing needed - install wizard is accessible at `/install/index.php`

### Frontend Architecture

**Vanilla JavaScript** (no frameworks) in [public/js/app.js](public/js/app.js):

- **Global State**: `currentUser`, `allTasks`, `allUsers`, `allTeams`, `currentTeam`, `currentFilter`, `selectedDate`
- **Team Management**:
  - `loadTeams()` - Fetch all teams user belongs to (public/js/app.js:494-510)
  - `switchCurrentTeam(teamId)` - Switch team and reload data (public/js/app.js:512-544)
  - `toggleTeamDropdown()` - Click-based dropdown (not hover) (public/js/app.js:546-576)
- **Settings Modal**: Tabbed interface with Profile/Team tabs (public/js/app.js:963-986)
- **Team Settings**: Load team details, members, invite code, admin controls (public/js/app.js:988-1176)
- **AJAX**: `fetch()` API for all RESTful operations
- **Session**: Auto-check on page load via `checkLoginStatus()` (public/js/app.js:81-96)

**UI Notes**:
- All code comments are in Traditional Chinese (繁體中文) as per project requirements
- Team dropdown uses click-to-open (not hover) to prevent accidental closing
- Settings modal width increased to `max-w-2xl` to accommodate team member list
- **UX Optimization**: All team management in one place - users don't need to switch teams to view/edit settings
  - Reduces user operation cost
  - All teams visible simultaneously
  - Edit any team's settings without context switching

## Docker Environment Details

**Services** (from docker-compose.yml):

- `web`: Custom PHP 7.4-fpm with PDO MySQL extensions (Dockerfile)
- `nginx`: Nginx Alpine reverse proxy (port 8080)
- `db`: MySQL 8.0 (port 3306, `mysql_native_password` plugin, compatible with MySQL 5.7.8+)
- `phpmyadmin`: Database GUI (port 8081)

**Database credentials** (Docker):
- Host: `db` (service name, NOT localhost)
- Port: 3306
- Database: `family_tasks`
- User: `family_user`
- Password: `family_pass`
- Root password: `root`

**Volume mounts**: Project root syncs to `/var/www/html` for live reload.

## Access URLs

**Docker environment**:
- Main app: http://localhost:8080
- phpMyAdmin: http://localhost:8081
- MySQL: localhost:3306

**PHP built-in server**:
- Main app: http://localhost:8000

## Test Account

**Development/Testing Credentials**:
- Username: `3331322@gmail.com`
- Password: `ca123456789`
- Purpose: Use this account for testing multi-team features, settings, and team management

## Deployment (Baota Panel)

1. Upload code to `/www/wwwroot/your-domain`
2. Set web root to `/public` directory
3. Set permissions: `chmod -R 777 config`
4. Access domain to trigger installation wizard
5. After install: remove `/install` directory, set `config` to 755

## Important Notes

- **Code Comments**: All code comments must be in Traditional Chinese (繁體中文) as per project standards
- **UX Philosophy**: Minimize user operation cost - all settings should be accessible without context switching
  - Example: Team settings show ALL teams in one view, no need to switch teams first
  - Principle: Reduce clicks, reduce confusion, increase efficiency
- **Never commit**: `config/installed.lock`, `config/database.php`, `config/config.php` (in .gitignore)
- **Default credentials**: First team creator becomes admin automatically
- **Team Invite Codes**: 6 characters, uppercase, excluding confusing chars (0,O,I,1) - see `TeamHelper::generateInviteCode()`
- **File permissions**: `config/` must be writable during installation
- **Security**: Installation wizard should be removed/disabled in production
- **Chinese character corruption**: ALWAYS use `--default-character-set=utf8mb4` for MySQL CLI operations (import/export/query)
- **Multi-team isolation**: All API queries MUST filter by `current_team_id` from session - never expose cross-team data
- **Permission checks**: Always verify admin role via `TeamHelper::isTeamAdmin()` before allowing destructive operations
