# Observer API使用示例

## 概述

Observer API用于监听DOM变化、元素可见性、性能指标等。

## IntersectionObserver

### 1. 基础用法
```typescript
// 创建观察器
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      console.log('元素进入视口');
    } else {
      console.log('元素离开视口');
    }
  });
}, {
  threshold: 0.5 // 50%可见时触发
});

// 观察元素
const element = document.querySelector('.target');
observer.observe(element);

// 停止观察
observer.unobserve(element);
observer.disconnect();
```

### 2. 图片懒加载
```typescript
function lazyLoadImages() {
  const images = document.querySelectorAll('img[data-src]');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src!;
        img.removeAttribute('data-src');
        observer.unobserve(img);
      }
    });
  });
  
  images.forEach(img => observer.observe(img));
}
```

### 3. Vue3指令
```typescript
// directives/lazy.ts
import { Directive } from 'vue';

export const vLazy: Directive = {
  mounted(el, binding) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          el.src = binding.value;
          observer.unobserve(el);
        }
      });
    });
    
    observer.observe(el);
    
    // 保存observer用于清理
    el._observer = observer;
  },
  unmounted(el) {
    el._observer?.disconnect();
  }
};

// 使用: <img v-lazy="imageUrl" />
```

## MutationObserver

### 1. 基础用法
```typescript
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      console.log('子节点变化');
    }
    if (mutation.type === 'attributes') {
      console.log('属性变化');
    }
  });
});

// 观察目标节点
const target = document.querySelector('#app');
observer.observe(target, {
  childList: true, // 观察子节点
  attributes: true, // 观察属性
  subtree: true // 观察所有后代节点
});

// 停止观察
observer.disconnect();
```

### 2. Vue3中使用
```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const containerRef = ref<HTMLElement>();
let observer: MutationObserver | null = null;

onMounted(() => {
  if (!containerRef.value) return;
  
  observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      console.log('DOM变化:', mutation);
    });
  });
  
  observer.observe(containerRef.value, {
    childList: true,
    subtree: true
  });
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>
```

## ResizeObserver

### 1. 基础用法
```typescript
const observer = new ResizeObserver((entries) => {
  entries.forEach(entry => {
    const { width, height } = entry.contentRect;
    console.log(`尺寸变化: ${width} x ${height}`);
  });
});

const element = document.querySelector('.resizable');
observer.observe(element);
```

### 2. Vue3组合式API
```typescript
// hooks/useResizeObserver.ts
import { ref, onMounted, onUnmounted } from 'vue';

export function useResizeObserver(target: Ref<HTMLElement | null>) {
  const width = ref(0);
  const height = ref(0);
  
  let observer: ResizeObserver | null = null;
  
  onMounted(() => {
    if (!target.value) return;
    
    observer = new ResizeObserver((entries) => {
      entries.forEach(entry => {
        width.value = entry.contentRect.width;
        height.value = entry.contentRect.height;
      });
    });
    
    observer.observe(target.value);
  });
  
  onUnmounted(() => {
    observer?.disconnect();
  });
  
  return { width, height };
}
```

## PerformanceObserver

### 1. 基础用法
```typescript
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log('性能指标:', entry);
  });
});

// 观察不同类型的性能条目
observer.observe({ entryTypes: ['resource', 'paint', 'longtask'] });
```

### 2. 监控长任务
```typescript
function monitorLongTasks() {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(entry => {
      if (entry.duration > 50) {
        console.warn('长任务:', entry);
      }
    });
  });
  
  observer.observe({ entryTypes: ['longtask'] });
}
```

## 最佳实践

1. **及时清理**：组件卸载时disconnect观察器
2. **批量观察**：一个观察器观察多个元素
3. **阈值设置**：合理设置threshold/throttle
4. **性能考虑**：避免频繁触发回调
5. **兼容性**：检查浏览器支持情况
6. **错误处理**：处理观察器异常

## 常见问题

1. **内存泄漏**：未disconnect导致内存泄漏
2. **性能影响**：大量观察可能影响性能
3. **兼容性**：某些API在旧浏览器中不支持
4. **回调时机**：回调触发时机可能不符合预期