# Vben Admin 中 Vite 打包构建逻辑说明

## 项目概述

这是一个基于 Vue 3 + Vite 的企业级支付清算系统前端应用（CBPS2G-UI），基于 Vben Admin 模板开发。

## Vite 配置逻辑分析

### 1. 配置文件结构

- **主配置文件**: `vite.config.ts`
- **环境配置**: `.env*` 文件（开发、测试、生产等多环境）
- **构建工具**: `build/` 目录下的各种配置文件

### 2. 核心配置项

#### 2.1 基础配置

```typescript
// vite.config.ts:56-154
export default ({ command, mode }: ConfigEnv): UserConfig => {
  const root = process.cwd();
  const env = loadEnv(mode, root);
  const viteEnv = wrapperEnv(env);
  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_PROXY, VITE_GLOB_LOGIN_TYPE, VITE_DROP_CONSOLE } = viteEnv;
  const isBuild = command === 'build';
}
```

#### 2.2 路径别名配置

```typescript
// vite.config.ts:72-92
resolve: {
  alias: [
    { find: 'vue-i18n', replacement: 'vue-i18n/dist/vue-i18n.cjs.js' },
    { find: /\/@\//, replacement: pathResolve('src') + '/' },      // /@/xxxx => src/xxxx
    { find: /\/#\//, replacement: pathResolve('types') + '/' },    // /#/xxxx => types/xxxx
    { find: /\/&\//, replacement: pathResolve('public') + '/' },   // /&/xxxx => public/xxxx
  ],
}
```

#### 2.3 开发服务器配置

```typescript
// vite.config.ts:94-100
server: {
  host: true,  // 监听所有本地IP
  port: VITE_PORT,
  proxy: createProxyExt(VITE_PROXY, VITE_GLOB_LOGIN_TYPE),  // 代理配置
}
```

#### 2.4 构建配置

```typescript
// vite.config.ts:101-122
build: {
  target: "esnext",  // 目标浏览器版本
  outDir: OUTPUT_DIR,  // 输出目录（dist）
  terserOptions: {
    compress: {
      keep_infinity: true,
      drop_console: VITE_DROP_CONSOLE,  // 生产环境移除console
    },
    format: {
      comments: true  // 保留注释
    },
  },
  brotliSize: false,  // 关闭brotliSize显示
  chunkSizeWarningLimit: 2000,  // 分块大小警告限制
  minify: 'terser',  // 强制使用terser压缩
}
```

#### 2.5 CSS 预处理器配置

```typescript
// vite.config.ts:130-137
css: {
  preprocessorOptions: {
    less: {
      modifyVars: generateModifyVars(),  // Ant Design 主题变量
      javascriptEnabled: true,
    },
  },
}
```

#### 2.6 插件配置

```typescript
// vite.config.ts:140
plugins: createVitePlugins(viteEnv, isBuild)
```

### 3. 环境变量处理

#### 3.1 环境变量加载

```typescript
// build/utils.ts:21-46
export function wrapperEnv(envConf: Recordable): ViteEnv {
  // 将字符串类型的环境变量转换为正确的类型
  // 处理 VITE_PORT 为数字
  // 处理 VITE_PROXY 为 JSON 数组
}
```

#### 3.2 环境配置文件

- **.env**: 基础配置（端口、公共路径等）
- **.env.development**: 开发环境配置
- **.env.production**: 生产环境配置
- **.env.sit**: SIT 环境配置
- **.env.uat**: UAT 环境配置
- **.env.dev**: Dev 环境配置
- **.env.sitfz**: SIT FZ 环境配置
- **.env.sitfull**: SIT FULL 环境配置

### 4. 代理配置

#### 4.1 代理函数

```typescript
// build/vite/proxy.ts:18-37
export function createProxy(list: ProxyList = []) {
  // 生成代理配置
  // 支持 HTTPS
  // 重写路径
}

export function createProxyExt(list: ProxyList = [], VITE_GLOB_LOGIN_TYPE: string) {
  // 扩展代理配置，支持不同环境
}
```

#### 4.2 代理配置示例

```typescript
// .env.development:11
VITE_PROXY=[["/api","http://172.21.1.11:9079/usmp-core/api"],["/cbmp","http://127.0.0.1:9080/cbmp-app"]]
```

### 5. 插件系统

#### 5.1 插件列表

```typescript
// build/vite/plugin/index.ts:19-82
export function createVitePlugins(viteEnv: ViteEnv, isBuild: boolean) {
  const vitePlugins = [
    vue(),                    // Vue 3 核心插件
    vueJsx(),                 // Vue JSX 支持
    vueSetupExtend(),         // 支持组件 name 属性
    windiCSS(),               // WindiCSS 样式框架
    configHtmlPlugin(),       // HTML 模板处理
    configSvgIconsPlugin(),   // SVG 图标
    purgeIcons(),             // 清理未使用的图标
    configStyleImportPlugin(),// 按需引入样式
    configVisualizerConfig(), // 构建分析
    configThemePlugin(),      // 主题切换
  ];

  // 生产环境额外插件
  if (isBuild) {
    configImageminPlugin(),   // 图片压缩
    configCompressPlugin(),   // Gzip/Brotli 压缩
    configPwaConfig(),        // PWA 支持
  }
}
```

#### 5.2 关键插件说明

**vite-plugin-html**: HTML 模板处理
- 注入标题和配置
- 生产环境注入配置文件引用

**vite-plugin-theme**: 主题切换
- 支持 Ant Design 主题定制
- 支持暗色模式

**vite-plugin-compression**: 压缩
- 支持 Gzip 和 Brotli
- 可配置是否删除原始文件

**vite-plugin-svg-icons**: SVG 图标
- 自动生成 SVG 图标精灵图

**vite-plugin-windicss**: WindiCSS
- 类似 Tailwind CSS 的实用工具类框架

## 打包构建逻辑分析

### 1. 构建脚本

#### 1.1 package.json 脚本

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=production vite build && esno ./build/script/postBuild.ts",
    "build:devtest": "cross-env NODE_ENV=development vite build && esno ./build/script/postBuild.ts",
    "build:dev": "cross-env NODE_ENV=dev vite build && esno ./build/script/postBuild.ts",
    "build:sit": "cross-env vite build --mode sit && esno ./build/script/postBuild.ts",
    "build:uat": "cross-env vite build --mode uat && esno ./build/script/postBuild.ts",
    "build:sitfz": "cross-env vite build --mode sitfz && esno ./build/script/postBuild.ts",
    "build:sitfull": "cross-env vite build --mode sitfull && esno ./build/script/postBuild.ts",
    "build:sitfull_p": "cross-env vite build --mode sitfull_p && esno ./build/script/postBuild.ts",
    "build:sitfull_s": "cross-env vite build --mode sitfull_s && esno ./build/script/postBuild.ts",
    "build:no-cache": "yarn clean:cache && npm run build",
    "report": "cross-env REPORT=true npm run build"
  }
}
```

#### 1.2 构建流程

1. **环境变量设置**: 通过 `cross-env` 设置 `NODE_ENV` 或 `--mode` 参数
2. **Vite 构建**: 执行 `vite build`
3. **后处理**: 执行 `esno ./build/script/postBuild.ts`

### 2. 构建后处理

#### 2.1 postBuild.ts 逻辑

```typescript
// build/script/postBuild.ts:8-23
export const runBuild = async () => {
  try {
    const argvList = process.argv.splice(2);

    // 生成配置文件
    if (!argvList.includes('disabled-config')) {
      runBuildConfig();
    }

    console.log(`✨ ${chalk.cyan(`[${pkg.name}]`)}` + ' - build successfully!');
  } catch (error) {
    console.log(chalk.red('vite build error:\\n' + error));
    process.exit(1);
  }
};
```

#### 2.2 配置文件生成

```typescript
// build/script/buildConf.ts:41-45
export function runBuildConfig() {
  const config = getEnvConfig();  // 获取环境配置
  const configFileName = getConfigFileName(config);  // 生成配置文件名
  createConfig({ config, configName: configFileName, configFileName: GLOB_CONFIG_FILE_NAME });
}
```

#### 2.3 配置文件内容

```typescript
// build/script/buildConf.ts:19-39
function createConfig(params: CreateConfigParams) {
  const { configName, config, configFileName } = params;
  const windowConf = `window.${configName}`;
  const configStr = `${windowConf}=${JSON.stringify(config)};
    Object.freeze(${windowConf});
    Object.defineProperty(window, "${configName}", {
      configurable: false,
      writable: false,
    });
  `.replace(/\\s/g, '');

  // 写入到 dist/_app.config.js
  writeFileSync(getRootPath(`${OUTPUT_DIR}/${configFileName}`), configStr);
}
```

### 3. 输出目录结构

#### 3.1 输出目录

```typescript
// build/constant.ts:6
export const OUTPUT_DIR = 'dist';
```

#### 3.2 构建产物

- `dist/` - 主要构建产物
  - `index.html` - 入口 HTML
  - `assets/` - 静态资源（JS、CSS、图片等）
  - `_app.config.js` - 环境配置文件

### 4. 多环境构建

#### 4.1 环境配置映射

| 命令                      | 环境          | NODE_ENV    | 模式          |
| ----------------------- | ----------- | ----------- | ----------- |
| `npm run build`         | 生产环境        | production  | production  |
| `npm run build:devtest` | 开发测试        | development | development |
| `npm run build:dev`     | Dev 环境      | dev         | dev         |
| `npm run build:sit`     | SIT 环境      | -           | sit         |
| `npm run build:uat`     | UAT 环境      | -           | uat         |
| `npm run build:sitfz`   | SIT FZ 环境   | -           | sitfz       |
| `npm run build:sitfull` | SIT FULL 环境 | -           | sitfull     |

#### 4.2 环境变量差异

不同环境的主要差异：

- **代理配置**: `VITE_PROXY`
- **API 地址**: `VITE_GLOB_API_URL`
- **登录类型**: `VITE_GLOB_LOGIN_TYPE`
- **控制台输出**: `VITE_DROP_CONSOLE`
- **压缩配置**: `VITE_BUILD_COMPRESS`

### 5. 优化策略

#### 5.1 代码分割

```typescript
// vite.config.ts:120
chunkSizeWarningLimit: 2000,  // 分块大小警告限制
```

#### 5.2 压缩策略

- **开发环境**: 不压缩，保留 console
- **生产环境**:
  - Terser 压缩（移除 console）
  - 可选 Gzip/Brotli 压缩
  - 图片压缩（可选）

#### 5.3 缓存策略

```typescript
// package.json:28
"clean:cache": "rimraf node_modules/.cache/ && rimraf node_modules/.vite"
```

### 6. 构建验证

#### 6.1 构建检查

```typescript
// package.json:24
"type:check": "vue-tsc --noEmit --skipLibCheck"
```

#### 6.2 预览构建

```typescript
// package.json:25-26
"preview": "npm run build && vite preview",
"preview:dist": "vite preview"
```

#### 6.3 构建分析

```typescript
// package.json:23
"report": "cross-env REPORT=true npm run build"
```

## 关键文件路径

### 配置文件

- `vite.config.ts` - 主配置文件
- `.env*` - 环境配置文件
- `build/vite/proxy.ts` - 代理配置
- `build/utils.ts` - 工具函数
- `build/constant.ts` - 常量定义

### 构建脚本

- `build/script/postBuild.ts` - 构建后处理
- `build/script/buildConf.ts` - 配置文件生成
- `build/getConfigFileName.ts` - 配置文件名生成

### 插件配置

- `build/vite/plugin/index.ts` - 插件入口
- `build/vite/plugin/html.ts` - HTML 插件
- `build/vite/plugin/compress.ts` - 压缩插件
- `build/vite/plugin/theme.ts` - 主题插件

### 主题配置

- `build/config/themeConfig.ts` - 主题颜色配置
- `build/generate/generateModifyVars.ts` - Less 变量生成

## 总结

### Vite 配置特点

1. **多环境支持**: 通过环境变量和模式支持多种部署环境
2. **路径别名**: 简化导入路径（`/@/`、`/#/`、`/&/`）
3. **插件系统**: 丰富的插件支持（Vue、JSX、样式、主题、压缩等）
4. **主题定制**: Ant Design 主题深度定制
5. **代理配置**: 支持多环境代理配置

### 打包构建特点

1. **多环境构建**: 支持 dev、sit、uat、prod 等多个环境
2. **构建后处理**: 自动生成环境配置文件
3. **优化策略**: 代码分割、压缩、缓存清理
4. **验证机制**: 类型检查、构建预览、分析报告
5. **自动化**: 通过 npm scripts 统一管理

### 业务特点

1. **USMP 集成**: 与统一系统管理平台深度集成
2. **支付清算**: 专注于银行支付清算业务
3. **企业级**: 基于 Vben Admin 模板，具有完善的权限、路由、状态管理
4. **多模块**: 支持大量业务模块路由

## 验证方法

### 1. 开发环境验证

```bash
npm run devtest
# 或
npm run serve
```

### 2. 构建验证

```bash
# 生产环境构建
npm run build

# 检查构建产物
ls -la dist/

# 预览构建
npm run preview
```

### 3. 环境配置验证

```bash
# 检查环境变量
cat .env.development | grep VITE_

# 检查代理配置
cat .env.development | grep VITE_PROXY
```

### 4. 插件验证

```bash
# 检查插件配置
cat build/vite/plugin/index.ts

# 检查主题配置
cat build/config/themeConfig.ts
```

### 5. 构建产物验证

```bash
# 检查 dist 目录结构
tree dist/

# 检查配置文件
cat dist/_app.config.js

# 检查 HTML 入口
cat dist/index.html
```

## 参考文档

### Vite 官方文档

- https://vitejs.dev/config/
- https://vitejs.dev/guide/

### Vben Admin 文档

- https://vvbin.cn/doc-next/

### Ant Design Vue 文档

- https://2x.antdv.com/docs/vue/introduce/

### WindiCSS 文档

- https://windicss.org/

### 项目特定配置

- USMP 集成：`src/cbcc/utils/usmp-service.ts`
- 业务工具：`src/cbcc/utils/`
- 枚举定义：`src/enums/`
- API 服务：`src/api/`