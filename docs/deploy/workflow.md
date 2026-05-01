# 前端部署流程详解

前端部署是将开发完成的代码发布到服务器上，让用户能够访问的过程。

## 通俗比喻：送快递

把前端部署想象成**寄快递**：

| 步骤 | 快递比喻 | 前端部署 |
|------|----------|----------|
| 1. 打包 | 把东西装进箱子 | `npm run build`，生成 `dist/` |
| 2. 贴标签 | 写地址 | 配置 CDN 路径、环境变量 |
| 3. 运输 | 快递员取件 | 上传到服务器 / CDN |
| 4. 签收 | 收件人拿到包裹 | 用户浏览器访问到新版本 |

## 完整部署流程

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│ 1.开发  │ → │ 2.构建   │ → │ 3.测试    │ → │ 4.上传   │ → │ 5.发布   │
│  coding │    │  build   │    │   test    │    │  upload  │    │ release  │
└─────────┘    └──────────┘    └───────────┘    └──────────┘    └──────────┘
```

### 第 1 步：代码开发

在本地写好代码，推送到 Git 仓库（GitHub / GitLab 等）。

```bash
git add .
git commit -m "完成登录页面"
git push origin main
```

### 第 2 步：构建打包

把源代码「编译」成浏览器能高效运行的文件。

```bash
npm run build   # Vite / Webpack 构建
```

构建后生成的内容类似：

```
dist/
├── index.html          # 入口页面（通常只有几百字节）
├── assets/
│   ├── index-abc123.js   # 打包后的 JS（压缩、混淆）
│   ├── vendor-def456.js  # 第三方库（React/Vue等）
│   └── style-ghi789.css  # 打包后的 CSS
└── favicon.ico
```

**构建过程做了什么？**

```typescript
// 源代码（开发时写的）
import { useState } from 'react';
import { Button } from './components/Button';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>点击了 {count} 次</Button>;
}

// ↓ ↓ ↓ 构建后（简化示意）↓ ↓ ↓

// 1. Tree Shaking - 移除没用到的代码
// 2. 压缩混淆 - 变量名变短，去掉空格注释
// 3. 代码分割 - 拆成多个小文件按需加载
// 4. 注入哈希 - 文件名带指纹，方便缓存
```

### 第 3 步：测试验证

在本地预览构建结果，确保没问题：

```bash
npm run preview   # Vite 提供的本地预览命令
```

这个阶段也可以用 **CI/CD**（持续集成/持续部署）自动跑测试。

### 第 4 步：上传到服务器

把 `dist/` 目录上传到 Web 服务器。常见方式：

| 方式 | 工具 | 适用场景 |
|------|------|----------|
| 手动 FTP | FileZilla | 老式、小项目 |
| SCP 上传 | `scp -r dist/* user@server:/www/` | 自有服务器 |
| 对象存储 | 阿里云 OSS、腾讯云 COS、AWS S3 | 配合 CDN |
| CI/CD 自动 | GitHub Actions、Jenkins | 现代主流 |

### 第 5 步：发布上线

用户通过域名访问。典型架构：

```
用户浏览器
    │
    ▼
DNS 解析（域名 → IP）
    │
    ▼
CDN（内容分发网络）
    │
    ▼
Nginx / 静态资源服务器
    │
    ▼
返回 index.html + JS/CSS 文件
```

## 现代 CI/CD 自动化流程

以 **GitHub Actions** 为例，push 代码后自动部署：

```yaml
# .github/workflows/deploy.yml
name: 部署到生产环境

on:
  push:
    branches: [main]  # main 分支推送时触发

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. 拉代码
      - uses: actions/checkout@v4

      # 2. 装依赖
      - run: npm ci

      # 3. 跑测试
      - run: npm test

      # 4. 构建
      - run: npm run build

      # 5. 上传到阿里云 OSS（举例）
      - uses: manyuanrong/setup-ossutil@v3
      - run: ossutil cp -rf dist/ oss://my-bucket/
```

## 关键概念

### 1. 环境变量

不同环境用不同配置：

```typescript
// .env.development
VITE_API_BASE = "http://localhost:3000/api"

// .env.production
VITE_API_BASE = "https://api.myapp.com/v1"
```

构建时自动替换，生产环境就连接正式的 API 地址。

### 2. 缓存策略

文件名带哈希就是为了**永久缓存**：

```
index.html          → 不缓存（每次都要最新）
index-abc123.js     → 永久缓存（内容变了哈希就变，URL 也变了）
vendor-def456.js    → 永久缓存（第三方库很少变）
logo.png            → 也可以带哈希
```

### 3. CDN 加速

```
没有 CDN：用户（广州）→ 服务器（北京）→ 慢
有 CDN：  用户（广州）→ CDN 节点（广州）→ 快
```

## 总结：一条龙流程

```
git push → CI 自动构建 → 跑测试 → 上传 CDN/服务器 → 用户访问
```

对于个人项目，最简方式可能是：

```bash
# Vercel / Netlify：连接 GitHub 仓库，push 自动部署
# 完全免费，适合个人项目和学习

# 或者直接用 Vite 构建 + Nginx：
npm run build
scp -r dist/* root@123.456.789.0:/var/www/myapp/
```
