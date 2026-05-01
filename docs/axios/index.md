# Axios 相关文档

本目录包含 Axios HTTP 客户端相关的技术文档，涵盖请求封装、进度监控、错误处理等内容。

## 文档目录

### 核心功能
- [请求进度监控](./progress.md) - Axios 实现上传/下载进度监控的完整方案

## 核心概念

### Axios 简介
Axios 是一个基于 Promise 的 HTTP 客户端，适用于浏览器和 Node.js。主要特点：
- **Promise API**：基于 Promise 设计，支持 async/await
- **请求拦截**：支持请求和响应拦截器
- **自动转换**：自动转换 JSON 数据
- **取消请求**：支持取消请求和超时设置
- **错误处理**：完善的错误处理机制

### 主要优势
1. **简洁易用**：API 设计简洁，学习成本低
2. **功能强大**：支持拦截器、取消请求、进度监控等高级功能
3. **类型安全**：完整的 TypeScript 支持
4. **生态丰富**：大量插件和工具支持

## 快速开始

### 安装
```bash
npm install axios
```

### 基础使用
```javascript
import axios from 'axios'

// GET 请求
axios.get('/api/users')
  .then(response => {
    console.log(response.data)
  })
  .catch(error => {
    console.error('请求失败:', error)
  })

// POST 请求
axios.post('/api/users', {
  name: 'John',
  email: 'john@example.com'
})
  .then(response => {
    console.log('创建成功:', response.data)
  })
  .catch(error => {
    console.error('创建失败:', error)
  })
```

### async/await 用法
```javascript
import axios from 'axios'

async function fetchUsers() {
  try {
    const response = await axios.get('/api/users')
    console.log(response.data)
    return response.data
  } catch (error) {
    console.error('获取用户失败:', error)
    throw error
  }
}
```

## 拦截器配置

### 请求拦截器
```javascript
import axios from 'axios'

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 添加认证 Token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 添加时间戳防止缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      }
    }
    
    return config
  },
  error => {
    return Promise.reject(error)
  }
)
```

### 响应拦截器
```javascript
// 响应拦截器
api.interceptors.response.use(
  response => {
    // 统一处理响应数据
    const { data } = response
    
    // 根据业务状态码判断
    if (data.code === 200 || data.success) {
      return data
    }
    
    // 业务错误处理
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  error => {
    // HTTP 错误处理
    if (error.response) {
      const { status, statusText } = error.response
      
      switch (status) {
        case 401:
          // 未授权，清除 Token 并跳转登录
          localStorage.removeItem('token')
          window.location.href = '/login'
          break
        case 403:
          console.error('没有权限访问该资源')
          break
        case 404:
          console.error('请求的资源不存在')
          break
        case 500:
          console.error('服务器内部错误')
          break
        default:
          console.error(`请求失败: ${statusText}`)
      }
    } else if (error.request) {
      console.error('网络错误: 服务器无响应')
    } else {
      console.error('请求配置错误:', error.message)
    }
    
    return Promise.reject(error)
  }
)
```

## 错误处理

### 统一错误处理
```javascript
import axios, { AxiosError } from 'axios'

interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  code: number
}

async function request<T = any>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
  try {
    const response = await axios(config)
    return response.data
  } catch (error) {
    const axiosError = error as AxiosError
    
    if (axiosError.response) {
      // 服务器返回了错误状态码
      const { status, statusText } = axiosError.response
      throw new Error(`HTTP ${status}: ${statusText}`)
    } else if (axiosError.request) {
      // 请求已发送但没有收到响应
      throw new Error('网络错误: 服务器无响应')
    } else {
      // 请求配置出错
      throw new Error(`请求错误: ${axiosError.message}`)
    }
  }
}
```

### 业务错误处理
```javascript
function handleBusinessError(code: number, message?: string): void {
  const errorMessages: Record<number, string> = {
    400: '请求参数错误',
    401: '未授权，请重新登录',
    403: '拒绝访问',
    404: '请求的资源不存在',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务不可用',
    504: '网关超时'
  }

  const msg = message || errorMessages[code] || `未知错误: ${code}`
  console.error(`[业务错误] ${code}: ${msg}`)

  // Token 过期，跳转到登录页
  if (code === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}
```

## 封装示例

### 基础封装
```typescript
// api/axios.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'

interface ApiResponse<T = any> {
  success: boolean
  data: T
  message: string
  code: number
}

interface CustomRequestConfig extends AxiosRequestConfig {
  showLoading?: boolean
  showError?: boolean
  requireAuth?: boolean
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
const TIMEOUT = 10000
const TOKEN_KEY = 'access_token'

const service: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { data } = response
    if (data.code === 200 || data.success) {
      return data
    }
    return Promise.reject(new Error(data.message || '请求失败'))
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

const http = {
  get<T = any>(url: string, params?: object, config?: CustomRequestConfig): Promise<ApiResponse<T>> {
    return service.get(url, { params, ...config })
  },
  
  post<T = any>(url: string, data?: object, config?: CustomRequestConfig): Promise<ApiResponse<T>> {
    return service.post(url, data, config)
  },
  
  put<T = any>(url: string, data?: object, config?: CustomRequestConfig): Promise<ApiResponse<T>> {
    return service.put(url, data, config)
  },
  
  delete<T = any>(url: string, params?: object, config?: CustomRequestConfig): Promise<ApiResponse<T>> {
    return service.delete(url, { params, ...config })
  },
  
  upload<T = any>(url: string, file: File, config?: CustomRequestConfig): Promise<ApiResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)
    return service.post(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  async download(url: string, params?: object, filename?: string): Promise<void> {
    const response = await service.get(url, {
      params,
      responseType: 'blob'
    })
    
    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }
}

export default http
export { service as axiosInstance }
```

### 使用示例
```typescript
import http from './api/axios'

// GET 请求
const fetchUserList = async () => {
  try {
    const response = await http.get('/users', { page: 1, size: 10 })
    console.log('用户列表:', response.data)
  } catch (error) {
    console.error('获取失败:', error)
  }
}

// POST 请求
const createUser = async (userData: object) => {
  const response = await http.post('/users', userData)
  return response.data
}

// 上传文件
const uploadAvatar = async (file: File) => {
  const response = await http.upload('/upload/avatar', file)
  return response.data
}

// 下载文件
const downloadReport = async () => {
  await http.download('/reports/annual', {}, '年度报告.pdf')
}
```

## 最佳实践

### 1. 请求封装
- 创建统一的 axios 实例
- 配置请求和响应拦截器
- 封装通用的请求方法

### 2. 错误处理
- 统一处理 HTTP 错误
- 区分业务错误和网络错误
- 提供友好的错误提示

### 3. 类型安全
- 使用 TypeScript 定义接口类型
- 为请求和响应数据定义类型
- 使用泛型支持不同数据类型

### 4. 性能优化
- 配置请求超时时间
- 使用取消请求避免重复请求
- 配置适当的缓存策略

## 相关资源

- [Axios 官方文档](https://axios-http.com/)
- [Axios GitHub 仓库](https://github.com/axios/axios)
- [Axios 中文文档](https://www.axios-http.cn/)
