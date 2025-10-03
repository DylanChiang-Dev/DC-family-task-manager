# 宝塔面板 / aaPanel 部署指南

本指南详细说明如何在宝塔面板（BT-Panel）或 aaPanel 上部署「家庭任务管理系统」。

## 目录

- [环境要求](#环境要求)
- [安装宝塔面板](#安装宝塔面板)
- [环境配置](#环境配置)
- [部署项目](#部署项目)
- [常见问题](#常见问题)
- [性能优化](#性能优化)

---

## 环境要求

### 服务器要求
- **系统**：CentOS 7+, Ubuntu 18.04+, Debian 9+
- **内存**：至少 1GB（推荐 2GB+）
- **磁盘**：至少 20GB 可用空间
- **网络**：公网 IP 或域名

### 软件要求
- **PHP**：8.1 或更高版本
- **MySQL**：8.0 或更高版本
- **Nginx** 或 **Apache**

---

## 安装宝塔面板

### 方式一：宝塔面板（中国大陆）

```bash
# CentOS 安装命令
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu/Debian 安装命令
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

### 方式二：aaPanel（国际版）

```bash
# CentOS 安装命令
yum install -y wget && wget -O install.sh http://www.aapanel.com/script/install_6.0_en.sh && bash install.sh aapanel

# Ubuntu/Debian 安装命令
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh aapanel
```

安装完成后，记录面板地址、用户名和密码。

---

## 环境配置

### 1. 访问面板

浏览器访问：`http://你的服务器IP:8888`

使用安装时显示的用户名和密码登录。

### 2. 安装软件环境

进入面板后，点击左侧 **软件商店**：

#### 安装 Nginx（推荐）

- 搜索 **Nginx**
- 点击 **安装**
- 选择 **编译安装**（稳定）或 **极速安装**（快速）
- 等待安装完成

#### 安装 PHP 8.1+

- 搜索 **PHP**
- 选择 **PHP 8.1** 或更高版本
- 点击 **安装**
- 勾选以下扩展：
  - ✅ `opcache`（性能优化）
  - ✅ `fileinfo`（文件信息）
  - ✅ `imagemagick` 或 `gd`（图像处理）
  - ✅ 其他默认扩展

**重要**：安装完成后，点击 PHP 版本右侧的 **设置**：

进入 **安装扩展**，确保安装：
- ✅ `pdo_mysql`（必需）
- ✅ `mysqli`（必需）
- ✅ `mbstring`（必需）
- ✅ `json`（必需）

#### 安装 MySQL 8.0+

- 搜索 **MySQL**
- 选择 **MySQL 8.0** 或更高版本
- 点击 **安装**
- 记录 root 密码（安装完成后会显示）

---

## 部署项目

### 方式一：使用 Git 部署（推荐）

#### 1. 安装 Git

进入 **软件商店** → 搜索 **Git** → 点击 **安装**

#### 2. 添加站点

点击左侧 **网站** → **添加站点**

| 字段 | 值 |
|------|------|
| **域名** | 您的域名（如 `task.yourdomain.com`）或 IP 地址 |
| **根目录** | `/www/wwwroot/family-task-manager` |
| **FTP** | 不创建 |
| **数据库** | MySQL（记录数据库名、用户名、密码）|
| **PHP 版本** | 选择 PHP 8.1+ |

点击 **提交**。

#### 3. 克隆项目

点击站点右侧的 **根目录** 进入文件管理器，或使用 SSH：

```bash
# SSH 连接服务器后
cd /www/wwwroot
rm -rf family-task-manager  # 删除宝塔创建的空目录

# 克隆项目
git clone https://github.com/DylanChiang-Dev/family-task-manager.git
cd family-task-manager
```

#### 4. 设置站点运行目录

返回面板 → **网站** → 找到刚才添加的站点 → 点击 **设置**

- 点击 **网站目录**
- **运行目录** 选择 `/public`
- 勾选 **防跨站攻击**
- 点击 **保存**

#### 5. 设置伪静态

在站点设置中，点击 **伪静态**，选择 **laravel5** 或手动添加：

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}

location ~ \.php$ {
    fastcgi_pass unix:/tmp/php-cgi-81.sock;
    fastcgi_index index.php;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

点击 **保存**。

#### 6. 设置文件权限

在文件管理器或 SSH 中：

```bash
cd /www/wwwroot/family-task-manager

# 设置 config 目录权限（安装时需要可写）
chmod -R 777 config/

# 设置所有者为 www
chown -R www:www /www/wwwroot/family-task-manager
```

#### 7. 配置 SSL（可选但推荐）

在站点设置中，点击 **SSL** → **Let's Encrypt** → 勾选您的域名 → 点击 **申请**

等待证书申请成功，勾选 **强制 HTTPS**。

#### 8. 访问安装向导

浏览器访问您的域名或 IP，按照安装向导完成设置：

**步骤 1**：环境检查（自动）

**步骤 2**：数据库配置
- 主机：`localhost` 或 `127.0.0.1`
- 端口：`3306`
- 数据库名：刚才创建站点时的数据库名
- 用户名：数据库用户名
- 密码：数据库密码

**步骤 3**：创建管理员账号

**步骤 4**：完成！

#### 9. 安装后安全加固

```bash
cd /www/wwwroot/family-task-manager

# 删除安装目录（重要！）
rm -rf install/

# 设置 config 目录为只读
chmod -R 755 config/
```

---

### 方式二：上传 ZIP 文件部署

#### 1. 下载项目

访问 GitHub Release 页面下载最新版本 ZIP 文件：
```
https://github.com/DylanChiang-Dev/family-task-manager/releases
```

#### 2. 添加站点

同方式一的步骤 2。

#### 3. 上传文件

- 进入站点根目录文件管理器
- 删除宝塔自动创建的文件
- 点击 **上传** → 选择 ZIP 文件
- 上传完成后，右键点击 ZIP 文件 → **解压**
- 将解压后的文件移动到站点根目录

#### 4-9. 后续步骤

同方式一的步骤 4-9。

---

## 常见问题

### 1. 访问站点显示 404

**原因**：运行目录未设置为 `/public`

**解决**：
- 网站设置 → 网站目录 → 运行目录选择 `/public`

### 2. 数据库连接失败

**检查项**：
1. 数据库是否创建成功
2. 数据库用户名密码是否正确
3. MySQL 服务是否运行：
   ```bash
   # 宝塔面板：软件商店 → MySQL → 服务状态
   ```

### 3. config 目录无写权限

```bash
chmod -R 777 /www/wwwroot/family-task-manager/config/
```

### 4. PHP 扩展缺失

**错误信息**：`PDO extension not found`

**解决**：
- 软件商店 → PHP 8.1 → 设置 → 安装扩展 → 安装 `pdo_mysql`

### 5. 中文字符乱码

**解决**：

进入 phpMyAdmin（面板左侧 → 数据库 → phpMyAdmin）：

```sql
ALTER DATABASE 数据库名 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 6. 系统更新失败

**原因**：未使用 Git 部署

**解决**：
- 使用 Git 方式重新部署
- 或手动下载新版本 ZIP 上传

### 7. 访问速度慢

**优化**：
1. 启用 **PHP OPcache**
2. 启用 Nginx **Gzip 压缩**
3. 配置 **CDN**（如果有域名）

---

## 性能优化

### 1. 启用 OPcache

软件商店 → PHP 8.1 → 设置 → 配置修改 → 找到 `opcache` 区块：

```ini
[opcache]
opcache.enable=1
opcache.memory_consumption=128
opcache.interned_strings_buffer=8
opcache.max_accelerated_files=10000
opcache.revalidate_freq=60
opcache.fast_shutdown=1
```

保存后重启 PHP。

### 2. 启用 Nginx Gzip

网站设置 → 配置文件 → 在 `http` 区块添加：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml text/x-component text/x-js;
```

### 3. 配置浏览器缓存

网站设置 → 配置文件 → 在 `server` 区块添加：

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 365d;
    add_header Cache-Control "public, immutable";
}
```

### 4. 优化 MySQL

软件商店 → MySQL → 性能调整 → 根据服务器内存选择优化方案。

### 5. 定时任务备份

面板 → 计划任务 → 添加任务：

**任务类型**：Shell 脚本
**任务名称**：备份家庭任务管理系统数据库
**执行周期**：每天 02:00
**脚本内容**：

```bash
#!/bin/bash
# 数据库信息
DB_NAME="你的数据库名"
DB_USER="你的数据库用户名"
DB_PASS="你的数据库密码"
BACKUP_DIR="/www/backup/family-task-manager"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u$DB_USER -p$DB_PASS --default-character-set=utf8mb4 $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# 删除 30 天前的备份
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete

echo "备份完成: backup_$DATE.sql"
```

---

## 使用系统更新功能

项目部署完成后，可以通过 Web 界面更新：

1. 登录系统
2. 点击 **设置** → **个人设置**
3. 滚动到 **系统更新** 区域
4. 点击 **检查更新**
5. 如有新版本，点击 **立即更新**

**要求**：必须使用 Git 方式部署。

或通过 SSH 手动更新：

```bash
cd /www/wwwroot/family-task-manager
bash update.sh
```

---

## 安全建议

### 1. 修改宝塔面板默认端口

面板设置 → 安全 → 面板端口（改为非 8888）

### 2. 绑定域名访问面板

面板设置 → 安全 → 授权IP → 绑定域名

### 3. 开启防火墙

面板 → 安全 → 防火墙 → 开启

**开放端口**：
- 80（HTTP）
- 443（HTTPS）
- 22（SSH，注意限制 IP）
- 宝塔面板端口

### 4. 定期更新

- 定期更新宝塔面板
- 定期更新 PHP、MySQL、Nginx
- 定期备份数据

### 5. 使用 SSL 证书

强烈建议为生产环境配置 HTTPS。

---

## 监控和日志

### 查看 PHP 错误日志

网站设置 → 日志 → PHP 错误日志

### 查看访问日志

网站设置 → 日志 → 访问日志

### 查看 MySQL 慢查询

软件商店 → MySQL → 设置 → 性能调整 → 慢日志

---

## 卸载

如需卸载：

```bash
# 删除网站文件
rm -rf /www/wwwroot/family-task-manager

# 在面板中删除站点和数据库
# 面板 → 网站 → 删除
# 面板 → 数据库 → 删除
```

---

## 参考资源

- [宝塔面板官网](https://www.bt.cn/)
- [aaPanel 官网](https://www.aapanel.com/)
- [宝塔面板文档](https://www.bt.cn/bbs/forum-39-1.html)

---

需要帮助？

- 📖 查看 [README.md](README.md)
- 🐛 提交 [Issue](https://github.com/DylanChiang-Dev/family-task-manager/issues)
- 💬 参与 [Discussions](https://github.com/DylanChiang-Dev/family-task-manager/discussions)
