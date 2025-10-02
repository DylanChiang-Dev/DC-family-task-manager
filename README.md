# Family Task Manager

A modern, self-hosted family task management system built with PHP and MySQL. Features a WordPress-style web installation wizard, responsive design with dark mode support, and complete task management capabilities.

## ✨ Features

- **WordPress-Style Installation Wizard**
  - 4-step guided setup process
  - Automatic environment checking
  - Real-time database connection testing
  - One-click installation

- **User Management**
  - Secure user authentication (bcrypt password hashing)
  - Role-based access (Admin/Member)
  - User registration and login
  - Session-based authentication

- **Task Management**
  - Create, read, update, and delete tasks
  - Priority levels (Low/Medium/High)
  - Status tracking (Pending/In Progress/Completed/Cancelled)
  - Task assignment to family members
  - Due date management
  - Real-time task filtering by status

- **Modern UI/UX**
  - Responsive design (mobile, tablet, desktop)
  - Dark mode support
  - Clean and intuitive interface
  - Material Design icons
  - Tailwind CSS framework

## 🛠️ Tech Stack

- **Backend**: PHP 8.1+ with PDO
- **Database**: MySQL 8.0+
- **Frontend**: Vanilla JavaScript (no framework dependencies)
- **CSS**: Tailwind CSS 3.x
- **Fonts**: Google Fonts (Public Sans)
- **Icons**: Material Symbols Outlined
- **Architecture**: RESTful API

## 📋 Requirements

- PHP 7.4 or higher
- MySQL 8.0 or higher
- PDO MySQL extension
- Writable `config/` directory

## 🚀 Quick Start

### Option 1: Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/DylanChiang-Dev/family-task-manager.git
   cd family-task-manager
   ```

2. **Start Docker services**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Main App: http://localhost:8080
   - phpMyAdmin: http://localhost:8081

4. **Complete the installation wizard**
   - Follow the 4-step setup process
   - Default database credentials (Docker):
     - Host: `db`
     - Port: `3306`
     - Database: `family_tasks`
     - Username: `family_user`
     - Password: `family_pass`

### Option 2: PHP Built-in Server

1. **Create MySQL database**
   ```bash
   mysql -u root -p
   CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. **Start PHP server**
   ```bash
   cd public
   php -S localhost:8000
   ```

3. **Access the application**
   - Open http://localhost:8000
   - Complete the installation wizard

### Option 3: Baota Panel (Production)

1. **Upload files** to your server (e.g., `/www/wwwroot/yourdomain.com`)

2. **Configure web root** to `/public` directory in Baota Panel

3. **Set permissions**
   ```bash
   chmod -R 777 config/
   ```

4. **Access your domain** and complete the installation wizard

5. **Post-installation security** (recommended)
   ```bash
   # Remove installation directory
   rm -rf /install

   # Set config directory to read-only
   chmod -R 755 config/
   ```

## 📁 Project Structure

```
family-task-manager/
├── api/                    # RESTful API endpoints
│   ├── auth.php           # Authentication (login/register/logout)
│   ├── tasks.php          # Task CRUD operations
│   └── users.php          # User listing
├── config/                 # Configuration files (not committed)
│   ├── Database.php       # Database singleton class
│   ├── config.php         # App configuration
│   └── database.php       # Database credentials
├── database/
│   └── schema.sql         # Database schema
├── docker/                # Docker configuration
│   ├── nginx/
│   │   └── default.conf   # Nginx virtual host
│   └── php/
│       └── php.ini        # PHP settings
├── install/               # Installation wizard
│   ├── step1.php          # Environment check
│   ├── step2.php          # Database configuration
│   ├── step3.php          # Admin account creation
│   ├── step4.php          # Installation complete
│   └── *.php              # Backend APIs
├── public/                # Web root directory
│   ├── index.php          # Main application entry
│   ├── css/
│   │   └── style.css      # Custom styles
│   └── js/
│       └── app.js         # Frontend logic
├── docs/                  # Documentation
├── docker-compose.yml     # Docker services definition
├── Dockerfile             # PHP-FPM custom image
└── README.md              # This file
```

## 🔧 Development

### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up -d --build

# Access MySQL shell
docker-compose exec db mysql -u family_user -pfamily_pass family_tasks

# Reset database (WARNING: deletes all data)
docker-compose down -v
```

### Database Reset

```bash
# Docker environment
docker-compose exec db mysql -u root -proot -e "DROP DATABASE family_tasks; CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Remove installation lock
rm -f config/installed.lock config/database.php config/config.php
```

## 🔒 Security Features

- **Password Security**: bcrypt hashing with cost factor 10
- **SQL Injection Prevention**: PDO prepared statements throughout
- **Session Management**: Secure session handling with HttpOnly cookies
- **Input Validation**: Server-side validation for all user inputs
- **XSS Protection**: Output escaping in templates
- **Installation Lock**: Prevents re-installation after setup

## 📚 API Documentation

### Authentication API (`/api/auth.php`)

- `POST ?action=register` - Register new user
- `POST ?action=login` - User login
- `POST ?action=logout` - User logout
- `GET ?action=check` - Check login status

### Tasks API (`/api/tasks.php`)

- `GET /api/tasks.php` - Get all tasks
- `GET /api/tasks.php?status=pending` - Filter tasks by status
- `POST /api/tasks.php` - Create new task
- `PUT /api/tasks.php?id=X` - Update task
- `DELETE /api/tasks.php?id=X` - Delete task

### Users API (`/api/users.php`)

- `GET /api/users.php` - Get all users

## 🌐 Environment Variables

Copy `.env.example` to `.env` and customize:

```env
# Database (Docker)
DB_HOST=db
DB_PORT=3306
DB_NAME=family_tasks
DB_USER=family_user
DB_PASS=family_pass

# Application
APP_NAME="Family Task Manager"
APP_ENV=development
APP_DEBUG=true
```

## 🐛 Troubleshooting

### Config directory not writable

```bash
chmod -R 777 config/
```

### Database connection failed

- Verify MySQL is running
- Check database credentials
- For Docker: use `db` as hostname, not `localhost`

### Installation wizard not appearing

- Delete `config/installed.lock` to restart installation
- Clear browser cache

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Dylan Chiang**
- GitHub: [@DylanChiang-Dev](https://github.com/DylanChiang-Dev)
- Repository: [family-task-manager](https://github.com/DylanChiang-Dev/family-task-manager)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

Built with ❤️ using PHP, MySQL, and Tailwind CSS
