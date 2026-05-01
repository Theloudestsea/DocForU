# Vue3 nextTick 用法详解

## 一、什么是 nextTick

在 Vue 3 中，`nextTick` 是一个非常核心的异步工具。简单来说，它的作用是：**等待下一次 DOM 更新循环结束后执行延迟回调。**

在 Vue 中，当你修改响应式状态（例如 `ref` 或 `reactive`）时，DOM **不会立即更新**。Vue 会开启一个队列，并缓冲在同一事件循环中发生的所有数据变更。这样做是为了避免不必要的计算和 DOM 操作。

## 二、为什么需要 nextTick

当你修改了数据并想立即获取更新后的 DOM 状态（如元素的宽度、滚动位置或焦点）时，你会发现 DOM 还没变。这时就需要 `nextTick`。

## 三、基本用法

在 Vue 3 的组合式 API 中，我们通常通过从 `vue` 导出 `nextTick` 来使用。它返回一个 **Promise**，所以配合 `async/await` 使用非常优雅。

### 方式 A：使用 async/await（推荐）

```javascript
import { ref, nextTick } from 'vue'

const message = ref('Hello')
const textElement = ref(null)

const updateMessage = async () => {
  message.value = 'Updated!'
  
  // 此时 DOM 还没更新
  console.log(textElement.value.innerText) // 输出：'Hello'

  await nextTick()
  
  // 此时 DOM 已经完成更新
  console.log(textElement.value.innerText) // 输出：'Updated!'
}
```

### 方式 B：回调函数形式

```javascript
nextTick(() => {
  // DOM 更新后的操作
})
```

## 四、常见使用场景

| 场景 | 描述 |
|------|------|
| **获取 DOM 尺寸** | 改变内容后，需要计算容器的新高度 |
| **输入框聚焦** | 改变 `v-if` 显示输入框后，立即调用 `.focus()` |
| **集成第三方库** | 当数据变化导致 DOM 结构改变，需要通知轮播图或滚动条插件重刷 |

## 五、实战示例：自动聚焦输入框

假设你有一个"编辑"按钮，点击后显示输入框并希望它自动获得焦点：

```vue
<template>
  <div v-if="isEditing">
    <input ref="inputRef" v-model="text" />
  </div>
  <button v-else @click="handleEdit">编辑</button>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const isEditing = ref(false)
const inputRef = ref(null)

const handleEdit = async () => {
  isEditing.value = true
  
  // 报错！此时 input 还没渲染到 DOM 中
  // inputRef.value.focus() 
  
  await nextTick()
  
  // 现在可以了
  inputRef.value.focus()
}
</script>
```

## 六、浏览器事件循环机制

要理解 nextTick 的原理，需要先了解浏览器事件循环的宏/微队列：

| 队列类型 | 包含的任务类型 | 执行优先级 | 执行后是否触发 DOM 渲染 |
|----------|---------------|------------|------------------------|
| 微队列 | Promise.then、MutationObserver、queueMicrotask | 高（先执行） | ❌ 不触发 |
| 宏队列 | setTimeout、setInterval、UI 事件、网络请求回调 | 低（后执行） | ✅ 可能触发 |

**核心规则**：
1. 每次事件循环中，先清空「所有微队列任务」，再执行「一个宏队列任务」
2. DOM 渲染（重排/重绘）不会在微队列执行过程中触发，只会在「微队列清空后、下一个宏队列任务执行前」判断是否需要渲染

## 七、Vue3 中 DOM 渲染的执行时机

> DOM 渲染是浏览器的「渲染时机」，而非队列任务；Vue3 触发 DOM 更新的逻辑是放在「微队列」中执行的，而 DOM 渲染则发生在「微队列清空后的浏览器渲染时机」。

### 完整流程示例

```vue
<template>
  <div id="content">{{ count }}</div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
const count = ref(0)

const handleClick = () => {
  // 1. 修改响应式数据
  count.value = 1
  
  // 此时 DOM 未更新，获取到的还是旧值
  console.log(document.getElementById('content').textContent) // 0
  
  // 2. nextTick 中获取更新后的 DOM
  nextTick(() => {
    console.log(document.getElementById('content').textContent) // 1
  })
}
</script>
```

#### 执行步骤

1. **修改数据触发依赖收集更新**：Vue3 的响应式系统会标记「该数据对应的组件需要更新」，将「组件更新任务」放入「微队列」

2. **当前同步代码执行完毕**：开始处理「微队列」，Vue3 的「组件更新任务」执行：更新组件的 VNode → 对比 diff → 生成真实 DOM

3. **微队列清空，浏览器判断是否渲染**：将更新后的 DOM 渲染到页面

4. **nextTick 回调执行**：由于组件更新任务已经在微队列中执行完毕，`nextTick` 的回调能获取到最新的 DOM

## 八、Vue3 源码验证

### 组件更新任务放入微队列

```typescript
const queue: Function[] = []
let isFlushing = false

export function queueJob(job: Function) {
  if (!queue.includes(job)) {
    queue.push(job)
  }
  if (!isFlushing) {
    isFlushing = true
    // 核心：用 queueMicrotask 将任务放入微队列
    queueMicrotask(flushJobs)
  }
}

function flushJobs() {
  isFlushing = false
  for (const job of queue) {
    job()
  }
  queue.length = 0
}
```

### nextTick 的实现逻辑

```typescript
export function nextTick<T = void>(callback?: () => T): Promise<T> {
  const p = Promise.resolve()
  // 优先放入微队列（Promise.then）
  return p.then(callback)
}
```

**关键对应关系**：
- 组件更新任务（DOM 生成）：微队列（`queueMicrotask`）
- nextTick 回调：微队列（`Promise.then`）
- DOM 渲染：微队列清空后的浏览器渲染时机

## 九、常见误区澄清

### 误区 1：DOM 渲染是宏队列任务

❌ 错误：宏队列任务（如 setTimeout）执行在 DOM 渲染之后

```typescript
count.value = 1
// 微队列：组件更新任务 → DOM 生成
// 浏览器渲染时机：DOM 渲染到页面
setTimeout(() => {
  // 宏队列任务，执行时 DOM 已渲染完成
  console.log(document.getElementById('content').textContent) // 1
}, 0)
```

### 误区 2：nextTick 是宏队列

❌ 错误：Vue3 中 nextTick 优先用微队列（Promise.then），只有在不支持 Promise 的环境下才降级到宏队列（setTimeout）

### 误区 3：修改数据后立即执行 nextTick 会先于组件更新

❌ 错误：Vue3 会保证「组件更新任务」先于 nextTick 回调执行（因为都在微队列，按顺序执行）

```typescript
count.value = 1
// 组件更新任务入队（微队列第1位）
nextTick(() => {
  // 微队列第2位，执行时组件更新已完成
  console.log('nextTick', document.getElementById('content').textContent) // 1
})
```

## 十、总结

### 核心关键点

1. DOM 渲染不是宏/微队列任务，而是浏览器在「微队列清空后、宏队列执行前」的渲染时机
2. Vue3 将「组件 DOM 更新任务」放入**微队列**执行，保证同步代码执行完后再更新 DOM
3. nextTick 回调也放入**微队列**（且在组件更新任务之后），因此能获取到更新后的 DOM
4. 宏队列任务（如 setTimeout）执行时，DOM 已经完成渲染，也能获取最新值，但时机比 nextTick 晚

### 一句话记住

> 数据修改 → 同步代码执行 → 微队列执行（Vue 更新 DOM） → 浏览器渲染（DOM 显示更新） → 宏队列执行；nextTick 利用微队列，在 DOM 更新后、渲染前（或渲染后）执行回调，解决数据与 DOM 不同步问题。

### 原理小贴士

`nextTick` 并不是魔法，它利用了 JavaScript 的 **微任务 (Microtask)** 机制（通常是 `Promise.then`）。

可以把它想象成：你给 Vue 下了一堆装修指令（修改数据），Vue 说："好，我先记在本子上，等会儿统一开工。" 而 `nextTick` 就是你跟在 Vue 后面说："**等你装修完了，立刻喊我进来验收！**"
