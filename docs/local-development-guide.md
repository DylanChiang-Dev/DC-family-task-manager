# Mac 本地开发环境配置指南

## 方案一：Homebrew + PHP + MySQL（推荐）

### 1. 安装 Homebrew（如果还没有）

```bash
# 检查是否已安装
which brew

# 如果没有安装，执行以下命令
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. 安装 PHP 8.1

```bash
# 安装 PHP
brew install php@8.1

# 启动 PHP 服务
brew services start php@8.1

# 验证安装
php -v

# 检查扩展
php -m | grep -E "pdo|mysql|json"
```

### 3. 安装 MySQL

```bash
# 安装 MySQL
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 安全配置（设置 root 密码）
mysql_secure_installation

# 测试连接
mysql -u root -p
```

### 4. 创建项目数据库

```bash
# 登录 MySQL
mysql -u root -p

# 在 MySQL 中执行
CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'family_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON family_tasks.* TO 'family_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 5. 配置项目权限

```bash
# 进入项目目录
cd /Users/zhangkaishen/Documents/home-list-next

# 给 config 目录写权限
chmod -R 777 config
```

### 6. 启动开发服务器

```bash
# 进入 public 目录
cd public

# 启动 PHP 内置服务器
php -S localhost:8000
```

### 7. 访问安装向导

打开浏览器访问：`http://localhost:8000`

系统会自动跳转到安装向导，填写以下信息：
- 数据库主机：`localhost`
- 数据库端口：`3306`
- 数据库名称：`family_tasks`
- 数据库用户：`family_user`
- 数据库密码：`your_password`

---

## 方案二：MAMP（图形化界面，更简单）

### 1. 下载安装 MAMP

访问：https://www.mamp.info/en/downloads/

下载免费版 MAMP（不需要 PRO 版本）

### 2. 配置 MAMP

1. 启动 MAMP
2. 点击 "Preferences" → "Ports"
   - Apache: 8888
   - MySQL: 8889
3. 点击 "Preferences" → "Web Server"
   - Document Root: 选择你的项目目录

### 3. 移动项目到 MAMP

```bash
# 方式1：移动项目到 MAMP 默认目录
cp -r /Users/zhangkaishen/Documents/home-list-next /Applications/MAMP/htdocs/

# 方式2：在 MAMP 中设置 Document Root 指向你的项目
# Preferences → Web Server → Document Root
# 选择：/Users/zhangkaishen/Documents/home-list-next/public
```

### 4. 创建数据库

1. 启动 MAMP
2. 点击 "Open WebStart page"
3. 点击 "Tools" → "phpMyAdmin"
4. 创建数据库 `family_tasks`

### 5. 访问项目

打开浏览器访问：`http://localhost:8888`

---

## 方案三：Docker（容器化开发）

### 1. 安装 Docker Desktop

访问：https://www.docker.com/products/docker-desktop/

### 2. 使用项目的 Docker 配置

```bash
cd /Users/zhangkaishen/Documents/home-list-next

# 启动服务
docker-compose up -d

# 访问
# http://localhost:8080
```

---

## 开发工作流程

### 启动开发环境

```bash
# Homebrew 方式
cd /Users/zhangkaishen/Documents/home-list-next/public
php -S localhost:8000

# MAMP 方式
# 直接在 MAMP 应用中点击 Start

# Docker 方式
docker-compose up -d
```

### 停止开发环境

```bash
# Homebrew 方式
# Ctrl + C 停止 PHP 服务器

# MAMP 方式
# 点击 Stop 按钮

# Docker 方式
docker-compose down
```

### 查看日志

```bash
# PHP 内置服务器
# 日志直接显示在终端

# MAMP
# 在 MAMP 界面查看日志

# Docker
docker-compose logs -f
```

### 数据库管理

```bash
# 命令行方式
mysql -u root -p

# phpMyAdmin（MAMP 自带）
# http://localhost:8888/phpMyAdmin

# 推荐工具：
# - Sequel Ace（免费）：https://sequel-ace.com/
# - TablePlus（免费/付费）：https://tableplus.com/
```

---

## 常见问题

### Q1: PHP 命令找不到？

```bash
# 检查 PHP 是否在 PATH 中
echo $PATH

# 添加 PHP 到 PATH（Homebrew）
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 或者使用完整路径
/opt/homebrew/bin/php -v
```

### Q2: MySQL 连接被拒绝？

```bash
# 检查 MySQL 是否运行
brew services list

# 重启 MySQL
brew services restart mysql

# 检查端口
lsof -i :3306
```

### Q3: 权限错误？

```bash
# 给 config 目录写权限
chmod -R 777 config

# 如果还有问题，检查目录所有者
ls -la config
chown -R $(whoami) config
```

### Q4: 端口被占用？

```bash
# 检查端口占用
lsof -i :8000

# 使用其他端口
php -S localhost:8080

# 或者杀死占用进程
kill -9 <PID>
```

---

## 推荐配置

### VS Code 扩展

- PHP Intelephense
- PHP Debug
- MySQL（cweijan.vscode-mysql-client2）
- GitLens

### 开发工具

- Postman（API 测试）：https://www.postman.com/
- Sequel Ace（数据库管理）：https://sequel-ace.com/
- iTerm2（终端增强）：https://iterm2.com/

### Git 配置

```bash
# 设置用户信息
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 查看配置
git config --list
```

---

## 下一步

环境配置完成后，你可以：

1. 访问 `http://localhost:8000` 完成安装
2. 开始开发新功能
3. 使用 Git 进行版本控制
4. 部署到生产环境

Happy Coding! 🚀
