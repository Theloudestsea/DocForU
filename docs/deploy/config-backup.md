# 常用配置备份

以下是一个生产环境的 Nginx 配置备份，可作为参考模板。

## 完整配置示例

```nginx
user  nginx;
worker_processes  auto;

error_log  "/applog/nginxlogs/error.log";

pid  logs/nginx.pid;
worker_rlimit_nofile 10240;

events {
    use epoll;
    worker_connections  10240;
}


http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"'
                      '$request_body';



    log_format  timed_combined  '$remote_addr - $remote_user [$time_local] "$request" '
                          '$status $body_bytes_sent "$http_referer" '
                          '"$http_user_agent" "$http_x_forwarded_for" '
                          '$request_time $upstream_response_time';


    access_log  "/applog/nginxlogs/access.log"  main;

    server_tokens  off;

    server_names_hash_bucket_size 128;
    client_header_buffer_size 32k;
    large_client_header_buffers 4 32k;
    client_max_body_size 128m;
    client_body_buffer_size 8m;
    client_body_temp_path /tmp/nginx/ 1 2;

    sendfile        on;
    tcp_nopush     on;

    keepalive_timeout  65;
    tcp_nodelay on;
    fastcgi_connect_timeout 300;
    fastcgi_send_timeout 300;
    fastcgi_read_timeout 300;
    fastcgi_buffer_size 64k;
    fastcgi_buffers 4 64k;
    fastcgi_busy_buffers_size 128k;
    fastcgi_temp_file_write_size 128k;

    gzip  on;
    gzip_min_length 1k;
    gzip_buffers 4 16k;
    gzip_http_version 1.0;
    gzip_comp_level 2;
    gzip_types text/plain application/javascript application/x-javascript text/css application/xml;
    gzip_vary on;

    proxy_next_upstream http_502 http_504 http_404 error timeout invalid_header;
    ## 管理端
    server {
        listen       9900;
        if ($time_iso8601 ~ "^(\d{4})-(\d{2})-(\d{2})") {
            set $year $1;
            set $month $2;
            set $day $3;
        } 
        ## 前端静态资源
        ## 对接UAMP，仅配置前端资源
        ## 管理端
        location /cbps2g-ui/ {
            alias /app/cbps2g-ui/;
            access_log /applog/nginxlogs/cbps2g-ui/access.log.$year$month$day timed_combined;
        }
    }
    server {
        listen       9901;
        if ($time_iso8601 ~ "^(\d{4})-(\d{2})-(\d{2})") {
            set $year $1;
            set $month $2;
            set $day $3;
        } 
        ## 前端静态资源
        ## 对接UAMP，仅配置前端资源
        ## 辅助生产
        location /cbpseps-ui/ {
            alias /app/cbpseps-ui/;
            access_log /applog/nginxlogs/cbpseps-ui/access.log.$year$month$day timed_combined;
        }
    }
}

```

## 配置说明

### 全局配置

- `worker_processes auto` - 自动设置工作进程数
- `worker_rlimit_nofile 10240` - 最大文件描述符数量
- `worker_connections 10240` - 每个进程的最大连接数

### 日志配置

- 使用 `main` 格式记录访问日志
- 使用 `timed_combined` 格式记录带响应时间的日志
- 按日期分割日志文件

### 性能优化

- `sendfile on` - 启用高效文件传输
- `tcp_nopush on` - 优化 TCP 包发送
- `keepalive_timeout 65` - 保持连接超时时间
- `gzip on` - 启用 Gzip 压缩

### 安全配置

- `server_tokens off` - 隐藏 Nginx 版本号
- `client_max_body_size 128m` - 最大请求体大小
