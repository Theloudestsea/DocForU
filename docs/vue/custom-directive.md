# Vue3 自定义指令详解

## 一、核心概念

Vue3 的自定义指令允许你封装可重用的 DOM 操作逻辑，扩展 HTML 元素的行为。与 Vue2 相比，Vue3 的指令生命周期更加清晰，且支持更灵活的参数传递。

### 定位与注册方式

自定义指令和组件、组合式函数是 Vue3 三种代码复用方案，它专注于**普通元素的底层 DOM 操作**。

- **局部注册**
  - `<script setup>` 中：定义以 `v` 开头的驼峰变量，模板中用短横线形式使用
  - 非 `<script setup>` 中：通过 `directives` 选项注册
- **全局注册**：通过 `app.directive('指令名', 指令定义)` 注册，所有组件都能使用

### 使用时机

只有功能必须通过**直接 DOM 操作**实现时才用自定义指令，比如 `v-focus` 让元素自动获焦。优先使用 `v-bind` 等内置指令，它们更高效且对服务端渲染更友好。

## 二、生命周期钩子

| 钩子 | 触发时机 | 典型应用场景 |
|------|----------|--------------|
| `created` | 指令首次绑定到元素时（组件渲染前） | 初始化配置，绑定事件监听器 |
| `beforeMount` | 指令首次绑定到元素后（挂载前） | 获取 DOM 引用，准备操作 |
| `mounted` | 元素插入父 DOM 后（挂载完成） | **最常用**，执行 DOM 操作 |
| `beforeUpdate` | 组件更新前 | 清理旧状态 |
| `updated` | 组件更新后 | 响应数据变化，更新 DOM |
| `beforeUnmount` | 指令 unbind 前 | 清理工作，移除事件监听器 |
| `unmounted` | 指令 unbind 后 | 最终清理 |

### 指令参数

- `binding.value`：指令绑定的值
- `binding.arg`：指令参数（如 `v-focus:delay="100"` 中的 `delay`）
- `binding.modifiers`：修饰符对象（如 `v-tooltip.top` 中的 `{top: true}`）
- `binding.instance`：组件实例

### 简化形式

如果只需要在 `mounted` 和 `updated` 钩子实现相同逻辑，可以直接用函数定义指令：

```javascript
app.directive('color', (el, binding) => {
  // 会在 mounted 和 updated 时执行
  el.style.color = binding.value
})
```

## 三、基础示例

### 示例1：自动聚焦指令

```vue
<template>
  <div>
    <input v-focus placeholder="自动聚焦输入框" />
  </div>
</template>

<script setup>
// 局部注册
const vFocus = {
  mounted(el) {
    el.focus()
    el.style.borderColor = '#42b983'
  }
}
</script>
```

### 示例2：工具提示指令

```vue
<template>
  <div>
    <button v-tooltip="'这是一个提示信息'">悬停显示提示</button>
    <button v-tooltip:top="'顶部提示'">顶部提示</button>
    <button v-tooltip.bottom="'底部提示'">底部提示</button>
  </div>
</template>

<script setup>
const vTooltip = {
  mounted(el, binding) {
    const tooltip = document.createElement('div')
    tooltip.className = 'tooltip'
    tooltip.textContent = binding.value
    
    const position = binding.arg || 'bottom'
    tooltip.classList.add(position)
    
    Object.assign(tooltip.style, {
      position: 'absolute',
      background: '#333',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '4px',
      fontSize: '12px',
      zIndex: '1000',
      opacity: '0',
      transition: 'opacity 0.3s',
      pointerEvents: 'none'
    })
    
    const showTooltip = () => {
      document.body.appendChild(tooltip)
      const rect = el.getBoundingClientRect()
      
      const positions = {
        top: { top: rect.top - tooltip.offsetHeight - 5, left: rect.left },
        bottom: { top: rect.bottom + 5, left: rect.left },
        left: { top: rect.top, left: rect.left - tooltip.offsetWidth - 5 },
        right: { top: rect.top, left: rect.right + 5 }
      }
      
      const pos = positions[position] || positions.bottom
      tooltip.style.top = pos.top + 'px'
      tooltip.style.left = pos.left + 'px'
      tooltip.style.opacity = '1'
    }
    
    const hideTooltip = () => {
      tooltip.style.opacity = '0'
      setTimeout(() => {
        if (tooltip.parentNode) {
          tooltip.parentNode.removeChild(tooltip)
        }
      }, 300)
    }
    
    el.addEventListener('mouseenter', showTooltip)
    el.addEventListener('mouseleave', hideTooltip)
    
    el._tooltipCleanup = () => {
      el.removeEventListener('mouseenter', showTooltip)
      el.removeEventListener('mouseleave', hideTooltip)
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip)
      }
    }
  },
  unmounted(el) {
    if (el._tooltipCleanup) {
      el._tooltipCleanup()
    }
  }
}
</script>
```

### 示例3：拖拽指令

```javascript
// main.js - 全局注册
app.directive('draggable', {
  mounted(el) {
    el.style.position = 'absolute'
    el.style.cursor = 'move'

    el.onmousedown = (e) => {
      const disX = e.clientX - el.offsetLeft
      const disY = e.clientY - el.offsetTop

      document.onmousemove = (e) => {
        const left = e.clientX - disX
        const top = e.clientY - disY
        el.style.left = left + 'px'
        el.style.top = top + 'px'
      }

      document.onmouseup = () => {
        document.onmousemove = null
        document.onmouseup = null
      }
    }
  },
  unmounted(el) {
    el.onmousedown = null
  }
})
```

### 示例4：图片懒加载指令

```vue
<template>
  <div>
    <img v-lazy="imageUrl" width="360" height="500" alt="" />
  </div>
</template>

<script setup>
import type { Directive } from 'vue'

const vLazy: Directive<HTMLImageElement, string> = async (el, binding) => {
  // 设置占位图
  el.src = '/placeholder.svg'
  
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].intersectionRatio > 0 && entries[0].isIntersecting) {
      setTimeout(() => {
        el.src = binding.value
        observer.unobserve(el)
      }, 2000)
    }
  })
  observer.observe(el)
}
</script>
```

## 四、实战：权限控制指令

### 权限指令实现

```javascript
// directives/permission.js
const permission = {
  mounted(el, binding) {
    const { value, modifiers } = binding
    const userStore = useUserStore()
    
    const hasPermission = () => {
      if (!value) return true
      const requiredRoles = Array.isArray(value) ? value : [value]
      const userRoles = userStore.roles || []
      return requiredRoles.some(role => userRoles.includes(role))
    }
    
    const applyPermission = () => {
      const hasPerm = hasPermission()
      
      if (modifiers.hide) {
        el.style.display = hasPerm ? '' : 'none'
      } else {
        if (!hasPerm) {
          el.parentNode && el.parentNode.removeChild(el)
        }
      }
      
      el.dataset.hasPermission = hasPerm
    }
    
    applyPermission()
    el._permissionUpdate = applyPermission
  },
  updated(el, binding) {
    if (el._permissionUpdate) {
      el._permissionUpdate()
    }
  },
  unmounted(el) {
    delete el._permissionUpdate
  }
}

export default permission
```

### 使用示例

```vue
<template>
  <div>
    <!-- 所有人可见 -->
    <div class="card">公共信息</div>
    
    <!-- 编辑器和管理员可见 -->
    <div class="card" v-permission="['editor', 'admin']">
      编辑器面板
    </div>
    
    <!-- 仅管理员可见 -->
    <div class="card" v-permission="['admin']">
      管理面板
    </div>
    
    <!-- 隐藏模式（不移除 DOM） -->
    <div class="card" v-permission.hide="['admin']">
      隐藏模式测试
    </div>
  </div>
</template>
```

## 五、多值传递：对象字面量

指令需要多个参数时，可以传递一个对象字面量：

```javascript
app.directive('demo', (el, binding) => {
  el.style.color = binding.value.color
  el.innerText = binding.value.text
})
```

```vue
<template>
  <div v-demo="{ color: 'blue', text: 'Hello 自定义指令' }"></div>
</template>
```

## 六、组件上的使用（不推荐）

自定义指令会作用于组件的根节点，和透传属性类似。组件有多个根节点时，指令会被忽略并抛出警告，且指令不能通过 `v-bind="$attrs"` 传递给其他元素。

## 七、最佳实践与注意事项

### 性能优化

- 避免在指令中进行复杂计算
- 使用 `requestAnimationFrame` 优化 DOM 操作
- 及时清理事件监听器和定时器

### 可维护性

- 指令逻辑应保持简单、单一职责
- 复杂逻辑应封装为工具函数
- 添加适当的注释和类型提示

### 常见陷阱

- `mounted` 不保证组件已渲染完成（使用 `nextTick` 如果需要）
- 指令无法访问组件模板中的局部变量
- 更新时可能需要访问旧值（通过 `binding.oldValue`）

### 替代方案考虑

- 对于简单场景，可以使用 `v-if` 或 `v-show`
- 对于复杂交互，考虑使用组合式函数（Composables）
- 对于全局行为，可结合 Provide/Inject 使用
