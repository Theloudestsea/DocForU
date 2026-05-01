# ESLint + Prettier 格式化方案

## 概述

ESLint 和 Prettier 是前端代码质量保障的黄金组合：
- **ESLint**：负责代码质量检查（语法错误、最佳实践、潜在问题）
- **Prettier**：负责代码格式化（缩进、换行、引号等）

## 配置文件说明

### .eslintrc.js 配置详解

```javascript
// @ts-check - 启用 TypeScript 类型检查
const { defineConfig } = require("eslint-define-config");
module.exports = defineConfig({
  // 标记为根配置，ESLint 不再向上查找配置文件
  root: true,

  // 运行环境配置 - 指定代码运行的环境，启用对应的全局变量
  env: {
    browser: true, // 浏览器环境，启用 window、document 等全局变量
    node: true, // Node.js 环境，启用 process、require 等全局变量
    es6: true, // ES6 语法环境，启用 Promise、Map、Set 等全局变量
  },

  // 解析器配置
  parser: "vue-eslint-parser", // 使用 vue-eslint-parser 解析 .vue 文件
  parserOptions: {
    parser: "@typescript-eslint/parser", // <script> 标签内的 TypeScript 代码使用 ts 解析器
    ecmaVersion: 2020, // ECMAScript 版本，支持 ES2020 语法
    sourceType: "module", // 使用 ES Module 模块系统
    jsxPragma: "React", // JSX 编译指示，指定 JSX 转换的函数
    ecmaFeatures: {
      jsx: true, // 启用 JSX 语法支持
    },
  },

  // 扩展配置 - 继承外部配置集，顺序很重要（后面的会覆盖前面的规则）
  extends: [
    "plugin:vue/vue3-recommended", // Vue 3 推荐规则，包含最佳实践
    "plugin:@typescript-eslint/recommended", // TypeScript 推荐规则
    "prettier", // eslint-config-prettier：关闭所有与 Prettier 冲突的 ESLint 格式化规则
    "plugin:prettier/recommended", // eslint-plugin-prettier：将 Prettier 规则作为 ESLint 规则运行
    "plugin:jest/recommended", // Jest 测试框架推荐规则
  ],

  // 自定义规则配置 - 覆盖或新增规则
  rules: {
    // ======================== Vue 规则 ========================
    "vue/script-setup-uses-vars": "error", // <script setup> 中使用的变量必须被模板引用
    "vue/custom-event-name-casing": "off", // 关闭自定义事件命名规范检查
    "vue/attributes-order": "off", // 关闭 Vue 属性顺序检查
    "vue/one-component-per-file": "off", // 关闭单文件单组件限制
    "vue/html-closing-bracket-newline": "off", // 关闭 HTML 闭合括号换行检查
    "vue/max-attributes-per-line": "off", // 关闭单行最大属性数量限制
    "vue/multiline-html-element-content-newline": "off", // 关闭多行 HTML 元素内容换行检查
    "vue/singleline-html-element-content-newline": "off", // 关闭单行 HTML 元素内容换行检查
    "vue/attribute-hyphenation": "off", // 关闭属性名连字符检查
    "vue/require-default-prop": "off", // 关闭 props 必须有默认值检查

    // Vue 自闭合标签规则配置
    "vue/html-self-closing": [
      "error",
      {
        html: {
          void: "always", // 空元素（如 <br>）必须自闭合：<br />
          normal: "never", // 普通元素不自闭合：<div></div>
          component: "always", // 组件必须自闭合：<MyComponent />
        },
        svg: "always", // SVG 元素必须自闭合
        math: "always", // MathML 元素必须自闭合
      },
    ],

    // ======================== TypeScript 规则 ========================
    "@typescript-eslint/ban-ts-ignore": "off", // 允许使用 @ts-ignore 注释
    "@typescript-eslint/explicit-function-return-type": "off", // 不强制函数返回值类型声明
    "@typescript-eslint/no-explicit-any": "off", // 允许使用 any 类型
    "@typescript-eslint/no-var-requires": "off", // 允许使用 require 语法
    "@typescript-eslint/no-empty-function": "off", // 允许空函数
    "@typescript-eslint/no-use-before-define": "off", // 允许在定义前使用变量
    "@typescript-eslint/ban-ts-comment": "off", // 允许使用 @ts-comment 指令
    "@typescript-eslint/ban-types": "off", // 允许使用特定类型（如 Function）
    "@typescript-eslint/no-non-null-assertion": "off", // 允许使用非空断言操作符 (!)
    "@typescript-eslint/explicit-module-boundary-types": "off", // 不强制模块边界类型声明

    // 未使用变量检查 - 以 _ 开头的变量视为未使用，不报错
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_", // 参数以 _ 开头则忽略
        varsIgnorePattern: "^_", // 变量以 _ 开头则忽略
      },
    ],

    // ======================== JavaScript 基础规则 ========================
    "no-use-before-define": "off", // 允许在定义前使用变量（TypeScript 版本已关闭）

    // 未使用变量检查 - 以 _ 开头的变量视为未使用，不报错
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_", // 参数以 _ 开头则忽略
        varsIgnorePattern: "^_", // 变量以 _ 开头则忽略
      },
    ],

    // 关闭函数括号前空格检查 - 让 Prettier 控制格式化
    "space-before-function-paren": "off",
  },
});
```

## 核心概念

### 1. 配置继承顺序
```javascript
extends: [
  "plugin:vue/vue3-recommended",    // Vue 3 推荐规则
  "plugin:@typescript-eslint/recommended", // TypeScript 推荐规则
  "prettier",                        // 关闭与 Prettier 冲突的规则
  "plugin:prettier/recommended",     // 将 Prettier 作为 ESLint 规则
  "plugin:jest/recommended",         // Jest 测试规则
]
```

**顺序很重要**：后面的配置会覆盖前面的规则，`prettier` 必须放在最后以确保正确关闭冲突规则。

### 2. 环境配置
```javascript
env: {
  browser: true,  // 浏览器环境
  node: true,     // Node.js 环境
  es6: true,      // ES6 语法环境
}
```

### 3. 解析器配置
- **vue-eslint-parser**：解析 `.vue` 文件
- **@typescript-eslint/parser**：解析 TypeScript 代码

## 常用规则说明

### Vue 相关规则
| 规则 | 说明 |
|------|------|
| `vue/script-setup-uses-vars` | 确保 `<script setup>` 中的变量被模板引用 |
| `vue/html-self-closing` | 控制 HTML 自闭合标签的使用 |
| `vue/one-component-per-file` | 关闭单文件单组件限制 |

### TypeScript 相关规则
| 规则 | 说明 |
|------|------|
| `@typescript-eslint/no-explicit-any` | 允许使用 `any` 类型 |
| `@typescript-eslint/no-var-requires` | 允许使用 `require` 语法 |
| `@typescript-eslint/no-unused-vars` | 未使用变量检查（`_` 开头忽略） |

## 最佳实践

### 1. 自动导入配置
配合 `unplugin-auto-import` 实现自动导入：

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', '@vueuse/core'],
    }),
  ],
})
```

### 2. 保存时自动格式化
在 VSCode 中配置：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 3. 忽略文件
创建 `.eslintignore` 文件：

```
node_modules
dist
*.d.ts
```

## 常见问题

### 1. ESLint 和 Prettier 冲突
确保 `extends` 中包含 `"prettier"` 配置，它会关闭所有与 Prettier 冲突的 ESLint 规则。

### 2. TypeScript 类型错误
确保 `parserOptions.parser` 设置为 `"@typescript-eslint/parser"`。

### 3. Vue 文件解析问题
确保使用 `"vue-eslint-parser"` 作为顶层解析器。

## 总结

这套配置方案提供了：
1. **Vue 3 + TypeScript** 的完整支持
2. **Prettier** 格式化集成
3. **灵活的规则配置**（允许 `any`、`require` 等）
4. **未使用变量的智能检查**（`_` 开头忽略）
5. **Jest 测试支持**

通过合理的配置顺序和规则覆盖，实现了代码质量与开发体验的平衡。