# Vite 常见配置示例

本文整理了 Vite 项目的常见配置示例，包括路径解析、CSS 预处理器、开发服务器、构建优化等配置。

## 配置示例一：Vue3 + Element Plus 项目

### 基础配置结构
```javascript
// vite.config.js
import path from "node:path";
import Vue from "@vitejs/plugin-vue";
import Unocss from "unocss/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import VueRouter from "unplugin-vue-router/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: "./",
    // 路径解析配置
    resolve: {
      alias: {
        "~/": `${path.resolve(__dirname, "src")}/`,
      },
    },
    
    // CSS 配置
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "~/styles/element/index.scss" as *;`,
          api: "modern-compiler",
        },
      },
    },
    
    // 开发服务器配置
    server: {
      hmr: true,
      port: mode === "pre" ? 3002 : 8889,
      proxy: {
        "/api": {
          target: env.VITE_APP_API_BASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    
    // 构建配置
    build: {
      sourcemap: mode === "dev",
      rollupOptions: {
        output: {
          manualChunks: {
            "element-plus": ["element-plus"],
          },
        },
      },
    },
    
    // 插件配置
    plugins: [
      Vue(),
      VueRouter({
        extensions: [".vue", ".md"],
        dts: "src/typed-router.d.ts",
      }),
      Components({
        extensions: ["vue", "md"],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        resolvers: [
          ElementPlusResolver({
            importStyle: "sass",
          }),
        ],
        dts: "src/components.d.ts",
      }),
      Unocss(),
    ],
    
    // 服务端渲染配置
    ssr: {
      noExternal: ["element-plus"],
    },
  };
});
```

### 配置详解

#### 1. 路径别名配置
```javascript
resolve: {
  alias: {
    "~/": `${path.resolve(__dirname, "src")}/`,
  },
},
```
- 将 `~/` 映射到 `src` 目录
- 简化导入路径：`import { xxx } from '~/utils/xxx'`

#### 2. CSS 预处理器配置
```javascript
css: {
  preprocessorOptions: {
    scss: {
      // 预先注入 Element Plus 的 SCSS 变量和混入
      additionalData: `@use "~/styles/element/index.scss" as *;`,
      // 使用现代编译器 API
      api: "modern-compiler",
    },
  },
},
```
- 预加载 Element Plus 的 SCSS 变量
- 使用现代编译器提高性能

#### 3. 开发服务器配置
```javascript
server: {
  hmr: true,
  port: mode === "pre" ? 3002 : 8889,
  proxy: {
    "/api": {
      target: env.VITE_APP_API_BASE_URL,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ""),
    },
  },
},
```
- 启用热模块替换（HMR）
- 根据环境模式设置端口
- 配置 API 代理解决跨域问题

#### 4. 构建优化配置
```javascript
build: {
  sourcemap: mode === "dev",
  rollupOptions: {
    output: {
      manualChunks: {
        "element-plus": ["element-plus"],
      },
    },
  },
},
```
- 仅在开发环境生成 source map
- 将 Element Plus 单独分包

#### 5. 插件配置
- **Vue 插件**：支持 `.vue` 单文件组件
- **Vue Router 插件**：自动生成路由
- **组件自动导入插件**：自动导入和注册组件
- **UnoCSS 插件**：原子化 CSS 引擎

## 配置示例二：大型项目配置

### 完整配置结构
```javascript
// vite.config.ts
import type { UserConfig, ConfigEnv } from 'vite';
import pkg from './package.json';
import moment from 'moment';
import { loadEnv } from 'vite';
import { resolve } from 'path';
import { generateModifyVars } from './build/generate/generateModifyVars';
import { createProxy, createProxyExt } from './build/vite/proxy';
import { wrapperEnv } from './build/utils';
import { createVitePlugins } from './build/vite/plugin';
import { OUTPUT_DIR } from './build/constant';
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { terser } from '@rollup/plugin-terser'

function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir);
}

const { dependencies, devDependencies, name, version } = pkg;
const __APP_INFO__ = {
  pkg: { dependencies, devDependencies, name, version },
  lastBuildTime: moment().format('YYYY-MM-DD HH:mm:ss'),
};

export default ({ command, mode }: ConfigEnv): UserConfig => {
  const root = process.cwd();
  const env = loadEnv(mode, root);
  const viteEnv = wrapperEnv(env);
  
  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_PROXY, VITE_GLOB_LOGIN_TYPE, VITE_DROP_CONSOLE } = viteEnv;
  const isBuild = command === 'build';

  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias: [
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js',
        },
        // /@/xxxx => src/xxxx
        {
          find: /\/@\//,
          replacement: pathResolve('src') + '/',
        },
        // /#/xxxx => types/xxxx
        {
          find: /\/#\//,
          replacement: pathResolve('types') + '/',
        },
        // /&/xxxx => public/xxxx
        {
          find: /\/&\//,
          replacement: pathResolve('public') + '/',
        },
      ],
    },
    server: {
      host: true,
      port: VITE_PORT,
      proxy: createProxyExt(VITE_PROXY, VITE_GLOB_LOGIN_TYPE),
    },
    build: {
      target: "esnext",
      outDir: OUTPUT_DIR,
      terserOptions: {
        compress: {
          keep_infinity: true,
          drop_console: VITE_DROP_CONSOLE,
        },
        format: {
          comments: true
        },
      },
      brotliSize: false,
      chunkSizeWarningLimit: 2000,
      minify: 'terser',
    },
    define: {
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },
    css: {
      preprocessorOptions: {
        less: {
          modifyVars: generateModifyVars(),
          javascriptEnabled: true,
        },
      },
    },
    plugins: createVitePlugins(viteEnv, isBuild),
    optimizeDeps: {
      include: [
        '@iconify/iconify',
        'ant-design-vue/es/locale/zh_CN',
        'moment/dist/locale/zh-cn',
        'ant-design-vue/es/locale/en_US',
        'moment/dist/locale/eu',
      ],
      exclude: ['vue-demi'],
    },
  };
};
```

### 配置详解

#### 1. 多路径别名配置
```javascript
resolve: {
  alias: [
    {
      find: 'vue-i18n',
      replacement: 'vue-i18n/dist/vue-i18n.cjs.js',
    },
    // /@/xxxx => src/xxxx
    {
      find: /\/@\//,
      replacement: pathResolve('src') + '/',
    },
    // /#/xxxx => types/xxxx
    {
      find: /\/#\//,
      replacement: pathResolve('types') + '/',
    },
    // /&/xxxx => public/xxxx
    {
      find: /\/&\//,
      replacement: pathResolve('public') + '/',
    },
  ],
},
```
- `vue-i18n`：解决 vue-i18n 的 CJS 模块问题
- `/@/`：指向 `src` 目录
- `/#/`：指向 `types` 目录
- `/&/`：指向 `public` 目录

#### 2. 环境变量处理
```javascript
const env = loadEnv(mode, root);
const viteEnv = wrapperEnv(env);

const { VITE_PORT, VITE_PUBLIC_PATH, VITE_PROXY, VITE_GLOB_LOGIN_TYPE, VITE_DROP_CONSOLE } = viteEnv;
```
- 使用 `loadEnv` 加载环境变量
- 通过 `wrapperEnv` 转换布尔值等类型

#### 3. 构建优化配置
```javascript
build: {
  target: "esnext",
  outDir: OUTPUT_DIR,
  terserOptions: {
    compress: {
      keep_infinity: true,
      drop_console: VITE_DROP_CONSOLE,
    },
    format: {
      comments: true
    },
  },
  brotliSize: false,
  chunkSizeWarningLimit: 2000,
  minify: 'terser',
},
```
- 目标设置为 ESNext 以获得最佳性能
- 根据环境变量决定是否移除 console
- 关闭 brotli 大小显示以加快构建
- 设置 chunk 大小警告阈值

#### 4. CSS 预处理器配置
```javascript
css: {
  preprocessorOptions: {
    less: {
      modifyVars: generateModifyVars(),
      javascriptEnabled: true,
    },
  },
},
```
- 使用 Less 预处理器
- 注入自定义主题变量
- 启用 JavaScript 支持

#### 5. 依赖优化配置
```javascript
optimizeDeps: {
  include: [
    '@iconify/iconify',
    'ant-design-vue/es/locale/zh_CN',
    'moment/dist/locale/zh-cn',
    'ant-design-vue/es/locale/en_US',
    'moment/dist/locale/eu',
  ],
  exclude: ['vue-demi'],
},
```
- 预构建常用依赖以提高启动速度
- 排除不需要预构建的依赖

## 配置示例三：使用 Terser 压缩

### 基础 Terser 配置
```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { terser } from '@rollup/plugin-terser'

export default defineConfig({
  plugins: [
    vue(),
    terser({
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    })
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true
      }
    }
  }
})
```

### 配置说明
- `drop_console`：移除所有 console 语句
- `drop_debugger`：移除所有 debugger 语句
- `comments: false`：移除所有注释
- `minify: 'terser'`：强制使用 terser 进行压缩

## 环境变量配置

### .env 文件示例
```bash
# .env.development
VITE_APP_TITLE=My App
VITE_APP_API_BASE_URL=http://localhost:3000/api
VITE_APP_ENV=development

# .env.production
VITE_APP_TITLE=My App
VITE_APP_API_BASE_URL=https://api.example.com
VITE_APP_ENV=production
```

### 环境变量使用
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

## 最佳实践

### 1. 配置文件组织
```
build/
├── constant.ts          # 常量定义
├── utils.ts            # 工具函数
├── generate/
│   └── generateModifyVars.ts  # 主题变量生成
└── vite/
    ├── plugin.ts       # 插件配置
    └── proxy.ts        # 代理配置
```

### 2. 环境变量管理
- 使用 `.env` 文件管理不同环境的配置
- 通过 `loadEnv` 加载环境变量
- 使用类型安全的环境变量访问

### 3. 插件配置
- 将插件配置提取到单独文件
- 根据环境动态加载插件
- 使用 TypeScript 提供类型支持

### 4. 构建优化
- 合理配置分包策略
- 使用压缩工具减小文件体积
- 配置缓存策略提高加载速度

## 常见问题

### Q: 如何解决跨域问题？
**A**: 配置开发服务器代理：
```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://backend-server.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, '')
    }
  }
}
```

### Q: 如何配置路径别名？
**A**: 在 `resolve.alias` 中配置：
```javascript
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src'),
    '~': path.resolve(__dirname, 'src')
  }
}
```

### Q: 如何优化构建性能？
**A**: 
1. 使用 `target: 'esnext'` 减少语法转换
2. 配置 `manualChunks` 进行分包
3. 使用 `terser` 进行代码压缩
4. 关闭不必要的功能如 `brotliSize`

### Q: 如何配置多环境？
**A**: 
1. 创建 `.env.development`、`.env.production` 等文件
2. 使用 `loadEnv` 加载对应环境的变量
3. 在代码中通过 `import.meta.env` 访问
