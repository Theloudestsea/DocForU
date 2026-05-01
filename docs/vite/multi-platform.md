# 多平台配置适配方案

本文介绍如何通过 Vite 构建生成配置文件，实现同一套代码适配多个系统（开发、预发布、生产环境）的配置方案。

## 核心思路

### 问题背景
在实际项目中，经常需要一套代码适配多个环境：
- **开发环境（dev）**：本地开发，使用开发服务器
- **预发布环境（staging/pre）**：测试验证，使用测试服务器
- **生产环境（production/pro）**：正式发布，使用生产服务器

不同环境的配置可能包括：
- API 基础地址
- 应用标题
- 功能开关
- 第三方服务配置

### 解决方案
通过构建脚本动态生成配置文件，实现：
1. 根据构建模式读取对应的 `.env` 文件
2. 解析环境变量配置
3. 将配置注入到构建产物中
4. 运行时通过全局变量获取配置

## 方案一：构建时注入配置

### 实现步骤

#### 1. 环境配置文件
创建不同环境的配置文件：
```bash
# .env.dev
VITE_APP_ENV=development
VITE_APP_TITLE=开发环境
VITE_APP_API_BASE_URL=http://dev-api.example.com

# .env.pre
VITE_APP_ENV=staging
VITE_APP_TITLE=预发布环境
VITE_APP_API_BASE_URL=https://staging-api.example.com

# .env.pro
VITE_APP_ENV=production
VITE_APP_TITLE=生产环境
VITE_APP_API_BASE_URL=https://api.example.com
```

#### 2. 构建脚本
```typescript
// build.ts
import chalk from 'chalk'
import pkg from '../package.json'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const log = console.warn

// 从命令行参数获取构建模式
const mode = process.argv[2] || 'pro'

// 环境文件映射表
const envFileMap: Record<string, string> = {
    dev: '.env.dev',
    pre: '.env.pre',
    pro: '.env.pro',
}

// 解析环境配置文件
async function parseEnvFile(filePath: string): Promise<Record<string, string>> {
    const content = await fs.readFile(filePath, 'utf-8')
    const result: Record<string, string> = {}
    
    content.split('\n').forEach((line) => {
        const trimmed = line.trim()
        // 跳过空行和注释行
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=')
            if (key && valueParts.length > 0) {
                result[key.trim()] = valueParts.join('=').trim()
            }
        }
    })
    
    return result
}

// 将配置注入到 index.html 文件中
async function injectConfigToIndexHtml(config: Record<string, string>): Promise<void> {
    const indexPath = path.resolve(__dirname, '../dist/index.html')
    let html = await fs.readFile(indexPath, 'utf-8')

    // 生成配置脚本
    const configScript = `<script>
      window.__APP_CONFIG__ = {
        VITE_APP_ENV: '${config.VITE_APP_ENV || ''}',
        VITE_APP_TITLE: '${config.VITE_APP_TITLE || ''}',
        VITE_APP_API_BASE_URL: '${config.VITE_APP_API_BASE_URL || ''}'
      }
      document.title = window.__APP_CONFIG__.VITE_APP_TITLE
    </script>`

    // 替换现有的配置脚本
    html = html.replace(
        /<script>\s*window\.__APP_CONFIG__\s*=\s*\{[\s\S]*?<\/script>/,
        configScript,
    )

    await fs.writeFile(indexPath, html, 'utf-8')
    log(chalk.green('✓ 已注入配置到 dist/index.html'))
}

// 主函数
async function main() {
    const envFileName = envFileMap[mode]
    if (!envFileName) {
        log(chalk.red(`错误: 未知的环境模式 "${mode}"，可用: dev, pre, pro`))
        process.exit(1)
    }

    const envPath = path.resolve(__dirname, `../${envFileName}`)

    try {
        const envConfig = await parseEnvFile(envPath)
        log(chalk.cyan(`读取配置文件: ${envFileName}`))
        log(chalk.gray(JSON.stringify(envConfig, null, 2)))

        // 写入配置文件到 dist 目录
        await fs.writeFile(
            './dist/_appConfig.js',
            JSON.stringify(envConfig, null, 2),
            'utf-8',
        )
        log(chalk.green('✓ 项目配置文件写入成功: dist/_appConfig.js'))

        // 注入配置到 HTML
        await injectConfigToIndexHtml(envConfig)
    }
    catch (err) {
        console.error('处理配置文件时发生错误:', err)
        process.exit(1)
    }

    log(chalk.bgGreen.underline.greenBright(` -.- 0-0 build success`))
    log(`✨ ${chalk.cyan(`[${pkg.name}]`)} - build successfully!`)
}

main()
```

#### 3. 运行时配置访问
```typescript
// env.ts
declare global {
    interface Window {
        __APP_CONFIG__?: {
            VITE_APP_ENV?: string
            VITE_APP_TITLE?: string
            VITE_APP_API_BASE_URL?: string
        }
    }
}

const runtimeConfig = window.__APP_CONFIG__ || {}

export const isDev = (runtimeConfig.VITE_APP_ENV || import.meta.env.VITE_APP_ENV) === 'development'
export const isPre = (runtimeConfig.VITE_APP_ENV || import.meta.env.VITE_APP_ENV) === 'staging'
export const isPro = (runtimeConfig.VITE_APP_ENV || import.meta.env.VITE_APP_ENV) === 'production'

export const config = {
    appEnv: runtimeConfig.VITE_APP_ENV || import.meta.env.VITE_APP_ENV,
    appTitle: runtimeConfig.VITE_APP_TITLE || import.meta.env.VITE_APP_TITLE,
    apiBaseUrl: runtimeConfig.VITE_APP_API_BASE_URL || import.meta.env.VITE_APP_API_BASE_URL,
}

export const isDevelopment = () => import.meta.env.DEV
export const isProduction = () => import.meta.env.PROD

export const getApiUrl = (path: string = '') => `${config.apiBaseUrl}${path}`
```

#### 4. 使用示例
```typescript
// 在应用中使用配置
import { config, isDev, isPro } from './env'

console.log('当前环境:', config.appEnv)
console.log('API地址:', config.apiBaseUrl)

if (isDev) {
    console.log('开发环境特定逻辑')
}

if (isPro) {
    console.log('生产环境特定逻辑')
}

// API 请求
const apiUrl = getApiUrl('/users')
fetch(apiUrl).then(...)
```

### 优点
1. **配置与代码分离**：环境配置独立管理，便于维护
2. **运行时可修改**：部署后可通过修改配置文件调整配置
3. **类型安全**：TypeScript 提供完整的类型支持
4. **构建时注入**：无需运行时请求配置文件

### 缺点
1. **需要重新构建**：配置变更需要重新构建部署
2. **配置文件管理**：需要管理多个环境的配置文件

## 方案二：运行时加载配置

### 实现步骤

#### 1. 构建脚本
```typescript
// build.ts
import chalk from 'chalk'
import pkg from '../package.json'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const log = console.warn

const mode = process.argv[2] || 'pro'
const envFileMap: Record<string, string> = {
    dev: '.env.dev',
    pre: '.env.pre',
    pro: '.env.pro',
}

async function parseEnvFile(filePath: string): Promise<Record<string, string>> {
    const content = await fs.readFile(filePath, 'utf-8')
    const result: Record<string, string> = {}
    
    content.split('\n').forEach((line) => {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=')
            if (key && valueParts.length > 0) {
                result[key.trim()] = valueParts.join('=').trim()
            }
        }
    })
    
    return result
}

// 生成配置文件
async function generateConfigFile(config: Record<string, string>): Promise<void> {
    const jsContent = `// 应用配置文件 - 修改后刷新页面即可生效
window.__APP_CONFIG__ = {
  VITE_APP_ENV: '${config.VITE_APP_ENV || ''}',
  VITE_APP_TITLE: '${config.VITE_APP_TITLE || ''}',
  VITE_APP_API_BASE_URL: '${config.VITE_APP_API_BASE_URL || ''}'
};
`

    await fs.writeFile(path.resolve(__dirname, '../dist/_appConfig.js'), jsContent, 'utf-8')
    log(chalk.green('✓ 配置文件写入成功: dist/_appConfig.js'))
}

async function main() {
    const envFileName = envFileMap[mode]
    if (!envFileName) {
        log(chalk.red(`错误: 未知的环境模式 "${mode}"，可用: dev, pre, pro`))
        process.exit(1)
    }

    const envPath = path.resolve(__dirname, `../${envFileName}`)

    try {
        const envConfig = await parseEnvFile(envPath)
        log(chalk.cyan(`读取配置文件: ${envFileName}`))
        log(chalk.gray(JSON.stringify(envConfig, null, 2)))

        await generateConfigFile(envConfig)
    }
    catch (err) {
        console.error('处理配置文件时发生错误:', err)
        process.exit(1)
    }

    log(chalk.bgGreen.underline.greenBright(` -.- 0-0 build success`))
    log(`✨ ${chalk.cyan(`[${pkg.name}]`)} - build successfully!`)
}

main()
```

#### 2. 在 HTML 中引入配置文件
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>应用标题</title>
</head>
<body>
    <div id="app"></div>
    
    <!-- 配置文件 - 必须在应用代码之前加载 -->
    <script src="/_appConfig.js"></script>
    
    <!-- 应用入口 -->
    <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### 优点
1. **配置热更新**：修改配置文件后刷新页面即可生效
2. **无需重新构建**：配置变更不需要重新构建应用
3. **部署灵活**：可以在部署后动态调整配置

### 缺点
1. **额外请求**：需要额外请求配置文件
2. **配置文件管理**：需要确保配置文件正确部署

## 方案三：混合方案

### 实现思路
结合两种方案的优点：
1. **构建时注入默认配置**：确保应用有默认配置可用
2. **运行时加载外部配置**：支持运行时覆盖配置
3. **配置优先级**：外部配置 > 构建时配置 > 默认配置

### 实现代码
```typescript
// env.ts
declare global {
    interface Window {
        __APP_CONFIG__?: {
            VITE_APP_ENV?: string
            VITE_APP_TITLE?: string
            VITE_APP_API_BASE_URL?: string
        }
        __RUNTIME_CONFIG__?: {
            VITE_APP_ENV?: string
            VITE_APP_TITLE?: string
            VITE_APP_API_BASE_URL?: string
        }
    }
}

// 配置优先级：运行时配置 > 构建时配置 > 默认配置
const buildConfig = window.__APP_CONFIG__ || {}
const runtimeConfig = window.__RUNTIME_CONFIG__ || {}

export const config = {
    appEnv: runtimeConfig.VITE_APP_ENV || buildConfig.VITE_APP_ENV || import.meta.env.VITE_APP_ENV,
    appTitle: runtimeConfig.VITE_APP_TITLE || buildConfig.VITE_APP_TITLE || import.meta.env.VITE_APP_TITLE,
    apiBaseUrl: runtimeConfig.VITE_APP_API_BASE_URL || buildConfig.VITE_APP_API_BASE_URL || import.meta.env.VITE_APP_API_BASE_URL,
}

export const isDev = config.appEnv === 'development'
export const isPre = config.appEnv === 'staging'
export const isPro = config.appEnv === 'production'

export const isDevelopment = () => import.meta.env.DEV
export const isProduction = () => import.meta.env.PROD

export const getApiUrl = (path: string = '') => `${config.apiBaseUrl}${path}`
```

## 最佳实践

### 1. 配置文件组织
```
project/
├── .env.dev              # 开发环境配置
├── .env.pre              # 预发布环境配置
├── .env.pro              # 生产环境配置
├── build.ts              # 构建脚本
├── src/
│   ├── env.ts            # 环境配置访问
│   └── main.ts           # 应用入口
├── public/
│   └── _appConfig.js     # 运行时配置文件（可选）
└── vite.config.ts        # Vite 配置
```

### 2. 构建脚本配置
在 `package.json` 中添加构建脚本：
```json
{
  "scripts": {
    "build:dev": "vite build && tsx build.ts dev",
    "build:pre": "vite build && tsx build.ts pre",
    "build:pro": "vite build && tsx build.ts pro",
    "build": "vite build && tsx build.ts pro"
  }
}
```

### 3. 配置验证
```typescript
// env.ts
function validateConfig(config: Record<string, string | undefined>): boolean {
    const requiredFields = ['VITE_APP_ENV', 'VITE_APP_API_BASE_URL']
    
    for (const field of requiredFields) {
        if (!config[field]) {
            console.error(`配置错误: 缺少必需字段 ${field}`)
            return false
        }
    }
    
    // 验证 URL 格式
    try {
        new URL(config.VITE_APP_API_BASE_URL!)
    } catch {
        console.error('配置错误: VITE_APP_API_BASE_URL 不是有效的 URL')
        return false
    }
    
    return true
}
```

### 4. 错误处理
```typescript
// env.ts
export function getConfig(): AppConfig {
    try {
        const config = loadConfig()
        
        if (!validateConfig(config)) {
            console.warn('配置验证失败，使用默认配置')
            return getDefaultConfig()
        }
        
        return config
    } catch (error) {
        console.error('加载配置失败:', error)
        return getDefaultConfig()
    }
}
```

### 5. 安全性考虑
1. **敏感信息**：不要在配置文件中存储敏感信息（如密钥、密码）
2. **配置验证**：对配置值进行验证，防止注入攻击
3. **访问控制**：确保配置文件有适当的访问权限

## 部署指南

### 1. Docker 部署
```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build:pro

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 2. Nginx 配置
```nginx
server {
    listen 80;
    server_name example.com;
    
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 配置文件缓存策略
    location ~* \.(js|css)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # HTML 文件不缓存
    location ~* \.(html)$ {
        expires 0;
        add_header Cache-Control "no-cache, must-revalidate";
    }
    
    # 配置文件允许跨域
    location /_appConfig.js {
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
```

### 3. 环境变量注入
```yaml
# docker-compose.yml
version: '3.8'
services:
  web:
    build: .
    environment:
      - NODE_ENV=production
      - VITE_APP_ENV=production
    ports:
      - "80:80"
```

## 常见问题

### Q: 如何在不重新部署的情况下修改配置？
**A**: 使用运行时配置方案，修改 `_appConfig.js` 文件后刷新页面即可。

### Q: 如何确保配置文件的安全性？
**A**: 
1. 不要在配置文件中存储敏感信息
2. 使用 HTTPS 传输配置文件
3. 对配置值进行验证和清理

### Q: 如何处理配置文件加载失败？
**A**: 
1. 提供默认配置作为兜底
2. 实现配置加载重试机制
3. 在配置加载失败时显示友好提示

### Q: 如何在微前端中共享配置？
**A**: 
1. 主应用加载配置后通过 `window` 共享给子应用
2. 使用全局状态管理配置
3. 通过 URL 参数传递配置

### Q: 如何测试不同环境的配置？
**A**: 
1. 使用 `--mode` 参数指定构建模式
2. 创建测试专用的 `.env.test` 文件
3. 在 CI/CD 中配置不同的构建命令
