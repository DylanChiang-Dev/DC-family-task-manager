# 本地开发快速指南

## 🚀 三种方式启动本地开发环境

### 方式一：Docker（最简单，推荐）⭐

**一键启动完整环境（PHP + MySQL + Nginx + phpMyAdmin）**

```bash
# 1. 确保已安装 Docker Desktop
# Mac: https://www.docker.com/products/docker-desktop/

# 2. 启动所有服务
docker-compose up -d

# 3. 查看运行状态
docker-compose ps

# 4. 访问服务
# - 主应用：http://localhost:8080
# - phpMyAdmin：http://localhost:8081（root/root）

# 5. 查看日志
docker-compose logs -f

# 6. 停止服务
docker-compose down

# 7. 重启服务
docker-compose restart
```

**数据库连接信息（安装向导填写）：**
- 主机：`db`
- 端口：`3306`
- 数据库：`family_tasks`
- 用户：`family_user`
- 密码：`family_pass`

---

### 方式二：PHP 内置服务器

**需要先安装 PHP 和 MySQL**

#### Mac 安装 PHP + MySQL

```bash
# 1. 安装 Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 安装 PHP
brew install php@8.1

# 3. 安装 MySQL
brew install mysql

# 4. 启动 MySQL
brew services start mysql

# 5. 创建数据库
mysql -u root -p -e "CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

#### 启动开发服务器

```bash
# 1. 进入项目目录
cd /Users/zhangkaishen/Documents/home-list-next

# 2. 设置权限
chmod -R 777 config

# 3. 启动 PHP 服务器
cd public
php -S localhost:8000

# 4. 访问
# http://localhost:8000
```

**数据库连接信息：**
- 主机：`localhost`
- 端口：`3306`
- 数据库：`family_tasks`
- 用户：`root`
- 密码：（你设置的密码）

---

### 方式三：MAMP（图形化界面）

```bash
# 1. 下载安装 MAMP
# https://www.mamp.info/en/downloads/

# 2. 启动 MAMP

# 3. 移动项目到 MAMP
cp -r . /Applications/MAMP/htdocs/family-tasks

# 或者在 MAMP 中设置 Document Root 为：
# /Users/zhangkaishen/Documents/home-list-next/public

# 4. 在 phpMyAdmin 中创建数据库 family_tasks

# 5. 访问
# http://localhost:8888
```

---

## 📝 开发工作流

### 初始化项目

```bash
# 克隆项目（如果还没有）
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager

# Docker 方式
docker-compose up -d

# 或 PHP 内置服务器方式
cd public && php -S localhost:8000
```

### 代码修改

1. 修改代码
2. 刷新浏览器查看效果
3. 提交到 Git

```bash
git add .
git commit -m "描述你的修改"
git push
```

### 数据库操作

```bash
# Docker 环境 - 进入 MySQL 容器
docker-compose exec db mysql -u family_user -pfamily_pass family_tasks

# 本地 MySQL
mysql -u root -p family_tasks

# 或使用 phpMyAdmin
# Docker: http://localhost:8081
# MAMP: http://localhost:8888/phpMyAdmin
```

### 查看日志

```bash
# Docker
docker-compose logs -f web

# PHP 内置服务器
# 日志直接显示在终端

# 查看 MySQL 日志
docker-compose logs -f db
```

### 重置数据库

```bash
# Docker 环境
docker-compose exec db mysql -u root -proot -e "DROP DATABASE family_tasks; CREATE DATABASE family_tasks CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 删除安装锁，重新安装
rm config/installed.lock
rm config/database.php
rm config/config.php
```

---

## 🛠 常用命令

### Docker 命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec web sh
docker-compose exec db mysql -u root -proot

# 重建容器
docker-compose up -d --build

# 清理数据（包括数据库）
docker-compose down -v
```

### Git 命令

```bash
# 查看状态
git status

# 添加文件
git add .

# 提交
git commit -m "message"

# 推送
git push

# 拉取最新代码
git pull

# 查看分支
git branch

# 切换分支
git checkout -b feature-name
```

---

## 🐛 常见问题

### Q1: Docker 端口被占用？

```bash
# 修改 docker-compose.yml 中的端口
ports:
  - "8090:80"  # 改成其他端口
```

### Q2: 权限错误？

```bash
chmod -R 777 config
```

### Q3: Docker 数据库连接失败？

主机名要填 `db`，不是 `localhost`！

### Q4: PHP 命令找不到？

```bash
# 添加到 PATH
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Q5: MySQL 无法启动？

```bash
# 检查是否已在运行
brew services list

# 重启
brew services restart mysql
```

---

## 📚 推荐工具

### 编辑器
- **VS Code**（推荐）：https://code.visualstudio.com/
  - 扩展：PHP Intelephense、MySQL、GitLens

### 数据库管理
- **Sequel Ace**（免费）：https://sequel-ace.com/
- **TablePlus**：https://tableplus.com/
- **phpMyAdmin**（Docker 自带）：http://localhost:8081

### API 测试
- **Postman**：https://www.postman.com/
- **Insomnia**：https://insomnia.rest/

### 终端
- **iTerm2**（Mac）：https://iterm2.com/
- **Oh My Zsh**：https://ohmyz.sh/

---

## 📖 进阶开发

### 添加新功能

1. 创建新分支
```bash
git checkout -b feature-new-feature
```

2. 编写代码

3. 测试功能

4. 提交代码
```bash
git add .
git commit -m "Add: 新功能描述"
git push origin feature-new-feature
```

### 代码结构

```
api/          - RESTful API 接口
config/       - 配置文件
database/     - 数据库脚本
install/      - 安装向导
public/       - 前端资源
  css/        - 样式
  js/         - JavaScript
  index.php   - 入口文件
```

### 开发规范

- API 使用 RESTful 风格
- 数据库使用 PDO 预编译语句
- 前端使用原生 JavaScript（无框架）
- 代码提交前测试功能

---

## 🎯 下一步

1. ✅ 配置好开发环境
2. ✅ 完成系统安装
3. 📝 开始开发新功能
4. 🚀 部署到生产环境

Happy Coding! 🎉
