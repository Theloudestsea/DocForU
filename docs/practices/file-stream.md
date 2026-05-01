# 文件转换成流的实现思路

## 概述

文件与Blob/Base64互转是前端开发中的常见需求，用于文件上传、预览、下载等场景。

## 核心概念

### Blob (Binary Large Object)
- 表示不可变的原始数据
- 适合处理大文件，性能高
- 支持切片操作`blob.slice()`

### Base64
- 将二进制数据编码为ASCII字符串
- 可直接嵌入HTML/CSS/JSON
- 体积比原始数据大约33%

### ArrayBuffer
- 通用的固定长度原始二进制数据缓冲区
- 适合底层二进制操作

## 转换方法

### 1. File → Blob
File对象本身就是Blob的子类，可以直接使用：
```typescript
const file = document.querySelector('input').files[0];
// 直接使用file作为Blob
const formData = new FormData();
formData.append('file', file);
```

### 2. File → Base64
使用FileReader读取文件为DataURL：
```typescript
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 使用示例
const base64 = await fileToBase64(file);
// 结果格式：data:image/png;base64,iVBORw0KGgo...
```

### 3. Base64 → Blob
将Base64字符串解码为二进制数据：
```typescript
function base64ToBlob(base64: string, mimeType?: string): Blob {
  const parts = base64.split(',');
  const base64Data = parts[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { 
    type: mimeType || parts[0].split(':')[1].split(';')[0] 
  });
}
```

### 4. Blob → Base64
使用FileReader读取Blob为DataURL：
```typescript
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
```

### 5. URL → Blob
从URL获取资源并转为Blob：
```typescript
async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  return response.blob();
}
```

### 6. URL → Base64
先转为Blob，再转为Base64：
```typescript
async function urlToBase64(url: string): Promise<string> {
  const blob = await urlToBlob(url);
  return blobToBase64(blob);
}
```

### 7. ArrayBuffer → Blob
```typescript
function arrayBufferToBlob(buffer: ArrayBuffer, mimeType: string): Blob {
  return new Blob([buffer], { type: mimeType });
}
```

### 8. Blob → ArrayBuffer
```typescript
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return blob.arrayBuffer();
}
```

## Vue3组件示例

```vue
<template>
  <div>
    <input type="file" @change="handleFileChange" />
    <button @click="convertToBase64">转为Base64</button>
    <button @click="convertToBlob">转为Blob</button>
    <img v-if="previewUrl" :src="previewUrl" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const file = ref<File | null>(null);
const previewUrl = ref('');

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] || null;
};

const convertToBase64 = async () => {
  if (!file.value) return;
  
  const reader = new FileReader();
  reader.onload = () => {
    previewUrl.value = reader.result as string;
  };
  reader.readAsDataURL(file.value);
};

const convertToBlob = async () => {
  if (!file.value) return;
  
  const blob = new Blob([file.value], { type: file.value.type });
  const url = URL.createObjectURL(blob);
  previewUrl.value = url;
};
</script>
```

## 文件下载实现

### Blob下载
```typescript
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Base64下载
```typescript
function downloadBase64(base64: string, filename: string) {
  const a = document.createElement('a');
  a.href = base64;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

## 后端接收示例 (Express)

### 接收Blob (FormData)
```typescript
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('file'), (req, res) => {
  console.log(req.file); // 文件信息
  res.json({ success: true });
});
```

### 接收Base64 (JSON)
```typescript
app.post('/api/upload/base64', (req, res) => {
  const { data, mimeType, fileName } = req.body;
  
  // 去掉DataURL前缀
  const base64Data = data.replace(/^data:.*?base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  
  // 保存文件
  fs.writeFileSync(`uploads/${fileName}`, buffer);
  
  res.json({ success: true });
});
```

## 大文件处理

### 分块读取
```typescript
async function fileToBase64Chunked(file: File, chunkSize = 1024 * 1024): Promise<string> {
  const reader = file.stream().getReader();
  let result = '';
  let done = false;

  while (!done) {
    const { value, done: doneRead } = await reader.read();
    done = doneRead;
    if (value) {
      const chunkStr = String.fromCharCode(...value);
      result += btoa(chunkStr);
    }
  }
  return result;
}
```

### Web Worker处理
```typescript
// worker.ts
self.onmessage = async (e: MessageEvent) => {
  const { file } = e.data;
  const arrayBuffer = await file.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const binary = String.fromCharCode(...uint8);
  const base64 = btoa(binary);
  
  self.postMessage({ base64, name: file.name, type: file.type });
};
```

## 最佳实践

1. **小文件**（<1MB）：使用Base64，方便JSON传输
2. **大文件**（>1MB）：使用Blob，FormData上传
3. **需要预览**：使用Base64，可直接在img标签显示
4. **需要下载**：使用Blob，URL.createObjectURL
5. **内存管理**：及时调用URL.revokeObjectURL释放内存
6. **跨域问题**：使用代理或CORS配置

## 常见问题

1. **内存溢出**：大文件转Base64可能导致内存占用过高
2. **跨域限制**：远程URL转换需要CORS支持
3. **编码问题**：中文文件名需要encodeURIComponent编码
4. **性能问题**：大文件转换使用Web Worker避免卡顿