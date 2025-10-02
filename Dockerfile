FROM php:8.1-fpm-alpine

# 安装依赖
RUN apk add --no-cache \
    mysql-client \
    && docker-php-ext-install pdo pdo_mysql

# 设置工作目录
WORKDIR /var/www/html

# 复制项目文件
COPY . /var/www/html

# 设置权限
RUN chmod -R 755 /var/www/html \
    && chmod -R 777 /var/www/html/config

EXPOSE 9000

CMD ["php-fpm"]
