# Axios 请求进度监控

本文介绍如何使用 Axios 实现 HTTP 请求的进度监控，包括上传进度、下载进度以及相关的 UI 展示方案。

## 核心概念

### 进度监控原理
Axios 基于 `XMLHttpRequest` 实现，提供了两种进度监控：
- **上传进度**（`onUploadProgress`）：监控请求数据发送
- **下载进度**（`onDownloadProgress`）：监控响应数据接收

### 关键属性
- `event.loaded`：已传输字节数
- `event.total`：总字节数（需服务器返回 Content-Length 头）
- `event.lengthComputable`：进度是否可计算

### 服务器要求
1. **必须设置 Content-Length 响应头**：进度计算依赖此头部
2. **跨域请求配置**：需要设置 `Access-Control-Expose-Headers: Content-Length`

## 基础实现

### 核心配置项
```javascript
axios.post('/api/upload', formData, {
  // 上传进度监控
  onUploadProgress: (progressEvent) => {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    )
    console.log(`上传进度: ${percent}%`)
  },
  
  // 下载进度监控
  onDownloadProgress: (progressEvent) => {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    )
    console.log(`下载进度: ${percent}%`)
  }
})
```

### 进度计算检查
```javascript
onUploadProgress: (progressEvent) => {
  // 重要：只有可计算时才显示进度
  if (progressEvent.lengthComputable) {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    )
    // 更新 UI
  } else {
    console.log('无法计算进度，服务器未返回 Content-Length')
  }
}
```

## 文件上传进度监控

### 带 UI 展示的完整实现
```html
<!-- HTML 结构 -->
<div class="progress-container">
  <h3>文件上传进度</h3>
  <input type="file" id="fileInput" />
  <button id="uploadBtn">开始上传</button>
  
  <div class="progress-bar-bg">
    <div id="upload-progress" class="progress-bar">0%</div>
  </div>
  <div class="progress-info">
    <span id="upload-percent">0%</span>
    <span id="upload-loaded">0 MB</span> / 
    <span id="upload-total">0 MB</span>
  </div>
</div>

<style>
.progress-container {
  max-width: 600px;
  margin: 20px auto;
}

.progress-bar-bg {
  width: 100%;
  height: 30px;
  background-color: #f0f0f0;
  border-radius: 15px;
  overflow: hidden;
  margin-top: 15px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  transition: width 0.3s ease;
  width: 0%;
}
</style>

<script>
document.getElementById('uploadBtn').addEventListener('click', async () => {
  const file = document.getElementById('fileInput').files[0]
  if (!file) return alert('请选择文件')
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    await axios.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          
          // 更新 UI
          const progressBar = document.getElementById('upload-progress')
          const percentEl = document.getElementById('upload-percent')
          const loadedEl = document.getElementById('upload-loaded')
          const totalEl = document.getElementById('upload-total')
          
          progressBar.style.width = `${percent}%`
          progressBar.textContent = `${percent}%`
          percentEl.textContent = `${percent}%`
          loadedEl.textContent = formatBytes(progressEvent.loaded)
          totalEl.textContent = formatBytes(progressEvent.total)
        }
      }
    })
    
    alert('上传成功！')
  } catch (error) {
    console.error('上传失败:', error)
    alert('上传失败')
  }
})

// 格式化字节大小
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}
</script>
```

## 文件下载进度监控

### 完整实现
```javascript
async function downloadFile() {
  try {
    const response = await axios.get('/api/download', {
      responseType: 'blob', // 必须设置，用于正确处理二进制数据
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          console.log(`下载进度: ${percent}%`)
          updateDownloadProgress(progressEvent.loaded, progressEvent.total, percent)
        }
      }
    })
    
    // 创建下载链接
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'file-download.zip' // 自定义文件名
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('下载失败:', error)
    alert('下载失败')
  }
}
```

## Vue 3 组件实现

### Composition API 实现
```vue
<template>
  <div class="upload-container">
    <input 
      type="file" 
      @change="handleUpload"
      :disabled="isUploading"
    />
    
    <div v-if="isUploading" class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill"
          :style="{ width: uploadPercent + '%' }"
        ></div>
        <span class="progress-text">{{ uploadPercent }}%</span>
      </div>
      <div class="progress-filesize">
        {{ formatSize(loaded) }} / {{ formatSize(total) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from 'axios'

const uploadPercent = ref(0)
const isUploading = ref(false)
const loaded = ref(0)
const total = ref(0)

const handleUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  isUploading.value = true
  uploadPercent.value = 0
  
  const formData = new FormData()
  formData.append('file', file)
  
  try {
    await axios.post('/api/upload', formData, {
      onUploadProgress: (progressEvent) => {
        if (progressEvent.lengthComputable) {
          uploadPercent.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          loaded.value = progressEvent.loaded
          total.value = progressEvent.total
        }
      }
    })
    
    alert('上传成功')
    uploadPercent.value = 100
    setTimeout(() => {
      uploadPercent.value = 0
      isUploading.value = false
    }, 1000)
    
  } catch (error) {
    console.error('上传失败:', error)
    alert('上传失败')
    isUploading.value = false
  }
}

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
.upload-container {
  max-width: 600px;
  margin: 0 auto;
}

.progress-container {
  margin-top: 20px;
}

.progress-bar {
  width: 100%;
  height: 32px;
  background-color: #f0f0f0;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: bold;
  color: #333;
}

.progress-filesize {
  margin-top: 8px;
  text-align: right;
  font-size: 14px;
  color: #666;
}
</style>
```

## React 组件实现

### Hooks 实现
```jsx
import React, { useState, useCallback } from 'react'
import axios from 'axios'

const FileUploader = () => {
  const [progress, setProgress] = useState({
    upload: 0,
    download: 0,
    loaded: 0,
    total: 0
  })
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = useCallback(async (file) => {
    if (!file) return
    
    setIsUploading(true)
    setProgress({ upload: 0, download: 0, loaded: 0, total: 0 })
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.post('/api/upload', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setProgress(prev => ({
              ...prev,
              upload: percent,
              loaded: progressEvent.loaded,
              total: progressEvent.total
            }))
          }
        }
      })
      
      alert('上传成功')
      setTimeout(() => setProgress(prev => ({ ...prev, upload: 0 })), 1000)
      
    } catch (error) {
      alert('上传失败: ' + error.message)
    } finally {
      setIsUploading(false)
    }
  }, [])
  
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) handleUpload(file)
  }
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </div>
      
      {isUploading && (
        <div style={{ marginTop: '20px' }}>
          <div
            style={{
              width: '100%',
              height: '32px',
              backgroundColor: '#f0f0f0',
              borderRadius: '16px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress.upload}%`,
                background: `linear-gradient(90deg, #1890ff, #52c41a)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                transition: 'width 0.3s ease'
              }}
            >
              {progress.upload}%
            </div>
          </div>
          <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            {formatFileSize(progress.loaded)} / {formatFileSize(progress.total)}
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUploader
```

## TypeScript + Vue 3 完整实现

### 类型定义
```typescript
// types/progress.ts
export type ProgressEvent = {
  loaded: number
  total: number
  lengthComputable: boolean
}

export type ProgressData = {
  percentage: number
  loaded: number
  total: number
}
```

### 完整组件实现
```vue
<template>
  <div class="progress-demo">
    <!-- 文件上传进度演示 -->
    <div class="upload-section">
      <h3>文件上传进度</h3>
      <input
        type="file"
        @change="handleFileSelect"
        accept=".jpg,.png,.pdf"
      />
      <button
        @click="handleUpload"
        :disabled="!selectedFile || isUploading"
      >
        {{ isUploading ? '上传中...' : '开始上传' }}
      </button>
      
      <!-- 进度条 -->
      <div v-if="uploadProgress > 0 || isUploading" class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${uploadProgress}%` }"
        ></div>
      </div>
      <p v-if="uploadProgress > 0">上传进度：{{ uploadProgress.toFixed(2) }}%</p>
      <p v-if="uploadError" class="error">{{ uploadError }}</p>
    </div>

    <hr />

    <!-- 文件下载进度演示 -->
    <div class="download-section">
      <h3>文件下载进度</h3>
      <button
        @click="handleDownload"
        :disabled="isDownloading"
      >
        {{ isDownloading ? '下载中...' : '下载示例文件' }}
      </button>
      
      <!-- 进度条 -->
      <div v-if="downloadProgress > 0 || isDownloading" class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${downloadProgress}%` }"
        ></div>
      </div>
      <p v-if="downloadProgress > 0">下载进度：{{ downloadProgress.toFixed(2) }}%</p>
      <p v-if="downloadError" class="error">{{ downloadError }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios, { AxiosRequestConfig, AxiosError } from 'axios'

// 状态管理
const selectedFile = ref<File | null>(null)
const uploadProgress = ref<number>(0)
const isUploading = ref<boolean>(false)
const uploadError = ref<string>('')

const downloadProgress = ref<number>(0)
const isDownloading = ref<boolean>(false)
const downloadError = ref<string>('')

// 选择文件回调
const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    uploadProgress.value = 0
    uploadError.value = ''
  }
}

// 上传文件（带进度）
const handleUpload = async () => {
  if (!selectedFile.value) return

  isUploading.value = true
  uploadProgress.value = 0
  uploadError.value = ''

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)

    const config: AxiosRequestConfig = {
      url: '/api/upload',
      method: 'POST',
      data: formData,
      onUploadProgress: (e: any) => {
        if (e.lengthComputable) {
          uploadProgress.value = (e.loaded / e.total) * 100
        }
      },
      timeout: 60000,
    }

    const response = await axios(config)
    console.log('上传成功：', response.data)
    uploadProgress.value = 100
  } catch (error) {
    const err = error as AxiosError
    uploadError.value = err.message || '上传失败，请重试'
    uploadProgress.value = 0
  } finally {
    isUploading.value = false
  }
}

// 下载文件（带进度）
const handleDownload = async () => {
  isDownloading.value = true
  downloadProgress.value = 0
  downloadError.value = ''

  try {
    const config: AxiosRequestConfig = {
      url: '/api/download',
      method: 'GET',
      responseType: 'blob',
      onDownloadProgress: (e: any) => {
        if (e.lengthComputable) {
          downloadProgress.value = (e.loaded / e.total) * 100
        }
      },
      timeout: 60000,
    }

    const response = await axios(config)
    
    const blob = new Blob([response.data])
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const fileName = response.headers['content-disposition']?.split('filename=')[1] || 'download.file'
    a.download = decodeURIComponent(fileName)
    a.click()
    window.URL.revokeObjectURL(url)

    downloadProgress.value = 100
    console.log('下载成功')
  } catch (error) {
    const err = error as AxiosError
    downloadError.value = err.message || '下载失败，请重试'
    downloadProgress.value = 0
  } finally {
    isDownloading.value = false
  }
}
</script>

<style scoped>
.progress-demo {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
}

.upload-section, .download-section {
  margin-bottom: 20px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  border: 1px solid #ccc;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background-color: #409eff;
  transition: width 0.2s ease;
}

.error {
  color: #f56c6c;
  margin: 5px 0;
}

button {
  padding: 6px 12px;
  margin: 10px 0;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

hr {
  border: none;
  border-top: 1px solid #eee;
  margin: 20px 0;
}
</style>
```

## 高级功能实现

### 1. 全局进度拦截器
```javascript
// 创建带全局进度监控的 axios 实例
const api = axios.create({ baseURL: '/api' })

// 上传进度拦截器
api.interceptors.request.use(config => {
  if (config.onUploadProgress) {
    config.onUploadProgress = (progressEvent) => {
      const percent = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      )
      console.log(`全局上传监控: ${percent}%`)
      config.onUploadProgress?.({ progressEvent, percent })
    }
  }
  return config
})

// 下载进度拦截器
api.interceptors.response.use(response => {
  const config = response.config
  if (config.onDownloadProgress) {
    config.onDownloadProgress({ progressEvent: {} })
  }
  return response
})
```

### 2. 并发上传队列控制
```javascript
class UploadManager {
  constructor(maxConcurrent = 3) {
    this.queue = []
    this.active = 0
    this.maxConcurrent = maxConcurrent
  }
  
  async add(file, onProgress) {
    return new Promise((resolve, reject) => {
      this.queue.push({ file, onProgress, resolve, reject })
      this.execute()
    })
  }
  
  async execute() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) return
    
    this.active++
    const { file, onProgress, resolve, reject } = this.queue.shift()
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await axios.post('/api/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          onProgress(percent)
        }
      })
      resolve(response.data)
    } catch (error) {
      reject(error)
    } finally {
      this.active--
      this.execute()
    }
  }
}

// 使用示例
const uploadManager = new UploadManager(3)
files.forEach(file => {
  uploadManager.add(file, (percent) => {
    console.log(`${file.name}: ${percent}%`)
  })
})
```

### 3. 暂停/继续上传实现
```javascript
import axios from 'axios'

class UploadTask {
  constructor(file) {
    this.file = file
    this.cancelTokenSource = axios.CancelToken.source()
    this.progress = 0
    this.uploadedBytes = 0
    this.fileSize = file.size
  }
  
  async start() {
    const formData = new FormData()
    formData.append('file', this.file)
    formData.append('uploadedBytes', this.uploadedBytes)
    
    return axios.post('/api/upload-resumable', formData, {
      headers: {
        'Content-Range': `bytes ${this.uploadedBytes}-${this.fileSize-1}/${this.fileSize}`
      },
      cancelToken: this.cancelTokenSource.token,
      onUploadProgress: (progressEvent) => {
        this.progress = Math.round(
          ((this.uploadedBytes + progressEvent.loaded) * 100) / this.fileSize
        )
      }
    })
  }
  
  pause() {
    this.cancelTokenSource.cancel('用户暂停上传')
  }
  
  async resume() {
    // 继续上传逻辑
  }
}

// 使用示例
const task = new UploadTask(file)
task.start().then(() => {
  console.log('上传完成')
}).catch(error => {
  if (axios.isCancel(error)) {
    console.log('上传已暂停')
  }
})
```

## 性能优化

### 1. 节流更新
```javascript
// 使用节流避免频繁 UI 更新
const throttledUpdate = throttle((percent) => {
  progressBar.style.width = `${percent}%`
}, 100) // 每 100ms 更新一次

// 在进度回调中使用
onUploadProgress: (e) => {
  if (e.lengthComputable) {
    const percent = Math.round((e.loaded * 100) / e.total)
    throttledUpdate(percent)
  }
}
```

### 2. 内存管理
```javascript
// 请求完成后及时清理事件监听器
axios.post('/api/upload', formData, {
  onUploadProgress: (progressEvent) => {
    // 处理进度
  }
}).finally(() => {
  // 清理工作
  progressBar = null
})
```

## 最佳实践总结

### ✅ 推荐做法
1. **使用节流**：限制进度更新频率，避免性能问题
2. **检查 lengthComputable**：确保进度可计算
3. **提供取消功能**：允许用户取消长时间请求
4. **错误处理**：完善处理网络错误和业务错误
5. **内存管理**：及时清理事件监听器和对象引用

### ⚠️ 注意事项
1. **服务器要求**：确保服务器返回 Content-Length 头
2. **跨域配置**：配置 CORS 允许访问进度相关头信息
3. **移动端适配**：注意触摸交互和内存限制
4. **大文件处理**：考虑分片上传和断点续传

### 📊 方案选择建议
| 场景 | 推荐方案 | 优势 |
|------|----------|------|
| **新项目/React/Vue** | Axios + 拦截器 | 全局统一管理，易维护 |
| **文件上传** | 原生 XMLHttpRequest | 完整进度监控（上传+下载） |
| **大文件下载** | Fetch API + Streams | 内存友好，支持流式处理 |
| **兼容旧项目** | jQuery + XMLHttpRequest | 兼容性最佳 |

## 常见问题解答

### Q: 进度不显示怎么办？
**A**: 检查以下几点：
1. 服务器是否返回 Content-Length 头
2. 是否设置了 `responseType: 'blob'`（下载时）
3. 是否检查了 `lengthComputable` 属性

### Q: 进度卡在 99% 怎么办？
**A**: 添加完成状态判断：
```javascript
onUploadProgress: (progressEvent) => {
  if (progressEvent.lengthComputable) {
    const percent = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    )
    if (percent === 100) {
      // 上传完成，可以添加完成状态
    }
  }
}
```

### Q: 如何处理大文件上传？
**A**: 
1. 使用分片上传
2. 实现断点续传
3. 添加暂停/继续功能
4. 使用 Web Worker 处理文件切片

### Q: 如何优化移动端性能？
**A**: 
1. 减少 UI 更新频率
2. 使用 CSS 动画代替 JavaScript 动画
3. 及时释放内存
4. 避免同时处理多个大文件

### Q: 如何实现批量上传？
**A**: 
1. 使用队列控制并发数
2. 为每个文件单独跟踪进度
3. 提供整体进度显示
4. 支持批量取消操作
