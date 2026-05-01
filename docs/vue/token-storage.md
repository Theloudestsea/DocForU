# Vue3 项目中 Token 持久化存储方案

## 一、基础存储方案

### 1.1 使用 localStorage + 组合式 API

Vue3 可以利用组合式 API 创建一个可复用的 token 存储逻辑：

```typescript
// composables/useTokenStorage.ts
import { ref, watch } from 'vue'

export function useTokenStorage() {
  const TOKEN_KEY = 'auth_token'

  const getToken = () => {
    return localStorage.getItem(TOKEN_KEY)
  }

  const setToken = (token: string | null) => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token)
    } else {
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  const token = ref<string | null>(getToken())

  watch(token, (newToken) => {
    setToken(newToken)
  }, { immediate: true })

  return {
    token,
    setToken,
    getToken,
    clearToken: () => setToken(null)
  }
}
```

### 1.2 使用 sessionStorage

与 localStorage 类似，但数据只在当前会话中有效：

```typescript
const getToken = () => {
  return sessionStorage.getItem(TOKEN_KEY)
}
```

## 二、状态管理方案

### 2.1 Pinia + 持久化插件

使用 Pinia 状态管理库，并添加持久化功能：

```typescript
// stores/auth.ts
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    user: null
  }),
  actions: {
    setToken(token: string) {
      this.token = token
    },
    clearToken() {
      this.token = null
    }
  },
  getters: {
    isAuthenticated: (state) => !!state.token
  }
})

// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate({
  key: (id) => `${id}`,
  storage: localStorage,
  paths: ['auth.token']
}))
```

### 2.2 Vuex + vuex-persistedstate

```typescript
// store/index.js
import { createStore } from 'vuex'
import createPersistedState from 'vuex-persistedstate'

export default createStore({
  state: {
    token: null
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
    },
    CLEAR_TOKEN(state) {
      state.token = null
    }
  },
  actions: {
    login({ commit }, token) {
      commit('SET_TOKEN', token)
    },
    logout({ commit }) {
      commit('CLEAR_TOKEN')
    }
  },
  plugins: [createPersistedState({
    paths: ['token']
  })]
})
```

## 三、HTTP 客户端拦截器方案

结合 Axios 拦截器实现 token 自动管理和刷新：

```typescript
// utils/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

const api: AxiosInstance = axios.create({
  baseURL: process.env.VUE_APP_API_URL,
  timeout: 10000
})

// 请求拦截器 - 添加 token
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers = config.headers || {}
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理 token 过期和刷新
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  async (error) => {
    const originalRequest = error.config
  
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
    
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const response = await axios.post('/api/auth/refresh', { refreshToken })
      
        const newToken = response.data.token
        localStorage.setItem('auth_token', newToken)
      
        originalRequest.headers.Authorization = `Bearer ${newToken}`
      
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
  
    return Promise.reject(error)
  }
)

export default api
```

## 四、第三方库方案

### 4.1 js-cookie - 专门处理 Cookies

```typescript
import Cookies from 'js-cookie'

// 设置 token，带过期时间
Cookies.set('auth_token', 'token_value', { expires: 7 }) // 7天后过期

// 获取 token
const token = Cookies.get('auth_token')

// 删除 token
Cookies.remove('auth_token')
```

### 4.2 localForage - 高级存储后端

提供更丰富的存储选项，支持 IndexedDB 等：

```typescript
import localForage from 'localforage'

// 设置 token
await localForage.setItem('auth_token', 'token_value')

// 获取 token
const token = await localForage.getItem('auth_token')

// 删除 token
await localForage.removeItem('auth_token')
```

## 五、安全考虑与最佳实践

### 5.1 安全存储建议

- 对于高敏感 token，考虑使用 httpOnly cookies（需服务器端设置）
- 避免在 localStorage 中存储非常敏感的信息
- 可以对 token 进行加密存储后再放到 localStorage

### 5.2 Token 刷新策略

```typescript
// 在 store 中增加 token 过期检测
const isTokenExpired = () => {
  const expiresAt = localStorage.getItem('expires_at')
  return !expiresAt || Date.now() > parseInt(expiresAt, 10)
}
```

### 5.3 完整认证流程

```typescript
// 登录成功后存储完整认证信息
const handleLogin = async (credentials) => {
  const response = await api.post('/auth/login', credentials)

  localStorage.setItem('auth_token', response.data.token)
  localStorage.setItem('refresh_token', response.data.refreshToken)
  localStorage.setItem('expires_at', 
    Date.now() + (response.data.expiresIn * 1000).toString())
}
```

## 六、方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| localStorage | 小型项目 | 简单直接，无需依赖 | 安全性较低 |
| sessionStorage | 临时会话 | 会话结束自动清除 | 刷新页面后丢失 |
| Pinia + 持久化 | 中型项目 | 状态管理完善 | 需要额外依赖 |
| Axios 拦截器 | 复杂应用 | 自动刷新 token | 实现复杂 |
| js-cookie | 需要过期控制 | 支持过期时间 | 需要额外依赖 |

## 七、总结

在 Vue3 项目中，您可以根据项目规模和需求选择适合的 token 持久化方案：

1. **小型项目**：使用 localStorage + 组合式 API 最简单直接
2. **中型项目**：推荐 Pinia + 持久化插件，提供更好的状态管理
3. **复杂应用**：使用状态管理 + Axios 拦截器，实现完整的 token 生命周期管理
4. **特殊需求**：使用 js-cookie 或 localForage 等第三方库获得更专业的存储功能

无论选择哪种方案，都要注意安全性和可维护性的平衡，确保 token 的安全存储和有效管理。
