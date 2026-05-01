# Nginx 配置指南

Nginx 是一款高性能的 Web 服务器和反向代理服务器，广泛应用于现代 Web 架构中。

## 目录

- [核心作用](#核心作用)
- [配置文件结构](#配置文件结构)
- [基础配置](#基础配置)
- [反向代理](#反向代理)
- [HTTPS 配置](#https-配置)
- [性能优化](#性能优化)
- [高级配置](#高级配置)
- [常用命令](#常用命令)
- [最佳实践](#最佳实践)
- [生产级配置模板](#生产级配置模板)

## 核心作用

Nginx 对前端项目的主要作用：

| 作用 | 说明 |
|------|------|
| **托管静态资源** | 直接把 HTML/CSS/JS/图片等文件返回给浏览器 |
| **路由与历史模式支持** | 配合前端路由（Vue Router、React Router 的 `history` 模式），将所有非静态文件请求指向 `index.html` |
| **反向代理** | 把 `/api/xxx` 请求转发给后端真实服务，解决跨域问题 |
| **负载均衡** | 当有多个后端实例时，把请求分发给不同的服务器 |
| **缓存与性能优化** | 缓存后端响应、开启 Gzip/Brotli 压缩、添加静态资源强缓存 |
| **SSL/TLS 终止** | 配置 HTTPS 证书，对外提供安全的加密连接 |
| **访问控制与限流** | 限制 IP 访问频率、添加白名单、防止简单 DDoS 攻击 |

## 配置文件结构

Nginx 配置文件通常位于 `/etc/nginx/nginx.conf`，采用层级化结构：

```nginx
# 全局配置
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    # 事件驱动配置
    worker_connections 1024;
    use epoll;
}

http {
    # HTTP相关配置
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request"';
    access_log /var/log/nginx/access.log main;
    
    # 性能优化
    sendfile on;
    tcp_nopush on;
    keepalive_timeout 65;
    
    # 包含其他配置文件
    include /etc/nginx/conf.d/*.conf;
}
```

## 基础配置

### Server 块配置（虚拟主机）

```nginx
server {
    listen 80;                          # 监听端口
    server_name example.com www.example.com;  # 域名
    
    root /usr/share/nginx/html;         # 网站根目录
    index index.html index.htm;         # 默认首页
    
    location / {
        try_files $uri $uri/ /index.html;  # SPA路由支持
    }
}
```

### 最基础：提供静态文件

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/my-project/dist;   # 打包后的根目录
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # 支持 history 模式
    }
}
```

- **root**：静态文件的根目录
- **try_files**：尝试按顺序寻找文件，如果都找不到就 fallback 到 `index.html`（解决前端路由刷新 404）

`try_files` 的执行逻辑：
```
请求 /user/list
  → 先找 /usr/share/nginx/html/user/list      (文件)
  → 再找 /usr/share/nginx/html/user/list/     (目录)
  → 都找不到，返回 /index.html                 (前端路由接管)
```

> **这是前端开发者最核心的一条 Nginx 配置，几乎所有 SPA 项目都离不开它。**

## 反向代理

### 基本反向代理配置

```nginx
server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://backend_servers;  # 后端服务器地址
        
        # 传递请求头信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

### 代理 API 请求（解决跨域、隐藏后端）

```nginx
location /api/ {
    proxy_pass http://localhost:3000/;   # 去掉 /api/ 前缀转发
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    # 如果需要 WebSocket
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

#### proxy_pass 中斜杠的区别（高频踩坑点）

| 写法 | 请求 `/api/user` 实际转发到 |
|---|---|
| `proxy_pass http://backend:8080/` | `http://backend:8080/user`（去掉了 `/api` 前缀） |
| `proxy_pass http://backend:8080` | `http://backend:8080/api/user`（保留了 `/api` 前缀） |

> 末尾多一个 `/`，行为完全不同。这是新手最常踩的坑。

### 负载均衡配置

```nginx
# 定义后端服务器组
upstream backend {
    # 负载均衡算法（可选）
    least_conn;      # 最少连接
    # ip_hash;       # IP哈希（会话保持）
    # fair;          # 响应时间策略
    
    # 后端服务器列表
    server 192.168.1.101:8080 weight=3 max_fails=3 fail_timeout=30s;
    server 192.168.1.102:8080 weight=2 max_fails=2 fail_timeout=30s;
    server 192.168.1.103:8080 backup;  # 备用服务器
}

server {
    listen 80;
    server_name www.example.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
    }
}
```

### WebSocket 代理

开发时 Vite/Webpack 的 HMR 需要 WebSocket，线上如果有 WebSocket 需求也需要配置：

```nginx
location /ws/ {
    proxy_pass http://127.0.0.1:8080/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade    $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host       $host;
}
```

## HTTPS 配置

### HTTP 强制跳转 HTTPS

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

### HTTPS 服务器配置

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;
    
    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/example.crt;
    ssl_certificate_key /etc/nginx/ssl/example.key;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:HIGH:!aNULL:!MD5:!RC4:!DHE;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS（告诉浏览器以后都用 HTTPS 访问）
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
    }
}
```

> **Let's Encrypt 免费证书**：生产环境推荐用 `certbot` 自动申请和续期，非常方便。

## 性能优化

### Gzip 压缩

减少传输体积，提升加载速度：

```nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;          # 小于 1KB 的不压缩
gzip_comp_level 5;             # 压缩级别 1~9，推荐 5~6（性能和压缩率的平衡点）
gzip_types
    text/plain
    text/css
    text/javascript
    application/json
    application/javascript
    application/xml
    image/svg+xml
    font/woff2;
gzip_proxied any;
```

> **注意**：图片（jpg/png/gif）本身已经是压缩格式，Gzip 对它们几乎无效，不用加。

### 静态资源缓存配置

```nginx
# 带 hash 的静态资源（JS/CSS/图片/字体）→ 长期强缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|ttf|eot)$ {
    root   /usr/share/nginx/html;
    expires 1y;
    add_header Cache-Control "public, immutable";
    access_log off;                    # 静态资源不需要记访问日志
}

# HTML 入口文件 → 不缓存，确保每次拿到最新的
location = /index.html {
    add_header Cache-Control "no-cache";
}
```

**为什么这样分**：

```
index.html          →  no-cache（每次都向服务器确认最新版本）
app.a3b8c2.js       →  expires 1y（文件名带 hash，内容变了文件名就变了，可以放心长期缓存）
logo.png            →  expires 1y（同理）
```

这是**构建工具（Webpack/Vite）和 Nginx 配合的经典模式**。

### 动静分离配置

```nginx
# 静态资源由Nginx直接处理
location /static/ {
    alias /var/www/static/;
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 动态请求转发到后端
location /api/ {
    proxy_pass http://backend;
    proxy_set_header Host $host;
}
```

## 高级配置

### 限流配置

```nginx
# 定义限流区域
limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;

server {
    location /login/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://backend;
    }
    
    # 连接数限制
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    location /download/ {
        limit_conn addr 10;
        limit_rate 500k;
    }
}
```

### 跨域配置

如果后端允许，可以在 Nginx 层直接添加 CORS 头：

```nginx
location /api/ {
    # 处理 CORS
    add_header Access-Control-Allow-Origin      $http_origin always;
    add_header Access-Control-Allow-Methods     "GET, POST, PUT, DELETE, PATCH, OPTIONS" always;
    add_header Access-Control-Allow-Headers     "Content-Type, Authorization, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials true always;

    # 预检请求直接返回 204
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    proxy_pass http://127.0.0.1:8080/;
}
```

> 能用 `proxy_pass` 反向代理解决跨域的，优先用代理，比手动加 CORS 头更可靠。

### 多项目部署

一台服务器部署多个前端项目是常见需求：

```nginx
server {
    listen 80;
    server_name example.com;

    # 项目 A：主站
    location / {
        root /var/www/project-a/dist;
        try_files $uri $uri/ /index.html;
    }

    # 项目 B：后台管理（子路径部署）
    location /admin/ {
        alias /var/www/project-b/dist/;       # alias 末尾必须有 /
        try_files $uri $uri/ /admin/index.html;
    }
}
```

#### `root` vs `alias` 的区别

```
# root：拼接完整路径
location /admin/ {
    root /var/www;
}
→ 请求 /admin/user → 查找 /var/www/admin/user

# alias：替换匹配路径
location /admin/ {
    alias /var/www/project-b/dist/;
}
→ 请求 /admin/user → 查找 /var/www/project-b/dist/user
```

> 子路径部署时，前端项目还需要配置 `publicPath` 或 `base`：
> - Vue：`vue.config.js` 中设置 `publicPath: '/admin/'`
> - Vite：`vite.config.ts` 中设置 `base: '/admin/'`

### location 匹配规则（理解优先级）

```nginx
# 精确匹配（优先级最高）
location = /index.html { ... }

# 前缀匹配（停止搜索正则）
location ^~ /static/ { ... }

# 正则匹配（按顺序，第一个匹配的生效）
location ~* \.(js|css|png)$ { ... }

# 普通前缀匹配（最长前缀优先）
location /api/ { ... }

# 兜底
location / { ... }
```

匹配优先级排序：
```
= 精确匹配 > ^~ 前缀匹配 > ~* 正则匹配 > 普通前缀匹配 > / 通用匹配
```

## 常用命令

```bash
# 测试配置文件语法（每次改完配置先执行这个）
nginx -t

# 重新加载配置（热重载，不停服）
nginx -s reload

# 停止Nginx
nginx -s stop

# 重启Nginx服务
systemctl restart nginx

# 查看Nginx版本和编译参数
nginx -V

# 查看Nginx进程
ps aux | grep nginx

# 查看访问日志
tail -f /var/log/nginx/access.log

# 查看错误日志
tail -f /var/log/nginx/error.log
```

## 最佳实践

1. **配置模块化**：将不同功能的配置拆分到单独文件中，通过 `include` 指令引入
2. **安全加固**：定期更新 Nginx 版本，禁用不必要模块，配置适当的安全头部
3. **性能监控**：启用访问日志和错误日志，定期分析性能指标
4. **备份配置**：修改配置文件前务必备份，避免配置错误导致服务中断
5. **渐进式部署**：使用灰度发布策略，逐步将流量切换到新版本

## 生产级配置模板

把以上所有知识点整合在一起：

```nginx
# HTTP → HTTPS 跳转
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL
    ssl_certificate     /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 5;
    gzip_types text/plain text/css text/javascript application/json
               application/javascript application/xml image/svg+xml font/woff2;

    root /usr/share/nginx/html;

    # 反向代理 API
    location /api/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 带 hash 的静态资源 → 长期缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # HTML 入口 → 不缓存
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # SPA 路由兜底
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 优先级总结

| 优先级 | 知识点 | 使用场景 |
|---|---|---|
| **P0 必会** | `try_files` SPA 路由回退 | 每个 SPA 项目 |
| **P0 必会** | `proxy_pass` 反向代理 | 前后端分离 |
| **P0 必会** | `nginx -t` / `nginx -s reload` | 每次改配置 |
| **P0 必会** | `proxy_pass` 斜杠区别 | 排查转发路径问题 |
| **P1 重要** | Gzip 压缩配置 | 性能优化 |
| **P1 重要** | 静态资源缓存策略 | 性能优化 |
| **P1 重要** | HTTPS + SSL 配置 | 线上部署 |
| **P1 重要** | location 匹配规则 | 理解配置生效逻辑 |
| **P2 了解** | WebSocket 代理 | HMR / 实时通信 |
| **P2 了解** | 多项目部署（root vs alias） | 一机多站 |
| **P2 了解** | CORS 跨域头 | 无法用代理时 |
| **P2 了解** | 负载均衡（upstream） | 高流量场景 |

掌握 P0 和 P1 的内容，就能独立完成前端项目的线上部署和日常运维了。
