# Vue 响应式原理解析

## Vue 2 响应式原理

Vue 2 使用 **Object.defineProperty** 来实现数据响应式。

### 工作原理

想象你有一个办公室（Vue 组件），同事们（数据属性）都在自己的工位上工作。

1. **初始化**：Vue 遍历你提供的 data 对象，像贴便签一样在每个同事（属性）的工位上贴上 getter 和 setter。

2. **数据读取**：当组件需要数据时（比如读取 `this.message`），贴了便签的同事就会记录："哦，有人需要我"，并将组件记为依赖。

3. **数据修改**：当你修改数据（`this.message = '新消息'`），那个同事就会通知办公室："我的数据变了，所有依赖我的组件都更新一下！"

### 代码示例

```typescript
// Vue 2 响应式原理简化版
function defineReactive(obj: any, key: string, value: any) {
  // 存储依赖这些数据的组件（"订阅者"）
  const dep = [];

  // 使用 Object.defineProperty
  Object.defineProperty(obj, key, {
    get() {
      // 当数据被访问时，记录依赖
      console.log(`有人正在读取 ${key}: ${value}`);
      dep.push(currentComponent); // 假设 currentComponent 是当前活动的组件
      return value;
    },
    set(newValue) {
      if (value !== newValue) {
        // 当数据被修改时，通知所有依赖的组件
        console.log(`${key} 从 ${value} 变成了 ${newValue}`);
        value = newValue;
        dep.forEach(component => component.update()); // 通知组件更新
      }
    }
  });
}
```

### Vue 2 的局限性

1. **无法直接检测数组索引变化**：
   ```typescript
   this.items[0] = '新值'; // Vue 不会检测到这个变化
   ```

2. **无法检测对象属性的添加/删除**：
   ```typescript
   this.newProperty = '新值'; // Vue 不会检测到
   delete this.someProperty; // Vue 也不会检测到
   ```

3. **需要初始化时就声明所有数据**，不然就不是响应式的。

---

## Vue 3 响应式原理

Vue 3 使用 **Proxy** 来实现数据响应式，这就像是给整个办公室装了个智能监控摄像头。

### 工作原理

想象你有一个智能办公室，整个办公室由一个中央智能系统（Proxy）统一管理：

1. **初始化**：你不需要单独给每个同事贴便签。只需要设置一个"智能监控系统"（Proxy）来监控整个办公室。

2. **数据读取**：当有人访问数据时，中央系统会记录："有人访问了数据"。

3. **数据修改**：无论是什么操作（改变值、添加属性、删除属性、修改数组），摄像头都会捕捉到，立即通知所有相关的组件更新。

### 代码示例

```typescript
// Vue 3 响应式原理简化版
function reactive(obj: any) {
  // 使用 Proxy 监听整个对象
  return new Proxy(obj, {
    get(target, key) {
      // 当任何属性被访问时，触发这里
      console.log(`有人正在读取 ${key}: ${target[key]}`);
      track(target, key); // 记录依赖
      return target[key];
    },
    set(target, key, value) {
      // 当任何属性被修改时，触发这里
      console.log(`${key} 从 ${target[key]} 变成了 ${value}`);
      target[key] = value;
      trigger(target, key); // 触发更新
      return true;
    },
    deleteProperty(target, key) {
      // 当属性被删除时，触发这里
      console.log(`删除了属性 ${key}`);
      delete target[key];
      trigger(target, key);
      return true;
    }
  });
}

// 使用示例
const state = reactive({
  count: 0,
  name: '张三'
});

state.count = 1; // 可以检测到
state.age = 25;   // 可以检测到新属性添加
delete state.name; // 可以检测到删除
```

### Proxy 的优势

1. **可以检测数组索引和长度的变化**：
   ```typescript
   this.items[0] = '新值'; // Vue 3 能检测到
   this.items.length = 0;  // Vue 3 也能检测到
   ```

2. **可以检测对象属性的添加/删除**：
   ```typescript
   this.newProperty = '新值'; // Vue 3 能检测到
   delete this.someProperty; // Vue 3 也能检测到
   ```

3. **惰性监听**：只有被访问过的属性才会被监听，性能更好。

## 主要差异总结

| 特性 | Vue 2 | Vue 3 |
|------|-------|-------|
| 实现方式 | Object.defineProperty | Proxy |
| 检测数组变化 | 不支持索引变化，需要使用变异方法 | 完全支持所有数组操作 |
| 检测对象变化 | 只能检测已声明属性，不能添加/删除 | 完全支持所有对象操作 |
| 初始化性能 | 全部递归遍历，初始化较慢 | 惰性监听，初始化更快 |
| 内存占用 | 每个属性都需要存储依赖 | 依赖关系集中管理 |

简单来说，Vue 2 是给每个数据"贴便签"，而 Vue 3 是给整个对象"装摄像头"，后者更强大、更灵活。这就是为什么 Vue 3 能更好地处理复杂的数据变更场景。
