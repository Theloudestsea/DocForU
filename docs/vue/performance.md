# Vue 性能优化方案

## 一、编译时优化

### 1. 静态节点提升

Vue 3 的编译器会自动识别静态节点并提升到渲染函数之外，避免每次渲染时重新创建：

```vue
<template>
  <!-- 这个 div 是静态的，会被提升 -->
  <div class="header">
    <h1>标题</h1>
  </div>
  
  <!-- 这个是动态的，不会被提升 -->
  <div>{{ dynamicContent }}</div>
</template>
```

### 2. Tree Shaking

Vue 3 支持 Tree Shaking，未使用的 API 会被移除：

```typescript
// 只导入使用的 API
import { ref, computed } from 'vue'
// 而不是 import * as Vue from 'vue'
```

### 3. 缓存事件处理函数

```vue
<template>
  <!-- Vue 3 会自动缓存内联事件处理函数 -->
  <button @click="handleClick">点击</button>
</template>
```

## 二、组件优化

### 1. 使用 `v-memo` 缓存渲染结果

```vue
<template>
  <!-- 只有 item.id 或 item.selected 变化时才重新渲染 -->
  <div v-for="item in list" :key="item.id" v-memo="[item.selected]">
    <p>{{ item.name }}</p>
    <p>Selected: {{ item.selected }}</p>
  </div>
</template>
```

### 2. 合理使用 `v-once`

```vue
<template>
  <!-- 只渲染一次，后续更新会被忽略 -->
  <header v-once>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
  </header>
</template>
```

### 3. 组件懒加载

```typescript
// 路由级别懒加载
const routes = [
  {
    path: '/dashboard',
    component: () => import('./views/Dashboard.vue')
  }
]

// 组件级别懒加载
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(() => 
  import('./components/HeavyComponent.vue')
)
```

### 4. 使用 `shallowRef` 减少深度响应

```typescript
import { shallowRef, triggerRef } from 'vue'

// 只有 .value 变化才触发更新
const state = shallowRef({ count: 0 })

// 需要手动触发更新
state.value.count++
triggerRef(state)
```

## 三、列表优化

### 1. 虚拟滚动

使用虚拟滚动库处理大列表：

```vue
<template>
  <RecycleScroller
    :items="items"
    :item-size="50"
    key-field="id"
  >
    <template #default="{ item }">
      <div class="item">{{ item.name }}</div>
    </template>
  </RecycleScroller>
</template>

<script setup>
import { RecycleScroller } from 'vue-virtual-scroller'
</script>
```

### 2. 列表项唯一 key

```vue
<template>
  <!-- 使用唯一 ID 作为 key，避免使用 index -->
  <div v-for="item in list" :key="item.id">
    {{ item.name }}
  </div>
</template>
```

### 3. 分页或无限滚动

```typescript
// 分页
const pageSize = 20
const currentPage = ref(1)
const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return list.value.slice(start, start + pageSize)
})

// 无限滚动
const loadMore = async () => {
  if (loading.value) return
  loading.value = true
  const newItems = await fetchItems(page.value)
  list.value.push(...newItems)
  page.value++
  loading.value = false
}
```

## 四、响应式优化

### 1. 避免不必要的响应式转换

```typescript
import { shallowReactive, markRaw } from 'vue'

// 大型只读数据，不需要响应式
const constants = markRaw({
  API_URL: 'https://api.example.com',
  MAX_SIZE: 1024
})

// 只需要浅层响应
const state = shallowReactive({
  list: [],
  loading: false
})
```

### 2. 使用 `computed` 缓存计算

```typescript
import { computed } from 'vue'

// 好：computed 会缓存结果
const filteredList = computed(() => {
  return list.value.filter(item => item.active)
})

// 差：每次访问都会重新计算
const getFilteredList = () => {
  return list.value.filter(item => item.active)
}
```

### 3. 避免在模板中创建对象

```vue
<template>
  <!-- 差：每次渲染都创建新对象 -->
  <div :style="{ color: activeColor }">...</div>
  
  <!-- 好：使用计算属性或预定义 -->
  <div :style="dynamicStyle">...</div>
</template>

<script setup>
const dynamicStyle = computed(() => ({
  color: activeColor.value
}))
</script>
```

## 五、网络优化

### 1. 请求防抖

```typescript
import { useDebounceFn } from '@vueuse/core'

const searchQuery = ref('')

const debouncedSearch = useDebounceFn(async (query) => {
  const results = await fetchSearchResults(query)
  // 更新结果
}, 300)

watch(searchQuery, (newQuery) => {
  debouncedSearch(newQuery)
})
```

### 2. 数据预加载

```typescript
// 路由级别预加载
router.beforeResolve(async (to) => {
  const components = to.matched
    .flatMap(record => Object.values(record.components))
  
  await Promise.all(
    components.map(component => {
      if (component?.__asyncLoader) {
        return component.__asyncLoader()
      }
    })
  )
})
```

### 3. 缓存策略

```typescript
import { useQuery } from '@tanstack/vue-query'

const { data } = useQuery({
  queryKey: ['todos'],
  queryFn: fetchTodos,
  staleTime: 5 * 60 * 1000, // 5 分钟内数据被认为是新鲜的
  cacheTime: 30 * 60 * 1000 // 缓存保留 30 分钟
})
```

## 六、CSS 优化

### 1. 使用 `v-bind` 动态样式

```vue
<script setup>
const theme = ref('dark')
</script>

<style scoped>
.container {
  /* 响应式绑定 */
  background-color: v-bind(theme === 'dark' ? '#1a1a1a' : '#ffffff');
}
</style>
```

### 2. Scoped 样式

```vue
<style scoped>
/* 样式只作用于当前组件 */
.button {
  color: blue;
}
</style>
```

## 七、开发工具

### 1. Vue Devtools

- 组件树检查
- 响应式依赖追踪
- 性能分析

### 2. 性能分析

```typescript
import { onMounted, onUpdated } from 'vue'

onMounted(() => {
  console.time('mount')
})

onUpdated(() => {
  console.timeEnd('mount')
  console.log('Component updated')
})
```

## 八、最佳实践总结

| 优化方向 | 具体措施 |
|----------|----------|
| 编译时 | 使用生产构建、启用 Tree Shaking |
| 组件 | 懒加载、使用 `v-memo`、合理使用 `v-once` |
| 列表 | 虚拟滚动、唯一 key、分页加载 |
| 响应式 | `shallowRef`、`markRaw`、缓存计算 |
| 网络 | 防抖、预加载、缓存策略 |
| CSS | Scoped 样式、动态绑定 |

参考链接：
- https://xiaoman.blog.csdn.net/article/details/126811832
