import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'DocsForU',
  description: 'DocsForU',
  head: [['link', { rel: 'icon', href: '../public/images/ikun.jpg' }]],
  srcDir: 'docs',
  outDir: '../docs-dist',
  themeConfig: {
    logo: '../public/images/ikun.jpg',
    nav: [
      { text: '首页', link: '/' },
      { text: 'Vue', link: '/vue/' },
      { text: 'Vite', link: '/vite/' },
      { text: 'Axios', link: '/axios/' },
      { text: '部署', link: '/deploy/' },
      { text: '工具库', link: '/tools/' },
      { text: '实践', link: '/practices/' },
      { text: '其他', link: '/other/' },
    ],
    sidebar: {
      '/vue/': [
        {
          text: 'Vue相关',
          items: [
            { text: '概览', link: '/vue/' },
            { text: '递归组件详解', link: '/vue/recursive-component' },
            { text: 'h函数详解', link: '/vue/h-function' },
            { text: '响应式原理', link: '/vue/reactivity' },
            { text: '自定义指令', link: '/vue/custom-directive' },
            { text: '性能优化方案', link: '/vue/performance' },
            { text: '自定义插件', link: '/vue/plugin' },
            { text: 'Setup语法糖', link: '/vue/setup-syntax' },
            { text: 'Token持久化存储', link: '/vue/token-storage' },
            { text: 'nextTick用法', link: '/vue/nextTick' },
          ],
        },
      ],
      '/vite/': [
        {
          text: 'Vite相关',
          items: [
            { text: '概览', link: '/vite/' },
            { text: '构建分包', link: '/vite/code-splitting' },
            { text: '常见配置', link: '/vite/config' },
            { text: '多平台适配', link: '/vite/multi-platform' },
          ],
        },
      ],
      '/axios/': [
        {
          text: 'Axios相关',
          items: [
            { text: '概览', link: '/axios/' },
            { text: '请求进度实现', link: '/axios/progress' },
          ],
        },
      ],
      '/deploy/': [
        {
          text: '部署相关',
          items: [
            { text: '概览', link: '/deploy/' },
            { text: 'Nginx配置', link: '/deploy/nginx' },
            { text: 'Linux常用命令', link: '/deploy/linux' },
            { text: '部署流程', link: '/deploy/workflow' },
            { text: '常用配置备份', link: '/deploy/config-backup' },
          ],
        },
      ],
      '/tools/': [
        {
          text: '工具库与工程化',
          items: [
            { text: '概览', link: '/tools/' },
            { text: 'vueUse工具库', link: '/tools/vueuse' },
            { text: 'Monorepo代码管理', link: '/tools/monorepo' },
            { text: 'ESLint+Prettier', link: '/tools/eslint-prettier' },
            { text: 'TypeScript后缀区别', link: '/tools/typescript-suffix' },
          ],
        },
      ],
      '/practices/': [
        {
          text: '实践功能',
          items: [
            { text: '概览', link: '/practices/' },
            { text: '文件导入导出', link: '/practices/file-import-export' },
            { text: '文件分片上传', link: '/practices/file-chunk' },
            { text: '文件流转实现', link: '/practices/file-stream' },
            { text: '主题颜色切换', link: '/practices/theme-switch' },
            { text: '面包屑路由', link: '/practices/breadcrumb' },
            { text: '模板打印实现', link: '/practices/print-template' },
            { text: '前端埋点', link: '/practices/front-end-tracking' },
            { text: '递归组件应用', link: '/practices/recursive-component' },
            { text: '发布订阅模式', link: '/practices/pub-sub' },
            { text: '浮动工具栏', link: '/practices/floating-toolbar' },
            { text: '后端返回路由', link: '/practices/dynamic-route' },
            { text: '禁用开发者工具', link: '/practices/disable-devtools' },
            { text: '组件二次封装', link: '/practices/component-wrapper' },
            { text: 'Table表格封装', link: '/practices/table-wrapper' },
            { text: 'Hook使用详解', link: '/practices/hook-usage' },
            { text: 'Sass预编译器', link: '/practices/sass' },
            { text: 'Web Worker', link: '/practices/web-worker' },
            { text: 'Observer API', link: '/practices/observer-api' },
            { text: 'Vue路由恢复', link: '/practices/vue-router-restore' },
          ],
        },
      ],
      '/async/': [
        {
          text: '异步编程',
          items: [
            { text: '概览', link: '/async/' },
            { text: '并发请求处理', link: '/async/concurrent-requests' },
          ],
        },
      ],
      '/git/': [
        {
          text: 'Git相关',
          items: [
            { text: '概览', link: '/git/' },
            { text: 'git revert使用', link: '/git/revert' },
          ],
        },
      ],
      '/other/': [
        {
          text: '其他',
          items: [
            { text: '概览', link: '/other/' },
            { text: 'keep-alive的name属性', link: '/other/keep-alive' },
            { text: 'AntDesign行列合并', link: '/other/antd-table-merge' },
            { text: '英语学习', link: '/other/english-learning' },
            { text: 'vben-admin打包说明', link: '/other/vben-admin-build' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'GitHub', link: '#' }],
    footer: {
      message: 'DocsForU',
      copyright: '© 2026',
    },
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: '页面导航',
    },
    lastUpdated: {
      text: '最后更新于',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
  },
})





