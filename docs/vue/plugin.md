# Vue3 自定义插件开发指南

## 一、什么是插件

插件是能为 Vue 应用添加全局功能的代码，形式可以是**一个对象**或**一个函数**。

## 二、插件的两种定义形式

### 对象形式

必须暴露 `install` 方法，接收 `app` 实例和可选的 `options` 参数：

```javascript
const myPlugin = {
  install(app, options) {
    // 配置应用
  }
}
```

### 函数形式

函数本身会被视为 `install` 方法：

```javascript
const myPlugin = function(app, options) {
  // 配置应用
}
```

## 三、插件的核心能力

通过 `install` 方法可以访问 `app` 实例，从而：

- **注册全局组件**：`app.component('ComponentName', Component)`
- **注册全局指令**：`app.directive('directive-name', {...})`
- **注入全局属性**：`app.config.globalProperties`（如添加 `$translate` 方法）
- **提供全局依赖**：`app.provide()`（配合组件中的 `inject` 使用）
- **添加全局混入**：`app.mixin()`（**不推荐**，建议使用组合式函数替代）
- **添加实例方法**：通过原型链或 provide/inject 模式

## 四、使用插件

通过 `app.use()` 方法使用插件，可以链式调用并传递选项：

```javascript
import { createApp } from 'vue'
import MyPlugin from './plugins/MyPlugin'

const app = createApp({})

app
  .use(MyPlugin)
  .use(AnotherPlugin, { /* 选项 */ })
  
app.mount('#app')
```

**重要特性**：`app.use()` 会自动阻止同一插件被多次注册（即使多次调用也只生效一次）。

## 五、实战示例

### 示例1：i18n 国际化插件

```javascript
// plugins/i18n.js
export default {
  install(app, options) {
    // 注入翻译函数
    app.provide('i18n', {
      translate: (key) => options[key] || key
    })
    
    // 添加全局方法
    app.config.globalProperties.$translate = (key) => {
      return options[key] || key
    }
  }
}
```

使用：

```javascript
// main.js
import { createApp } from 'vue'
import App from './App.vue'
import i18nPlugin from './plugins/i18n'

const app = createApp(App)

app.use(i18nPlugin, {
  hello: '你好',
  goodbye: '再见'
})

app.mount('#app')
```

```vue
<template>
  <div>
    <p>{{ $translate('hello') }}</p>
    <p>{{ $translate('goodbye') }}</p>
  </div>
</template>
```

### 示例2：Loading 插件

```javascript
// plugins/loading.js
import { createApp, ref } from 'vue'
import LoadingComponent from './Loading.vue'

export default {
  install(app) {
    const loadingRef = ref(false)
    
    // 创建 Loading 实例
    const loadingApp = createApp(LoadingComponent)
    const container = document.createElement('div')
    document.body.appendChild(container)
    const instance = loadingApp.mount(container)
    
    // 注入全局方法
    app.provide('loading', {
      show: () => {
        loadingRef.value = true
        instance.show()
      },
      hide: () => {
        loadingRef.value = false
        instance.hide()
      }
    })
    
    app.config.globalProperties.$loading = {
      show: () => instance.show(),
      hide: () => instance.hide()
    }
  }
}
```

### 示例3：请求插件

```javascript
// plugins/request.js
import axios from 'axios'

export default {
  install(app, options) {
    const instance = axios.create({
      baseURL: options.baseURL || '',
      timeout: options.timeout || 10000
    })
    
    // 请求拦截器
    instance.interceptors.request.use(config => {
      const token = localStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
    
    // 响应拦截器
    instance.interceptors.response.use(
      response => response.data,
      error => {
        if (error.response?.status === 401) {
          // 处理未授权
        }
        return Promise.reject(error)
      }
    )
    
    app.provide('request', instance)
    app.config.globalProperties.$request = instance
  }
}
```

## 六、TypeScript 类型扩展

当通过 `globalProperties` 添加全局属性时，需要扩展类型声明以便 TypeScript 识别：

```typescript
// 扩展 ComponentCustomProperties 接口
declare module 'vue' {
  interface ComponentCustomProperties {
    $translate: (key: string) => string
    $loading: {
      show: () => void
      hide: () => void
    }
  }
}
```

## 七、注意事项与限制

- **无卸载机制**：Vue 目前没有 `app.unuse()` 方法，插件一旦注册无法卸载
- **避免滥用全局混入**：建议优先使用 provide/inject 或组合式函数（Composables）替代全局混入
- **插件显式导出**：建议将插件作为具名导出或默认导出，便于 tree-shaking

## 八、与 Composables 的区别

| 特性 | 插件 | Composables |
|------|------|-------------|
| 作用范围 | 应用级别，全局可用 | 组件级别，按需使用 |
| 注册方式 | `app.use()` | 直接导入调用 |
| 适用场景 | 第三方库集成、全局工具方法 | 组件逻辑复用 |
| 生命周期 | 应用生命周期 | 组件生命周期 |

插件通常是 Composables 的"包装器"或更高层的抽象。

## 九、总结

Vue 3 的插件系统通过标准化的 `install` 接口，提供了一种干净、可测试的方式来封装和复用全局功能，同时避免了 Vue 2 中直接修改原型链带来的维护问题。

**关键要点**：

1. 使用对象形式定义插件，暴露 `install` 方法
2. 通过 `app.use()` 注册插件
3. 利用 `app.provide()` 和 `globalProperties` 扩展功能
4. 添加 TypeScript 类型声明以获得更好的开发体验
