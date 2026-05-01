# 异步编程文档

本目录收录 JavaScript 异步编程的实现思路和最佳实践。

## 内容概览

### 并发处理多个请求
实现类似"线程池"或"生产线"的模式，控制并发请求数量。
- [并发请求实现](./concurrent-requests.md)

## 异步编程核心概念

### 1. Promise 基础
```javascript
// 创建 Promise
const promise = new Promise((resolve, reject) => {
  // 异步操作
  if (success) {
    resolve(value);
  } else {
    reject(error);
  }
});

// 使用 Promise
promise
  .then(value => console.log(value))
  .catch(error => console.error(error))
  .finally(() => console.log('完成'));
```

### 2. async/await 语法
```javascript
async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

### 3. 并发控制
```javascript
// Promise.all - 并行执行所有
await Promise.all([fetch(url1), fetch(url2), fetch(url3)]);

// Promise.race - 返回最先完成的结果
await Promise.race([fetch(url1), fetch(url2), fetch(url3)]);

// Promise.allSettled - 等待所有完成（无论成功失败）
await Promise.allSettled([fetch(url1), fetch(url2), fetch(url3)]);
```

## 常见异步模式

### 1. 串行执行
按顺序依次执行异步操作：
```javascript
async function serial(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}
```

### 2. 并行执行
同时执行所有异步操作：
```javascript
async function parallel(tasks) {
  return Promise.all(tasks.map(task => task()));
}
```

### 3. 并发控制
控制同时执行的异步操作数量：
```javascript
async function concurrency(tasks, max) {
  // 实现并发控制逻辑
}
```

## 错误处理最佳实践

### 1. try/catch 包裹
```javascript
async function safeFetch(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}
```

### 2. 超时控制
```javascript
function timeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
  });
}

async function fetchWithTimeout(url, ms) {
  return Promise.race([fetch(url), timeout(ms)]);
}
```

### 3. 重试机制
```javascript
async function retry(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 性能优化

### 1. 避免阻塞主线程
```javascript
// 错误示例：阻塞主线程
function heavyTask() {
  for (let i = 0; i < 1000000000; i++) {
    // 耗时计算
  }
}

// 正确示例：使用 Web Worker 或分块处理
async function chunkedTask(data, chunkSize = 1000) {
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    await processChunk(chunk);
    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

### 2. 缓存异步结果
```javascript
const cache = new Map();

async function cachedFetch(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }
  const data = await fetch(url).then(r => r.json());
  cache.set(url, data);
  return data;
}
```

### 3. 防抖和节流
```javascript
// 防抖：等待一段时间后执行
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流：固定时间间隔执行
function throttle(fn, interval) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
```

## 常见问题

### 1. 如何限制并发数量？
使用并发控制函数，如文档中的 `concurrencyRequest` 实现。

### 2. 如何处理 Promise 链中的错误？
使用 `.catch()` 或 `try/catch` 包裹 `await` 调用。

### 3. 如何取消异步操作？
使用 `AbortController`：
```javascript
const controller = new AbortController();
const signal = controller.signal;

fetch(url, { signal })
  .then(response => response.json())
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('请求被取消');
    }
  });

// 取消请求
controller.abort();
```

## 总结

异步编程是 JavaScript 的核心特性，掌握以下关键点：
1. **Promise 和 async/await**：基础语法和错误处理
2. **并发控制**：限制同时执行的异步操作数量
3. **错误处理**：超时、重试、优雅降级
4. **性能优化**：避免阻塞、缓存结果、防抖节流

通过合理的异步编程，可以提高应用性能和用户体验。