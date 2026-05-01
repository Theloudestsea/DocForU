# 工具库文档

本目录收录常用工具库的使用指南和最佳实践。

## 内容概览

### VueUse 工具库
Vue 生态中最流行的 Composition API 工具库，提供 200+ 个实用函数。
- [VueUse 使用指南](./vueuse.md)

### Monorepo 代码管理
现代前端项目的代码管理方式，将多个项目存放在同一仓库中。
- [Monorepo 详解](./monorepo.md)

### ESLint + Prettier 格式化方案
代码格式化和静态检查的配置方案。
- [ESLint + Prettier 配置](./eslint-prettier.md)

### TypeScript 类型定义
TypeScript 中 `.ts` 和 `.d.ts` 文件的区别与使用场景。
- [TypeScript 后缀区别](./typescript-suffix.md)

## 使用建议

1. **VueUse**: 优先使用 `useStorage`、`useFetch`、`useDark`、`useIntersectionObserver` 和 `useDebounceFn` 等高频工具
2. **Monorepo**: 适合项目间有大量依赖、需要统一技术栈的场景
3. **ESLint + Prettier**: 推荐使用自动导入配合 unplugin-auto-import
4. **TypeScript**: 日常开发首选 `.ts`，仅在描述第三方 JS 库或修改全局类型时使用 `.d.ts`