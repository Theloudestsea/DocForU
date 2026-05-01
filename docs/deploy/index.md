# 部署相关文档

本目录包含前端项目部署相关的文档和指南。

## 目录结构

- [Nginx 配置指南](./nginx.md) - Nginx 常用配置、反向代理、负载均衡等
- [Linux 常用命令](./linux.md) - 运维和开发常用的 Linux 命令
- [部署流程](./workflow.md) - 前端项目完整部署流程详解
- [常用配置备份](./config-backup.md) - 生产环境 Nginx 配置备份

## 快速开始

### 1. 本地构建

```bash
npm run build
```

### 2. 上传到服务器

```bash
scp -r dist/* user@server:/var/www/myapp/
```

### 3. 配置 Nginx

参考 [Nginx 配置指南](./nginx.md) 配置静态文件服务和反向代理。

### 4. 测试并重载

```bash
nginx -t          # 测试配置
nginx -s reload   # 重载配置
```

## 相关资源

- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Let's Encrypt 免费 SSL 证书](https://letsencrypt.org/)
- [GitHub Actions 自动部署](https://docs.github.com/en/actions)
