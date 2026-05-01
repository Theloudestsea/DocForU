# Vite 分包策略详解

分包（Code Splitting）是前端工程化中优化项目加载性能的关键手段。本文介绍 Vite 分包构建的核心思路、配置方法和最佳实践。

## 核心概念

### 为什么需要分包？
不做分包时，Vite 会将项目所有代码打包成 1-2 个大文件，带来两个关键问题：
- **首屏加载慢**：单个文件体积过大，浏览器下载耗时久
- **资源重复加载**：多个页面共用的第三方库/公共组件会被重复打包

### 分包的核心目标
1. **拆分第三方依赖**：把 vue、axios、element-plus 等稳定的第三方库拆成独立 chunk
2. **拆分公共业务代码**：把多个页面共用的组件/工具函数拆成独立 chunk
3. **拆分路由代码**：按路由拆分业务代码，实现路由懒加载

### Vite 分包的三种策略
1. **自动分包**：Vite/Rollup 默认行为
2. **手动分包**：通过配置明确指定分包规则
3. **动态导入**：代码层面的按需加载

## 基础分包配置

### 核心配置项
在 Vite 配置文件（`vite.config.js/ts`）中，通过 `manualChunks` 配置分包规则：

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    rollupOptions: {
      output: {
        // 手动分包配置
        manualChunks: {
          // 格式: chunk名称: [模块列表]
        }
      }
    }
  }
})
```

### 示例 1：基础配置（抽离第三方依赖）
最常用的场景：把所有第三方依赖抽离到 `vendor` chunk 中：

```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 抽离第三方依赖
          if (id.includes('node_modules')) {
            // 可进一步细分：把vue相关包单独抽离
            if (id.includes('vue') || id.includes('@vue')) {
              return 'vue-vendor'
            }
            return 'vendor'
          }
          
          // 抽离公共业务代码
          if (id.includes('src/utils')) {
            return 'utils'
          }
          
          // 抽离公共组件
          if (id.includes('src/components/global')) {
            return 'components'
          }
        },
        // 自定义chunk输出的文件名格式
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/[ext]/[name]-[hash].[ext]'
      }
    },
    // 可选：开启压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

### 示例 2：按路由拆分
结合 Vue Router 懒加载，无需在 `manualChunks` 中额外配置：

```javascript
// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

// 异步导入：每个路由组件会被Vite自动拆成独立chunk
const Home = () => import('../views/Home.vue')
const About = () => import('../views/About.vue')
const User = () => import('../views/User.vue')

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/user', component: User }
]
```

### 示例 3：对象式配置
如果规则简单，也可以用对象式写法：

```javascript
manualChunks: {
  // 把vue、vue-router、pinia打包到vue-vendor chunk
  'vue-vendor': ['vue', 'vue-router', 'pinia'],
  // 把axios、element-plus打包到api-vendor chunk
  'api-vendor': ['axios', 'element-plus'],
  // 把公共工具函数打包到utils chunk
  'utils': ['src/utils/request.js', 'src/utils/format.js']
}
```

## 高级分包策略

### 1. 按第三方库分包
将稳定的第三方库单独打包：

```javascript
manualChunks: {
  // Vue 生态
  'vue': ['vue', 'vue-router', 'pinia', '@vueuse/core'],
  
  // UI 组件库
  'element-plus': ['element-plus'],
  'ant-design-vue': ['ant-design-vue'],
  
  // 工具库
  'lodash': ['lodash', 'lodash-es'],
  'axios': ['axios'],
  'dayjs': ['dayjs'],
  'echarts': ['echarts']
}
```

### 2. 按业务模块分包
将不同业务功能模块拆分：

```javascript
manualChunks: {
  // 用户模块
  'user': [
    './src/modules/user',
    './src/store/user',
    './src/router/modules/user'
  ],
  
  // 订单模块
  'order': [
    './src/modules/order',
    './src/store/order',
    './src/router/modules/order'
  ],
  
  // 商品模块
  'product': [
    './src/modules/product',
    './src/store/product',
    './src/router/modules/product'
  ]
}
```

### 3. 基于文件大小的自动分包
```javascript
manualChunks: (id) => {
  if (id.includes('node_modules')) {
    // 第三方库：按包名分包
    const packageName = id.match(/node_modules\/([^\/]+)/)?.[1]
    if (packageName) {
      return `vendor-${packageName}`
    }
  } else if (id.includes('/src/modules/')) {
    // 按模块目录分包
    const moduleMatch = id.match(/\/src\/modules\/([^\/]+)/)
    if (moduleMatch) {
      return `module-${moduleMatch[1]}`
    }
  }
  // 其他情况，按文件大小自动拆分
  const size = fs.statSync(id).size
  if (size > 1024 * 1024) { // 1MB
    return 'large-files'
  }
}
```

## 动态导入分包

### Vue 3 动态导入
```vue
<script setup>
// 静态导入（会打包到主包）
import StaticComponent from './components/StaticComponent.vue'

// 动态导入（自动分包）
const DynamicComponent = defineAsyncComponent(() => 
  import('./components/HeavyComponent.vue')
)

// 带加载状态的动态导入
const AsyncComponent = defineAsyncComponent({
  loader: () => import('./components/AsyncComponent.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorBoundary,
  delay: 200,
  timeout: 3000
})
</script>
```

### 路由懒加载配置
```javascript
const routes = [
  {
    path: '/',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/user/:id',
    component: () => import('../views/UserDetail.vue')
  },
  {
    path: '/admin',
    component: () => import('../views/Admin.vue'),
    meta: { requiresAuth: true }
  }
]
```

## 分包优化策略

### 1. 控制分包大小
```javascript
build: {
  rollupOptions: {
    output: {
      // 设置 chunk 大小警告阈值（KB）
      chunkSizeWarningLimit: 1000,
      
      // 最小 chunk 大小（避免过小的文件）
      minChunkSize: 1024, // 1KB
      
      // 合并小 chunk 的策略
      experimentalMinChunkSize: 2048, // 2KB
    }
  }
}
```

### 2. 缓存优化策略
```javascript
build: {
  rollupOptions: {
    output: {
      // 入口文件名（带哈希）
      entryFileNames: 'js/[name]-[hash].js',
      
      // chunk 文件名（带哈希）
      chunkFileNames: 'js/chunk-[name]-[hash].js',
      
      // 静态资源文件名（带哈希）
      assetFileNames: '[ext]/[name]-[hash].[ext]'
    }
  }
}
```

### 3. 分包预加载策略
```javascript
// 在代码中手动预加载关键 chunk
import.meta.glob('./views/**/*.vue')

// 或者在路由守卫中预加载
router.beforeEach((to, from, next) => {
  if (to.meta.preload) {
    to.matched.forEach(record => {
      if (record.components) {
        Object.values(record.components).forEach(component => {
          if (component.preload) {
            component.preload()
          }
        })
      }
    })
  }
  next()
})
```

## 插件辅助分包

### 使用 Vite 插件优化分包
```bash
npm install --save-dev vite-plugin-split
```

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import split from 'vite-plugin-split'

export default defineConfig({
  plugins: [
    vue(),
    split({
      rules: [
        {
          test: /[\\/]node_modules[\\/](vue|vue-router|pinia)[\\/]/,
          name: 'vue-core'
        },
        {
          test: /[\\/]node_modules[\\/](element-plus|ant-design-vue)[\\/]/,
          name: 'ui-library'
        },
        {
          test: /[\\/]node_modules[\\/](lodash|axios|dayjs)[\\/]/,
          name: 'utils'
        }
      ],
      minChunkSize: 100 * 1024, // 100KB
      compress: true
    })
  ]
})
```

### 使用可视化工具分析分包
```bash
npm install --save-dev rollup-plugin-visualizer
```

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      open: true,
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true
    })
  ]
})
```

## 实战案例：电商网站分包配置

### 完整配置示例
```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import visualizer from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    vue(),
    visualizer({
      open: process.env.NODE_ENV === 'production',
      filename: 'bundle-stats.html'
    })
  ],
  
  build: {
    target: 'es2015',
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 1. 核心框架
          if (id.includes('node_modules/vue') || 
              id.includes('node_modules/pinia') || 
              id.includes('node_modules/vue-router')) {
            return 'framework'
          }
          
          // 2. UI 组件库
          if (id.includes('node_modules/element-plus') || 
              id.includes('node_modules/@ant-design')) {
            return 'ui-library'
          }
          
          // 3. 业务模块
          if (id.includes('/src/modules/product/')) {
            return 'module-product'
          }
          if (id.includes('/src/modules/order/')) {
            return 'module-order'
          }
          if (id.includes('/src/modules/user/')) {
            return 'module-user'
          }
          
          // 4. 工具库
          if (id.includes('node_modules/axios') || 
              id.includes('node_modules/dayjs')) {
            return 'utils-frequent'
          }
          if (id.includes('node_modules/lodash') || 
              id.includes('node_modules/echarts')) {
            return 'utils-occasional'
          }
          
          // 5. 大型第三方库
          if (id.includes('node_modules/moment') || 
              id.includes('node_modules/antd')) {
            return 'vendor-large'
          }
          
          // 6. 剩余代码
          return 'main'
        },
        
        chunkSizeWarningLimit: 1000,
        minChunkSize: 100 * 1024,
        
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/chunk-[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  }
})
```

## 最佳实践总结

### ✅ 推荐做法
1. **分层分包**：框架 → UI库 → 业务模块 → 工具库
2. **按稳定性分包**：稳定的库优先分包，频繁变动的业务代码放主包
3. **按使用频率分包**：首屏需要的代码放主包，延迟加载的放单独 chunk
4. **合理设置大小阈值**：避免过小文件过多，也避免大文件过大
5. **利用浏览器缓存**：为不同类型的 chunk 设置不同的缓存策略

### ⚠️ 注意事项
1. **避免过度分包**：过多的 chunk 会增加网络请求开销
2. **注意公共代码重复**：确保不同 chunk 间的公共代码不会重复打包
3. **考虑 CDN 部署**：分包后文件较多，需要合适的 CDN 策略
4. **监控首屏指标**：分包的目的是优化用户体验，不是为了分包而分包

### 📊 分包决策流程
```
开始分包配置
    ↓
分析项目结构
    ↓
识别稳定依赖（Vue、UI库等）
    ↓
识别业务模块（按功能/路由）
    ↓
识别工具库（按使用频率）
    ↓
设置分包规则
    ↓
构建并分析结果
    ↓
优化调整
    ↓
最终配置
```

## 验证分包效果

配置完成后，执行 `npm run build` 打包项目，通过两种方式验证：
1. **看 dist 目录**：`dist/static/js` 下会出现 `vendor-xxx.js`、`vue-vendor-xxx.js`、`utils-xxx.js` 等分包文件
2. **浏览器 Network 面板**：运行打包后的项目，刷新页面可看到：
   - 首屏只加载入口 chunk + 公共依赖 chunk
   - 切换路由时，才会加载对应路由的 chunk

## 常见问题解答

### Q: 如何确定分包阈值？
**A**: 通过构建分析工具，观察 chunk 大小分布：
- 100KB 以下：可以合并
- 100KB-500KB：理想大小
- 500KB-1MB：需要考虑拆分
- 1MB 以上：强烈建议拆分

### Q: 动态导入和手动分包如何选择？
**A**: 
- **动态导入**：适合业务页面、大型组件
- **手动分包**：适合第三方库、核心业务模块
- **两者结合**：最佳实践

### Q: 分包后如何保证 SEO？
**A**: 
1. 确保关键内容在首屏 chunk 中
2. 使用 `<link rel="preload">` 预加载关键资源
3. 对于动态内容，考虑服务端渲染（SSR）

### Q: 如何处理分包后的缓存？
**A**: 
```javascript
// nginx 配置示例
location ~* \.(js|css)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

location ~* \.(html)$ {
  expires 0;
  add_header Cache-Control "no-cache, must-revalidate";
}
```
