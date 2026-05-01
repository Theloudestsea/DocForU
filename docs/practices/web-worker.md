# Web Worker使用示例

## 概述

Web Worker允许在后台线程中运行JavaScript，避免阻塞主线程。

## 基础使用

### 1. 创建Worker
```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const { data } = e;
  
  // 处理数据
  const result = heavyComputation(data);
  
  // 发送结果回主线程
  self.postMessage(result);
};

function heavyComputation(data: any) {
  // 耗时计算
  return result;
}
```

### 2. 主线程使用
```typescript
// 主线程
const worker = new Worker(new URL('./worker.ts', import.meta.url));

// 发送数据给Worker
worker.postMessage({ data: 'test' });

// 接收Worker返回的结果
worker.onmessage = (e: MessageEvent) => {
  console.log('收到结果:', e.data);
};

// 错误处理
worker.onerror = (error) => {
  console.error('Worker错误:', error);
};

// 终止Worker
worker.terminate();
```

## Vue3集成

```vue
<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

const result = ref(null);
const loading = ref(false);

let worker: Worker | null = null;

const startWorker = async (data: any) => {
  loading.value = true;
  
  worker = new Worker(
    new URL('./workers/computation.worker.ts', import.meta.url),
    { type: 'module' }
  );
  
  worker.onmessage = (e: MessageEvent) => {
    result.value = e.data;
    loading.value = false;
    worker?.terminate();
    worker = null;
  };
  
  worker.onerror = (error) => {
    console.error('Worker错误:', error);
    loading.value = false;
    worker?.terminate();
    worker = null;
  };
  
  worker.postMessage(data);
};

onUnmounted(() => {
  worker?.terminate();
});
</script>
```

## 常见应用场景

### 1. 大数据处理
```typescript
// worker.ts
self.onmessage = (e: MessageEvent) => {
  const { largeArray } = e.data;
  
  // 处理大数组
  const processed = largeArray.map(item => {
    // 复杂处理逻辑
    return processedItem;
  });
  
  self.postMessage(processed);
};
```

### 2. 图片处理
```typescript
// worker.ts
self.onmessage = async (e: MessageEvent) => {
  const { imageData, filter } = e.data;
  
  // 应用滤镜
  const filteredData = applyFilter(imageData, filter);
  
  self.postMessage(filteredData);
};

function applyFilter(imageData: ImageData, filter: string): ImageData {
  // 图片处理逻辑
  return processedImageData;
}
```

### 3. 文件Hash计算
```typescript
// worker.ts
import SparkMD5 from 'spark-md5';

self.onmessage = async (e: MessageEvent) => {
  const { fileChunks } = e.data;
  const spark = new SparkMD5.ArrayBuffer();
  
  for (let i = 0; i < fileChunks.length; i++) {
    const arrayBuffer = await fileChunks[i].arrayBuffer();
    spark.append(arrayBuffer);
    
    // 发送进度
    self.postMessage({
      type: 'progress',
      percentage: Math.round(((i + 1) / fileChunks.length) * 100)
    });
  }
  
  // 发送最终结果
  self.postMessage({
    type: 'done',
    hash: spark.end()
  });
};
```

## 高级特性

### 1. Transferable Objects
```typescript
// 主线程
const buffer = new ArrayBuffer(1024);
worker.postMessage(buffer, [buffer]); // 转移所有权

// Worker
self.onmessage = (e: MessageEvent) => {
  const buffer = e.data; // 获取转移的buffer
  // 处理buffer
  self.postMessage(buffer, [buffer]); // 转移回主线程
};
```

### 2. 共享Worker
```typescript
// shared-worker.ts
const connections: MessagePort[] = [];

self.onconnect = (e: MessageEvent) => {
  const port = e.ports[0];
  connections.push(port);
  
  port.onmessage = (event) => {
    // 广播消息给所有连接
    connections.forEach(conn => {
      if (conn !== port) {
        conn.postMessage(event.data);
      }
    });
  };
};

// 主线程
const worker = new SharedWorker('shared-worker.ts');
worker.port.onmessage = (e) => {
  console.log('收到消息:', e.data);
};
worker.port.start();
worker.port.postMessage('Hello');
```

### 3. Service Worker
```typescript
// service-worker.ts
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then(cache => {
      return cache.addAll(['/index.html', '/styles.css', '/script.js']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
```

## 最佳实践

1. **数据最小化**：只传递必要的数据
2. **错误处理**：处理Worker错误
3. **资源释放**：使用完毕后terminate Worker
4. **类型安全**：使用TypeScript定义消息类型
5. **进度反馈**：长时间任务提供进度反馈
6. **兼容性**：检查浏览器支持

## 常见问题

1. **无法访问DOM**：Worker不能操作DOM
2. **通信开销**：频繁通信会影响性能
3. **调试困难**：Worker调试相对困难
4. **兼容性**：旧浏览器可能不支持