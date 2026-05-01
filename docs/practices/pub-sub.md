# 发布订阅模式设计思路

## 概述

发布订阅模式是一种行为设计模式，允许对象之间松耦合地通信。

## 基本实现

### 1. 简单事件总线
```typescript
class EventBus {
  private events: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.events.delete(event);
    } else {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  once(event: string, callback: Function) {
    const onceCallback = (...args: any[]) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}

export const eventBus = new EventBus();
```

### 2. TypeScript类型安全版本
```typescript
type EventMap = {
  [key: string]: (...args: any[]) => void;
};

class TypedEventBus<T extends EventMap> {
  private events = new Map<keyof T, Set<T[keyof T]>>();

  on<K extends keyof T>(event: K, callback: T[K]) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off<K extends keyof T>(event: K, callback?: T[K]) {
    if (!callback) {
      this.events.delete(event);
    } else {
      this.events.get(event)?.delete(callback);
    }
  }

  emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>) {
    this.events.get(event)?.forEach(callback => {
      (callback as Function)(...args);
    });
  }

  once<K extends keyof T>(event: K, callback: T[K]) {
    const onceCallback = ((...args: Parameters<T[K]>) => {
      callback(...args);
      this.off(event, onceCallback);
    }) as T[K];
    this.on(event, onceCallback);
  }
}

// 使用示例
interface MyEvents {
  login: (user: { id: string; name: string }) => void;
  logout: () => void;
  error: (error: Error) => void;
}

const eventBus = new TypedEventBus<MyEvents>();

eventBus.on('login', (user) => {
  console.log(user.name); // 类型安全
});
```

## Vue3集成

### 1. 组合式API
```typescript
// composables/useEventBus.ts
import { ref, onUnmounted } from 'vue';

const eventBus = new EventBus();

export function useEventBus() {
  const callbacks = ref<Map<string, Function[]>>(new Map());

  const on = (event: string, callback: Function) => {
    eventBus.on(event, callback);
    
    if (!callbacks.value.has(event)) {
      callbacks.value.set(event, []);
    }
    callbacks.value.get(event)!.push(callback);
  };

  const off = (event: string, callback?: Function) => {
    eventBus.off(event, callback);
  };

  const emit = (event: string, ...args: any[]) => {
    eventBus.emit(event, ...args);
  };

  // 组件卸载时自动清理
  onUnmounted(() => {
    callbacks.value.forEach((cbs, event) => {
      cbs.forEach(callback => eventBus.off(event, callback));
    });
  });

  return { on, off, emit };
}
```

### 2. 提供/注入模式
```typescript
// plugins/eventBus.ts
import { App } from 'vue';

export const EventBusSymbol = Symbol('EventBus');

export function createEventBus() {
  return new EventBus();
}

export function setupEventBus(app: App) {
  const eventBus = createEventBus();
  app.provide(EventBusSymbol, eventBus);
  app.config.globalProperties.$eventBus = eventBus;
}

// 组件中使用
import { inject } from 'vue';
import { EventBusSymbol } from '@/plugins/eventBus';

const eventBus = inject(EventBusSymbol);
```

## 高级功能

### 1. 命名空间
```typescript
class NamespacedEventBus {
  private buses = new Map<string, EventBus>();

  namespace(name: string): EventBus {
    if (!this.buses.has(name)) {
      this.buses.set(name, new EventBus());
    }
    return this.buses.get(name)!;
  }

  clearNamespace(name: string) {
    this.buses.delete(name);
  }
}

// 使用示例
const eventBus = new NamespacedEventBus();
const userBus = eventBus.namespace('user');
const orderBus = eventBus.namespace('order');

userBus.on('login', () => {});
orderBus.on('created', () => {});
```

### 2. 优先级控制
```typescript
class PriorityEventBus {
  private events = new Map<string, { callback: Function; priority: number }[]>();

  on(event: string, callback: Function, priority = 0) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    const list = this.events.get(event)!;
    list.push({ callback, priority });
    list.sort((a, b) => b.priority - a.priority);
  }

  emit(event: string, ...args: any[]) {
    const list = this.events.get(event);
    if (list) {
      list.forEach(({ callback }) => callback(...args));
    }
  }
}
```

### 3. 异步事件
```typescript
class AsyncEventBus {
  private events = new Map<string, Function[]>();

  async emitAsync(event: string, ...args: any[]) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      await Promise.all(
        callbacks.map(callback => callback(...args))
      );
    }
  }
}
```

## 状态管理集成

### 1. Pinia集成
```typescript
// stores/eventBus.ts
import { defineStore } from 'pinia';

export const useEventBusStore = defineStore('eventBus', {
  state: () => ({
    events: new Map<string, Function[]>()
  }),
  
  actions: {
    on(event: string, callback: Function) {
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }
      this.events.get(event)!.push(callback);
    },
    
    emit(event: string, ...args: any[]) {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.forEach(callback => callback(...args));
      }
    }
  }
});
```

## 最佳实践

1. **类型安全**：使用TypeScript定义事件类型
2. **内存管理**：组件卸载时取消订阅
3. **命名规范**：使用常量定义事件名
4. **错误处理**：事件回调中的错误不应影响其他订阅者
5. **性能考虑**：避免频繁触发大量订阅者的事件
6. **调试支持**：添加事件触发日志

## 常见问题

1. **内存泄漏**：忘记取消订阅导致内存泄漏
2. **事件命名冲突**：使用命名空间避免冲突
3. **调试困难**：事件流难以追踪
4. **循环依赖**：组件间通过事件通信可能产生循环依赖