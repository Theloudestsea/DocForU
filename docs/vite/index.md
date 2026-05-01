# Vite 相关文档

本目录包含 Vite 构建工具相关的技术文档，涵盖配置优化、构建策略和多平台适配等内容。

## 文档目录

### 构建优化
- [分包策略](./code-splitting.md) - Vite 分包构建的核心思路和配置方法，优化首屏加载性能
- [常见配置](./config.md) - Vite 项目的常见配置示例，包括插件、代理、构建优化等

### 多平台适配
- [多平台配置](./multi-platform.md) - 构建生成配置文件适配多个系统的实现思路

## 核心概念

### Vite 简介
Vite 是下一代前端构建工具，具有以下特点：
- **极速开发体验**：基于 ESM 的模块热更新（HMR）
- **优化构建**：使用 Rollup 进行生产构建，支持代码分割
- **丰富的插件生态**：兼容 Rollup 插件，拥有专属插件系统
- **开箱即用**：内置 TypeScript、CSS 预处理器等支持

### 主要优势
1. **开发服务器启动快**：无需打包，直接提供源码
2. **热更新速度快**：精确更新变化的模块，不重新加载整个应用
3. **构建优化**：自动代码分割、Tree Shaking、CSS 代码分割
4. **配置灵活**：支持多种配置方式和插件扩展

## 快速开始

### 安装
```bash
npm create vite@latest my-project
cd my-project
npm install
```

### 基础配置
```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist'
  }
})
```

## 最佳实践

1. **合理配置分包**：将第三方库、公共组件、业务代码分离
2. **使用路径别名**：简化导入路径，提高代码可维护性
3. **配置代理**：解决开发环境跨域问题
4. **优化构建**：启用压缩、移除 console、配置缓存策略

## 相关资源

- [Vite 官方文档](https://vitejs.dev/)
- [Vite GitHub 仓库](https://github.com/vitejs/vite)
- [Vite 插件列表](https://github.com/vitejs/awesome-vite)
