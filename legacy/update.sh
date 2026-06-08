#!/bin/bash

# 家庭任務管理系統 - 更新腳本
# 使用方法: bash update.sh

echo "=========================================="
echo "家庭任務管理系統 - 自動更新"
echo "=========================================="
echo ""

# 檢查是否為 Git 倉庫
if [ ! -d ".git" ]; then
  echo "❌ 錯誤: 當前目錄不是 Git 倉庫"
  echo "請使用 Git 部署項目後再執行更新"
  exit 1
fi

# 檢查 Git 是否安裝
if ! command -v git &> /dev/null; then
    echo "❌ 錯誤: Git 未安裝"
    echo "請先安裝 Git: apt install git 或 yum install git"
    exit 1
fi

echo "📦 正在檢查更新..."
echo ""

# 添加安全目錄配置
git config --global --add safe.directory $(pwd)

# 獲取當前分支
current_branch=$(git rev-parse --abbrev-ref HEAD)
echo "當前分支: $current_branch"

# 獲取當前版本信息
current_commit=$(git rev-parse HEAD)
echo "當前版本: ${current_commit:0:7}"
echo ""

# 獲取遠程更新
echo "🔄 正在獲取遠程更新..."
git fetch --all

# 檢查是否有新版本
remote_commit=$(git rev-parse origin/$current_branch)
if [ "$current_commit" = "$remote_commit" ]; then
    echo "✅ 已是最新版本，無需更新"
    exit 0
fi

echo "發現新版本: ${remote_commit:0:7}"
echo ""

# 備份配置文件
echo "💾 正在備份配置文件..."
if [ -f "config/database.php" ]; then
    cp config/database.php config/database.php.backup
    echo "已備份: config/database.php"
fi
if [ -f "config/config.php" ]; then
    cp config/config.php config/config.php.backup
    echo "已備份: config/config.php"
fi
if [ -f "config/installed.lock" ]; then
    cp config/installed.lock config/installed.lock.backup
    echo "已備份: config/installed.lock"
fi
echo ""

# 拉取最新代碼
echo "⬇️  正在拉取最新代碼..."
git reset --hard origin/$current_branch
git pull origin $current_branch

if [ $? -ne 0 ]; then
    echo "❌ 更新失敗，正在恢復備份..."
    if [ -f "config/database.php.backup" ]; then
        cp config/database.php.backup config/database.php
    fi
    if [ -f "config/config.php.backup" ]; then
        cp config/config.php.backup config/config.php
    fi
    if [ -f "config/installed.lock.backup" ]; then
        cp config/installed.lock.backup config/installed.lock
    fi
    exit 1
fi
echo ""

# 恢復配置文件
echo "🔧 正在恢復配置文件..."
if [ -f "config/database.php.backup" ]; then
    cp config/database.php.backup config/database.php
    echo "已恢復: config/database.php"
fi
if [ -f "config/config.php.backup" ]; then
    cp config/config.php.backup config/config.php
    echo "已恢復: config/config.php"
fi
if [ -f "config/installed.lock.backup" ]; then
    cp config/installed.lock.backup config/installed.lock
    echo "已恢復: config/installed.lock"
fi
echo ""

# 清理備份文件
rm -f config/*.backup

# 執行數據庫遷移
echo "🗄️  正在檢查數據庫遷移..."
if [ -f "scripts/migrate.php" ]; then
    # 檢查是否有待執行的遷移
    migration_output=$(php scripts/migrate.php --status 2>&1)
    pending_count=$(echo "$migration_output" | grep -oP '待執行: \K\d+' || echo "0")

    if [ "$pending_count" -gt 0 ]; then
        echo "發現 $pending_count 個待執行的數據庫遷移"
        echo ""

        # 執行遷移
        php scripts/migrate.php

        if [ $? -eq 0 ]; then
            echo "✅ 數據庫遷移執行成功"
        else
            echo "❌ 數據庫遷移執行失敗"
            echo "請檢查錯誤信息並手動執行: php scripts/migrate.php"
        fi
    else
        echo "✅ 數據庫已是最新版本，無需遷移"
    fi
else
    echo "⚠️  未找到遷移腳本，跳過數據庫遷移"
fi
echo ""

# 設置文件權限（寶塔面板）
if [ -f "/etc/init.d/bt" ]; then
    echo "🔐 正在設置文件權限（寶塔面板）..."
    chown -R www:www $(pwd)
    chmod -R 755 $(pwd)
    chmod -R 777 config
    echo "權限設置完成"
    echo ""
fi

# 顯示更新日誌
echo "📝 更新日誌:"
echo "----------------------------------------"
git log --oneline --no-merges $current_commit..$remote_commit | head -n 10
echo "----------------------------------------"
echo ""

echo "✅ 更新完成！"
echo "當前版本: $(git rev-parse --short HEAD)"
echo ""
echo "注意事項:"
echo "1. 如有數據庫結構變更，請手動執行遷移腳本"
echo "2. 建議清除瀏覽器緩存後重新訪問"
echo "3. 如遇問題，請查看更新日誌或聯繫開發者"
echo ""
