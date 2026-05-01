# 文件分片上传实现思路

## 概述

文件分片上传是将大文件分割成多个小块分别上传的技术，具有断点续传、并发上传、进度监控等优势。

## 核心概念

### 分片上传
将大文件切成多个小块（如每片2MB），逐个发送，服务器合并成完整文件。

### 断点续传
网络中断后可以从断点继续上传，只需重传失败的分片。

### 秒传
文件哈希相同则跳过上传，直接返回已有文件地址。

## 核心流程

```
用户选择文件 → 计算文件Hash → 文件分片 → 查询已上传分片 → 并发上传剩余分片 → 通知服务器合并 → 上传完成
```

## 关键技术点

### 1. 文件分片
使用`File.prototype.slice()`方法分割文件：
```typescript
const chunks: Blob[] = [];
const chunkSize = 2 * 1024 * 1024; // 2MB
let start = 0;

while (start < file.size) {
  const end = Math.min(start + chunkSize, file.size);
  chunks.push(file.slice(start, end));
  start = end;
}
```

### 2. 文件Hash计算
使用SparkMD5库计算文件MD5：
```typescript
import SparkMD5 from 'spark-md5';

async function calculateFileHash(file: File): Promise<string> {
  return new Promise((resolve) => {
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    const chunkSize = 2 * 1024 * 1024;
    let currentChunk = 0;
    const chunks = Math.ceil(file.size / chunkSize);

    reader.onload = (e) => {
      spark.append(e.target!.result as ArrayBuffer);
      currentChunk++;
      
      if (currentChunk < chunks) {
        loadNext();
      } else {
        resolve(spark.end());
      }
    };

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      reader.readAsArrayBuffer(file.slice(start, end));
    }

    loadNext();
  });
}
```

### 3. 并发控制
使用并发池控制同时上传的分片数量：
```typescript
async function runWithConcurrency(
  tasks: (() => Promise<void>)[],
  limit: number
) {
  const executing: Promise<void>[] = [];
  
  for (const task of tasks) {
    const p = task().then(() => {
      executing.splice(executing.indexOf(p), 1);
    });
    executing.push(p);
    
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
}
```

### 4. 断点续传
上传前查询服务器已上传的分片：
```typescript
// 查询已上传分片
const checkRes = await fetch(`/api/upload/check?fileHash=${fileHash}`);
const { uploadedChunks } = await checkRes.json();

// 跳过已上传的分片
const pendingChunks = chunks.filter((_, index) => !uploadedChunks.includes(index));
```

### 5. 秒传检查
上传前检查文件是否已存在：
```typescript
const checkRes = await fetch(`/api/upload/check?fileHash=${fileHash}`);
const { exists, url } = await checkRes.json();

if (exists) {
  // 文件已存在，秒传成功
  return url;
}
```

## 完整实现示例

### 前端Vue3实现
```typescript
interface UploadOptions {
  file: File;
  chunkSize?: number;
  concurrency?: number;
  onProgress?: (percent: number) => void;
  onStatusChange?: (status: string) => void;
}

async function chunkUpload(options: UploadOptions) {
  const {
    file,
    chunkSize = 2 * 1024 * 1024,
    concurrency = 3,
    onProgress,
    onStatusChange
  } = options;

  // 计算文件Hash
  onStatusChange?.('计算文件指纹...');
  const fileHash = await calculateFileHash(file);

  // 检查秒传
  onStatusChange?.('检查文件状态...');
  const checkRes = await fetch(`/api/upload/check?fileHash=${fileHash}&fileName=${encodeURIComponent(file.name)}`);
  const checkData = await checkRes.json();

  if (checkData.exists) {
    onStatusChange?.('秒传成功！');
    onProgress?.(100);
    return checkData.url;
  }

  // 创建分片
  const totalChunks = Math.ceil(file.size / chunkSize);
  const uploadedChunks = new Set(checkData.uploadedChunks || []);

  const chunks = Array.from({ length: totalChunks }, (_, i) => ({
    index: i,
    blob: file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, file.size)),
    status: uploadedChunks.has(i) ? 'done' as const : 'pending' as const
  }));

  const pendingChunks = chunks.filter(c => c.status === 'pending');
  let completedCount = uploadedChunks.size;

  // 上传分片
  onStatusChange?.(`开始上传 ${pendingChunks.length} 个分片...`);
  
  const tasks = pendingChunks.map(chunk => async () => {
    const formData = new FormData();
    formData.append('file', chunk.blob);
    formData.append('chunkIndex', String(chunk.index));
    formData.append('totalChunks', String(totalChunks));
    formData.append('fileHash', fileHash);
    formData.append('fileName', file.name);

    await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData
    });

    chunk.status = 'done';
    completedCount++;
    onProgress?.(Math.round((completedCount / totalChunks) * 100));
  });

  await runWithConcurrency(tasks, concurrency);

  // 合并分片
  onStatusChange?.('正在合并文件...');
  const mergeRes = await fetch('/api/upload/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileHash, fileName: file.name, totalChunks })
  });

  const mergeData = await mergeRes.json();
  onStatusChange?.('上传完成！');
  return mergeData.url;
}
```

### 后端Express实现
```typescript
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const app = express();
const upload = multer({ dest: 'temp/' });

const UPLOAD_DIR = path.join(__dirname, 'uploads');
const CHUNKS_DIR = path.join(__dirname, 'chunks');

// 检查文件状态
app.get('/api/upload/check', async (req, res) => {
  const { fileHash, fileName } = req.query;
  
  // 检查文件是否已存在
  const filePath = path.join(UPLOAD_DIR, `${fileHash}${path.extname(fileName as string)}`);
  if (fs.existsSync(filePath)) {
    return res.json({ exists: true, url: `/uploads/${fileHash}${path.extname(fileName as string)}` });
  }
  
  // 检查已上传的分片
  const chunkDir = path.join(CHUNKS_DIR, fileHash as string);
  let uploadedChunks: number[] = [];
  
  if (fs.existsSync(chunkDir)) {
    const files = fs.readdirSync(chunkDir);
    uploadedChunks = files.map(f => parseInt(f)).filter(n => !isNaN(n)).sort((a, b) => a - b);
  }
  
  res.json({ exists: false, uploadedChunks });
});

// 上传分片
app.post('/api/upload/chunk', upload.single('file'), async (req, res) => {
  const { fileHash, chunkIndex } = req.body;
  const chunkDir = path.join(CHUNKS_DIR, fileHash);
  
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }
  
  const chunkPath = path.join(chunkDir, chunkIndex);
  fs.renameSync(req.file.path, chunkPath);
  
  res.json({ success: true });
});

// 合并分片
app.post('/api/upload/merge', async (req, res) => {
  const { fileHash, fileName, totalChunks } = req.body;
  const chunkDir = path.join(CHUNKS_DIR, fileHash);
  const filePath = path.join(UPLOAD_DIR, `${fileHash}${path.extname(fileName)}`);
  
  // 创建写入流
  const writeStream = fs.createWriteStream(filePath);
  
  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, String(i));
    const chunkData = fs.readFileSync(chunkPath);
    writeStream.write(chunkData);
    fs.unlinkSync(chunkPath);
  }
  
  writeStream.end();
  
  // 清理分片目录
  fs.rmSync(chunkDir, { recursive: true, force: true });
  
  res.json({ 
    success: true, 
    url: `/uploads/${fileHash}${path.extname(fileName)}` 
  });
});

app.listen(3000);
```

## Web Worker计算Hash

大文件计算Hash会阻塞主线程，使用Web Worker：
```typescript
// hash.worker.ts
import SparkMD5 from 'spark-md5';

self.onmessage = async (e: MessageEvent) => {
  const { fileChunkList } = e.data;
  const spark = new SparkMD5.ArrayBuffer();
  
  for (let i = 0; i < fileChunkList.length; i++) {
    const arrayBuffer = await fileChunkList[i].arrayBuffer();
    spark.append(arrayBuffer);
    self.postMessage({ type: 'progress', percentage: Math.round(((i + 1) / fileChunkList.length) * 100) });
  }
  
  self.postMessage({ type: 'done', hash: spark.end() });
  self.close();
};
```

## 最佳实践

1. **分片大小选择**：2MB-5MB，平衡请求次数和单片失败重传成本
2. **并发数控制**：3-6个，避免浏览器同域并发限制
3. **错误重试**：指数退避重试（1s, 2s, 4s...）
4. **进度持久化**：使用localStorage保存上传进度
5. **临时文件清理**：定期清理未完成的分片文件
6. **文件名编码**：中文文件名使用encodeURIComponent编码

## 常见问题

1. **Nginx限制**：默认client_max_body_size只有1MB，需要配置
2. **分片顺序**：上传可以乱序，但合并必须按序
3. **内存占用**：大文件Hash计算使用Web Worker避免卡顿
4. **并发安全**：后端写入要支持并发，避免文件损坏