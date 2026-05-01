# Hook使用详解

## 概述

Hook是Vue3组合式API的核心，用于在组件中复用有状态逻辑。

## 内置Hook

### 1. 生命周期Hook
```typescript
import { onMounted, onUpdated, onUnmounted, onBeforeMount, onBeforeUpdate, onBeforeUnmount } from 'vue';

// 组件挂载前
onBeforeMount(() => {
  console.log('组件即将挂载');
});

// 组件挂载后
onMounted(() => {
  console.log('组件已挂载');
});

// 组件更新前
onBeforeUpdate(() => {
  console.log('组件即将更新');
});

// 组件更新后
onUpdated(() => {
  console.log('组件已更新');
});

// 组件卸载前
onBeforeUnmount(() => {
  console.log('组件即将卸载');
});

// 组件卸载后
onUnmounted(() => {
  console.log('组件已卸载');
});
```

### 2. 响应式Hook
```typescript
import { ref, reactive, computed, watch, watchEffect } from 'vue';

// ref - 基本类型响应式
const count = ref(0);
console.log(count.value); // 0

// reactive - 对象响应式
const state = reactive({
  name: '张三',
  age: 25
});

// computed - 计算属性
const doubleCount = computed(() => count.value * 2);

// watch - 侦听器
watch(count, (newVal, oldVal) => {
  console.log(`count从${oldVal}变为${newVal}`);
});

// watchEffect - 自动追踪依赖
watchEffect(() => {
  console.log(`count的值是: ${count.value}`);
});
```

## 自定义Hook

### 1. 基础Hook结构
```typescript
// hooks/useCounter.ts
import { ref, computed } from 'vue';

export function useCounter(initialValue = 0) {
  const count = ref(initialValue);
  
  const doubleCount = computed(() => count.value * 2);
  
  const increment = () => {
    count.value++;
  };
  
  const decrement = () => {
    count.value--;
  };
  
  const reset = () => {
    count.value = initialValue;
  };
  
  return {
    count,
    doubleCount,
    increment,
    decrement,
    reset
  };
}
```

### 2. 使用示例
```vue
<template>
  <div>
    <p>计数: {{ count }}</p>
    <p>双倍: {{ doubleCount }}</p>
    <button @click="increment">+</button>
    <button @click="decrement">-</button>
    <button @click="reset">重置</button>
  </div>
</template>

<script setup lang="ts">
import { useCounter } from '@/hooks/useCounter';

const { count, doubleCount, increment, decrement, reset } = useCounter(10);
</script>
```

## 常用Hook示例

### 1. useLocalStorage
```typescript
// hooks/useLocalStorage.ts
import { ref, watch } from 'vue';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const stored = localStorage.getItem(key);
  const data = ref<T>(stored ? JSON.parse(stored) : defaultValue);
  
  watch(data, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue));
  }, { deep: true });
  
  return data;
}
```

### 2. useFetch
```typescript
// hooks/useFetch.ts
import { ref, watchEffect } from 'vue';

export function useFetch(url: string) {
  const data = ref(null);
  const loading = ref(false);
  const error = ref(null);
  
  const fetchData = async () => {
    loading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      data.value = await response.json();
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  };
  
  watchEffect(() => {
    fetchData();
  });
  
  return { data, loading, error, refetch: fetchData };
}
```

### 3. useEventListener
```typescript
// hooks/useEventListener.ts
import { onMounted, onUnmounted } from 'vue';

export function useEventListener(
  target: EventTarget,
  event: string,
  handler: (e: Event) => void
) {
  onMounted(() => {
    target.addEventListener(event, handler);
  });
  
  onUnmounted(() => {
    target.removeEventListener(event, handler);
  });
}
```

### 4. useMousePosition
```typescript
// hooks/useMousePosition.ts
import { ref, onMounted, onUnmounted } from 'vue';

export function useMousePosition() {
  const x = ref(0);
  const y = ref(0);
  
  const updateMousePosition = (e: MouseEvent) => {
    x.value = e.clientX;
    y.value = e.clientY;
  };
  
  onMounted(() => {
    window.addEventListener('mousemove', updateMousePosition);
  });
  
  onUnmounted(() => {
    window.removeEventListener('mousemove', updateMousePosition);
  });
  
  return { x, y };
}
```

### 5. useDebounce
```typescript
// hooks/useDebounce.ts
import { ref, watch } from 'vue';

export function useDebounce<T>(value: Ref<T>, delay: number = 300) {
  const debouncedValue = ref<T>(value.value);
  
  let timer: number | null = null;
  
  watch(value, (newValue) => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      debouncedValue.value = newValue;
    }, delay);
  });
  
  return debouncedValue;
}
```

## 组合Hook

### 1. useTable
```typescript
// hooks/useTable.ts
import { ref, reactive, computed } from 'vue';

export function useTable(fetchApi: Function) {
  const loading = ref(false);
  const data = ref<any[]>([]);
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0
  });
  
  const fetchData = async () => {
    loading.value = true;
    try {
      const result = await fetchApi({
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      });
      data.value = result.data;
      pagination.total = result.total;
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      loading.value = false;
    }
  };
  
  const handlePageChange = (page: number) => {
    pagination.currentPage = page;
    fetchData();
  };
  
  const handleSizeChange = (size: number) => {
    pagination.pageSize = size;
    pagination.currentPage = 1;
    fetchData();
  };
  
  const refresh = () => {
    fetchData();
  };
  
  return {
    loading,
    data,
    pagination,
    fetchData,
    handlePageChange,
    handleSizeChange,
    refresh
  };
}
```

## 最佳实践

1. **单一职责**：每个Hook只做一件事
2. **命名规范**：以`use`开头命名
3. **返回值**：返回响应式数据和方法
4. **类型安全**：使用TypeScript定义类型
5. **副作用清理**：在onUnmounted中清理副作用
6. **文档注释**：为Hook添加使用文档

## 常见问题

1. **响应式丢失**：解构时丢失响应式
2. **内存泄漏**：未清理事件监听器
3. **闭包陷阱**：异步回调中访问过期数据
4. **依赖追踪**：watchEffect自动追踪依赖可能不符合预期