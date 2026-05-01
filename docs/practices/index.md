# 实践功能文档

本目录包含前端开发中常见功能的实现思路和最佳实践。

## 文档列表

### 文件处理
- [文件导入导出](./file-import-export.md) - 文件导入导出功能实现思路
- [文件分片上传](./file-chunk.md) - 大文件分片上传、断点续传、秒传实现
- [文件转换成流](./file-stream.md) - 文件与Blob/Base64互转实现

### UI组件
- [主题颜色切换](./theme-switch.md) - 主题颜色切换实现思路
- [路由面包屑](./breadcrumb.md) - 路由面包屑使用说明
- [浮动工具栏](./floating-toolbar.md) - 浮动工具栏实现
- [递归组件](./recursive-component.md) - 递归组件详解

### 功能实现
- [浏览器打印模板](./print-template.md) - 浏览器实现模板打印思路
- [前端埋点](./front-end-tracking.md) - 前端埋点与navigator.sendBeacon详解
- [发布订阅模式](./pub-sub.md) - 发布订阅模式设计思路
- [后端返回路由](./dynamic-route.md) - 后端返回路由思路
- [禁用开发者工具](./disable-devtools.md) - 开发者工具禁用实现思路

### 组件封装
- [组件二次封装](./component-wrapper.md) - 组件二次封装思路
- [Table表格封装](./table-wrapper.md) - Table表格的二次封装
- [Hook使用详解](./hook-usage.md) - Hook的使用详解

### 工具与API
- [Sass预编译器](./sass.md) - 预编译器相关Sass笔记
- [Web Worker](./web-worker.md) - Web Worker使用示例
- [Observer API](./observer-api.md) - Observer API使用示例
- [Vue路由恢复](./vue-router-restore.md) - Vue路由恢复滚动位置与上次访问路由

## 技术栈

- Vue 3 + TypeScript
- Express + TypeScript
- 现代浏览器API

## 使用说明

每个文档包含：
1. 实现思路概述
2. 核心代码示例
3. 关键技术点
4. 最佳实践建议