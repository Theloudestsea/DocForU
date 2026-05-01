# TypeScript 定义类型不同后缀的区别分析

## 核心区别

在前端 TypeScript 项目中，`.ts` 和 `.d.ts` **确实都可以定义类型**（如 `interface`, `type`），编译器在类型检查时都能识别它们。但是，它们在 **编译行为、用途语义和工程规范** 上有本质区别。

简单来说：
- **`.ts`** = **实现 + 类型**（会编译成 `.js` 运行代码）
- **`.d.ts`** = **纯类型声明**（不会生成 `.js`，仅用于类型检查）

## 详细对比

### 1. 核心区别：编译产出与运行时

| 特性 | `.ts` 文件 | `.d.ts` 文件 (Declaration File) |
| :--- | :--- | :--- |
| **内容** | 可以包含**实现逻辑**（函数体、类方法）和类型 | **只能包含类型声明**（接口、类型别名、函数签名），**不能有实现** |
| **编译产出** | 编译后会生成对应的 **`.js` 文件** (运行时代码) | 编译后**不生成 `.js` 文件**，仅保留 `.d.ts` (或忽略) |
| **运行时开销** | 有 (代码会被执行) | **无** (代码在运行时被擦除) |
| **主要用途** | 编写业务逻辑、组件、工具函数 | 描述现有 JS 库的类型、 augment 全局类型、发布纯类型包 |

### 2. 代码示例对比

#### `.ts` 文件 (有实现)
```typescript
// user.ts
export interface User {
  id: number;
  name: string;
}

// 这里有具体实现，编译后会变成 JS 代码
export function createUser(name: string): User {
  return { id: Date.now(), name };
}
```
*编译后：生成 `user.js` (可运行) 和 `user.d.ts` (类型描述)*

#### `.d.ts` 文件 (纯声明)
```typescript
// user.d.ts
export interface User {
  id: number;
  name: string;
}

// 只能用 declare，不能有函数体 {}
export declare function createUser(name: string): User;
```
*编译后：不生成 `user.js`，如果导入这个文件，只能获取类型信息，无法运行函数。*

## 使用场景与含义

### 什么时候用 `.ts`？
- **90% 的日常开发场景**。
- 你的业务代码、组件、Hooks、Utils 都应该写在 `.ts` 中。
- 即使该文件只导出类型（没有运行时逻辑），通常也建议用 `.ts`，因为构建工具（Vite/Webpack）处理 `.ts` 更统一，且可以通过配置自动生成 `.d.ts`。

### 什么时候用 `.d.ts`？
1. **为没有类型的 JS 库编写类型**：
   比如你引入了一个老的 `jquery.js`，你需要写 `jquery.d.ts` 来告诉 TS 这个库有哪些方法。
2. **全局类型增强 (Augmentation)**：
   比如 `src/types/global.d.ts`，用来扩展 `window` 对象或内置原型。
   ```typescript
   // global.d.ts
   interface Window {
     myCustomConfig: any;
   }
   ```
3. **发布纯类型包 (Type-only Package)**：
   如果你维护一个 npm 包，且只想分享类型而不分享代码（极少见），或者手动维护库的类型定义文件。
4. **隔离类型定义**：
   在大型项目中，有时会将公共类型提取到 `types/xxx.d.ts` 以避免循环依赖，但这不是强制的。

## 常见误区与注意事项

### ❌ 误区 1：在 `.d.ts` 中写逻辑
```typescript
// ❌ 错误：d.ts 中不能有实现
export function add(a: number, b: number) { 
  return a + b; 
}
// 编译器会报错：Implementations should not be visible in declaration files
```

### ❌ 误区 2：导入 `.d.ts` expecting 运行时代码
```typescript
// ❌ 错误：d.ts 文件不包含运行时逻辑
import { createUser } from './user.d.ts'; 
createUser('Alice'); // 运行时会报错：createUser is not a function
```
*解释：`.d.ts` 文件在打包时通常被忽略或擦除，不包含实际函数代码。*

### ✅ 最佳实践：类型与代码共存
在现代前端工程（如 Vite + React/Vue）中，**推荐将类型写在 `.ts` 文件中**，与实现放在一起（Colocation）。
```typescript
// user.ts
export type User = { ... }; // 类型
export const fetchUser = () => { ... }; // 实现
```
*理由：*
1. 维护方便（类型和实现在一起）。
2. 构建工具链对 `.ts` 支持最好。
3. 如果需要发布库，通过 `tsconfig.json` 设置 `"declaration": true`，编译器会自动从 `.ts` 生成 `.d.ts`。

## 总结

| 问题 | 回答 |
| :--- | :--- |
| **都能定义类型吗？** | **能**。编译器对两者的类型解析能力一致。 |
| **有什么区别？** | `.ts` 包含运行时代码，`.d.ts` 仅编译时存在。 |
| **日常开发选哪个？** | 首选 **`.ts`**。除非你需要描述第三方 JS 库或修改全局类型，否则不要手动创建 `.d.ts`。 |
| **别的含义？** | `.d.ts` 是一种**契约**，它告诉消费者"这个库长什么样"，但不提供"这个库怎么运行"。 |

**建议：**
在你的业务项目中，尽量统一使用 **`.ts`**。只有当你需要为 `node_modules` 中的 JS 库补全类型，或者需要定义全局变量时，才创建 `.d.ts` 文件（通常放在 `src/types/` 或 `@types/` 目录下）。