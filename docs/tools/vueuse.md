# VueUse 工具库

VueUse 是 Vue 生态中最流行的工具库，提供了 **200+** 个基于 Composition API 的实用函数。

## 核心/高频使用的工具

- `useStorage` - 本地存储同步
- `useFetch` - 数据获取
- `useDark` / `useToggle` - 暗黑模式
- `useClipboard` - 剪贴板
- `useElementVisibility` - 元素可见性
- `useMouse` / `useMouseInElement` - 鼠标追踪
- `useWindowSize` / `useElementSize` - 尺寸响应式
- `useDebounce` / `useThrottle` - 防抖节流
- `useCounter` - 计数器
- `useInterval` / `useTimeout` - 定时器
- `usePermission` - 权限管理
- `useFullscreen` - 全屏
- `useDraggable` - 拖拽
- `useInfiniteScroll` - 无限滚动
- `useIntersectionObserver` - 交叉观察

## 1. 浏览器相关（Browser）

### useDark / useToggle - 暗黑模式切换
最经典的组合，一键实现暗黑模式：

```typescript
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()  // 自动检测系统偏好，持久化到 localStorage
const toggleDark = useToggle(isDark)

// 模板中使用
<button @click="toggleDark()">
  {{ isDark ? 'Dark' : 'Light' }}
</button>
```

### useClipboard - 剪贴板操作
```typescript
import { useClipboard } from '@vueuse/core'

const { text, copy, copied, isSupported } = useClipboard()

const copyText = async () => {
  await copy('要复制的文本')
  // copied 会在复制成功后短暂变为 true，方便显示提示
}
```

### useFetch - 增强版 fetch
自动处理 JSON、取消请求、状态管理：

```typescript
import { useFetch } from '@vueuse/core'

const { data, error, isFetching, abort } = useFetch('https://api.example.com/data', {
  refetch: true,           // 窗口聚焦时自动重新请求
  beforeFetch({ options }) {
    options.headers.Authorization = `Bearer ${token}`
    return { options }
  }
}).json() // 自动解析 JSON
```

### useWindowSize / useElementSize - 响应式尺寸
```typescript
import { useWindowSize, useElementSize } from '@vueuse/core'

const { width, height } = useWindowSize()  // 窗口大小

// 元素尺寸
const el = ref(null)
const { width: elWidth, height: elHeight } = useElementSize(el)
```

## 2. 状态管理（State）

### useStorage - 响应式 LocalStorage
自动同步 localStorage，支持对象、数组自动序列化：

```typescript
import { useStorage } from '@vueuse/core'

// 基础用法
const state = useStorage('my-store', { name: 'Vue', version: 3 })

// 支持 sessionStorage
const session = useStorage('session-key', 'default', sessionStorage)

// 支持自定义序列化（如存储 Date）
const custom = useStorage('custom-key', new Date(), localStorage, {
  serializer: { read: Date.parse, write: (v) => v.toISOString() }
})
```

### useRefHistory - 操作历史/撤销重做
```typescript
import { useRefHistory } from '@vueuse/core'

const counter = ref(0)
const { history, undo, redo, canUndo, canRedo } = useRefHistory(counter, {
  capacity: 10  // 最多保留 10 条历史
})

// 可以撤销/重做
<button @click="undo" :disabled="!canUndo">Undo</button>
<button @click="redo" :disabled="!canRedo">Redo</button>
```

## 3. 元素/交互（Elements）

### useIntersectionObserver - 无限滚动/懒加载
```typescript
import { useIntersectionObserver } from '@vueuse/core'

const target = ref(null)
const targetIsVisible = ref(false)

useIntersectionObserver(
  target,
  ([{ isIntersecting }]) => {
    targetIsVisible.value = isIntersecting
    if (isIntersecting) loadMore() // 进入视口加载更多
  },
  { threshold: 0.5 }  // 50% 可见时触发
)
```

### useElementVisibility - 元素可见性检测
简化版的 IntersectionObserver：

```typescript
import { useElementVisibility } from '@vueuse/core'

const el = ref(null)
const isVisible = useElementVisibility(el)  // 自动追踪可见状态
```

### useDraggable - 拖拽
让元素可拖拽：

```typescript
import { useDraggable } from '@vueuse/core'

const el = ref<HTMLElement | null>(null)
const { x, y, style } = useDraggable(el, {
  initialValue: { x: 100, y: 100 },
  preventDefault: true,
  stopPropagation: true
})

// 绑定到元素
<div ref="el" :style="style" class="fixed">
  我可以被拖拽 {{ x }}, {{ y }}
</div>
```

### useFullscreen - 全屏控制
```typescript
import { useFullscreen } from '@vueuse/core'

const el = ref(null)
const { isFullscreen, enter, exit, toggle } = useFullscreen(el)

<button @click="toggle">切换全屏</button>
```

## 4. 传感器（Sensors）

### useMouse / useMouseInElement - 鼠标追踪
```typescript
import { useMouse, useMouseInElement } from '@vueuse/core'

// 全局鼠标位置
const { x, y } = useMouse()

// 相对于某个元素的鼠标位置
const target = ref(null)
const { elementX, elementY, isOutside } = useMouseInElement(target)
```

### useKeyModifier - 监听修饰键
检测 Shift/Ctrl/Alt 是否被按下：

```typescript
import { useKeyModifier } from '@vueuse/core'

const capsLock = useKeyModifier('CapsLock')
const shift = useKeyModifier('Shift')
```

### useOnline / useNetwork - 网络状态
```typescript
import { useOnline } from '@vueuse/core'

const online = useOnline()  // 布尔值，是否联网
// 或
const { isOnline, saveData, effectiveType } = useNetwork() // 更详细的网络信息
```

## 5. 时间与动画（Time & Animation）

### useInterval / useIntervalFn - 定时器
比 setInterval 更易管理，自动清理：

```typescript
import { useInterval, useIntervalFn } from '@vueuse/core'

// 响应式计数器（每 1000ms 增加）
const counter = useInterval(1000)

// 自定义回调
const { pause, resume } = useIntervalFn(() => {
  console.log('每秒执行')
}, 1000)
```

### useTransition - 数值过渡动画
数字变化时产生平滑过渡效果：

```typescript
import { useTransition } from '@vueuse/core'

const source = ref(0)
const output = useTransition(source, {
  duration: 1000,
  transition: [0.75, 0, 0.25, 1],  // 贝塞尔曲线
})

source.value = 100  // output 会从 0 平滑过渡到 100
```

### useDateFormat / useTimeAgo - 时间格式化
```typescript
import { useDateFormat, useTimeAgo } from '@vueuse/core'

const formatted = useDateFormat(new Date(), 'YYYY-MM-DD HH:mm:ss')
const timeAgo = useTimeAgo(new Date('2023-01-01'))  // "2 years ago"
```

## 6. 实用工具（Utilities）

### useDebounceFn / useThrottleFn - 防抖节流
```typescript
import { useDebounceFn, useThrottleFn } from '@vueuse/core'

const debouncedSearch = useDebounceFn((text) => {
  api.search(text)
}, 500)

const throttledScroll = useThrottleFn(() => {
  handleScroll()
}, 100)
```

### useCounter - 计数器逻辑
```typescript
import { useCounter } from '@vueuse/core'

const { count, inc, dec, set, reset } = useCounter(0, { min: 0, max: 10 })
```

### usePermission - 浏览器权限
```typescript
import { usePermission } from '@vueuse/core'

const microphone = usePermission('microphone')
const camera = usePermission('camera')
// 返回状态：'prompt' | 'denied' | 'granted'
```

## 7. 高频组合使用示例

### 搜索框（防抖 + 本地存储）
```typescript
import { ref, watch } from 'vue'
import { useStorage, useDebounceFn } from '@vueuse/core'

const search = useStorage('search-query', '')
const results = ref([])

const debouncedSearch = useDebounceFn(async (query) => {
  results.value = await fetchResults(query)
}, 300)

watch(search, (newVal) => debouncedSearch(newVal))
```

### 图片懒加载 + 淡入动画
```typescript
import { ref, watch } from 'vue'
import { useIntersectionObserver, useTransition } from '@vueuse/core'

const imgRef = ref(null)
const isVisible = ref(false)
const opacity = useTransition(isVisible, { duration: 500 })

useIntersectionObserver(imgRef, ([{ isIntersecting }]) => {
  if (isIntersecting) isVisible.value = true
})
```

## 安装与按需导入

```bash
npm i @vueuse/core
```

**推荐**：使用自动导入（配合 unplugin-auto-import）：

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: ['vue', '@vueuse/core'],  // 自动导入 VueUse
    }),
  ],
})
```

这样无需手动 import 即可直接使用所有函数。

## 总结

VueUse 几乎涵盖了前端开发中所有的常见交互需求，从**状态持久化**、**网络请求**、**动画过渡**到**硬件传感器**（陀螺仪、地理位置等），极大减少了重复造轮子的工作。建议优先使用 `useStorage`、`useFetch`、`useDark`、`useIntersectionObserver` 和 `useDebounceFn` 这几个高频工具。