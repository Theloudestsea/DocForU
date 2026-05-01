# Vue3 setup 语法糖原理深度解析

## 一、什么是 `<script setup>`

`<script setup>` 是 **Composition API 的编译时语法糖**。

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function add() {
  count.value++
}
</script>
```

**重点**：`<script setup>` 不是运行时特性，它在编译阶段会被转换成普通的 `setup()` 函数。

## 二、编译时的转换

### 转换前（你的代码）

```vue
<script setup>
import { ref } from 'vue'
const count = ref(0)
const inc = () => count.value++
</script>

<template>
  <button @click="inc">{{ count }}</button>
</template>
```

### 转换后（浏览器实际执行的 JS）

```javascript
export default {
  setup(__props, { expose }) {
    // 所有的顶层变量被提升
    const count = ref(0)
    const inc = () => count.value++

    // 编译器会自动识别模板中用到的变量，并在这里返回
    return { count, inc }
  }
}
```

## 三、核心底层机制

### 1. 顶层绑定自动暴露

在标准的 `setup()` 函数中，你必须手动 `return { ... }` 变量，模板才能访问。

在 `<script setup>` 中，编译器会扫描 **Binding Metadata（绑定元数据）**。只要是在顶层声明的变量（`const`, `function`, `import`），都会被自动加入到返回对象中。

### 2. 性能优化：内联渲染函数

在生产环境下，`<script setup>` 编译出的代码通常不会返回对象，而是直接将模板编译成一个**内联在 setup 作用域内**的渲染函数。

**为什么要这么做？**

- **减少 Proxy 开销**：如果返回对象，模板访问变量需要经过一层 `setupState` 的代理
- **闭包直接访问**：内联后，渲染函数可以直接通过 JS 闭包访问 `setup` 作用域内的局部变量，跳过了 `this` 或代理查找，速度极快

### 3. 宏命令的静态替换

像 `defineProps` 和 `defineEmits` 并不是真正的函数，它们是 **Compiler Macros（编译宏）**。

- 它们在运行时**不存在**
- 编译器看到它们时，会把参数"抽离"出来，放到组件定义的 `props` 或 `emits` 选项中
- 这也是为什么你不需要 `import` 它们就能直接使用

## 四、编译器工作流程

Vue3 的编译器（`@vue/compiler-sfc`）处理 `<script setup>` 的完整流程：

```typescript
function compileScript(sfc, options) {
  const { setup, script, template, styles } = sfc
  
  // 1. 解析 setup 块
  const setupBlock = setup?.content || ''
  
  // 2. 使用 Babel 解析 AST
  const ast = parse(setupBlock, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  })
  
  // 3. 收集导入语句
  const imports = collectImports(ast)
  
  // 4. 收集顶层声明
  const declarations = collectDeclarations(ast)
  
  // 5. 处理编译宏
  const macros = processMacros(ast)
  
  // 6. 生成 setup 函数
  const setupCode = generateSetupFunction({
    imports,
    declarations,
    macros,
    template: template?.content
  })
  
  // 7. 生成组件选项
  const componentOptions = generateComponentOptions({
    setupCode,
    props: macros.props,
    emits: macros.emits,
    components: imports.components
  })
  
  return {
    code: componentOptions,
    map: generateSourceMap()
  }
}
```

## 五、编译宏处理

### defineProps 和 defineEmits

```typescript
function processMacros(ast) {
  const macros = {
    props: {},
    emits: [],
    expose: null,
    slots: null
  }
  
  traverse(ast, {
    CallExpression(path) {
      const { callee, arguments: args } = path.node
      
      // 处理 defineProps
      if (callee.name === 'defineProps') {
        if (args[0]) {
          macros.props = parseProps(args[0])
        } else {
          macros.props = '__props'
        }
      }
      
      // 处理 defineEmits
      if (callee.name === 'defineEmits') {
        if (args[0]) {
          macros.emits = parseEmits(args[0])
        }
      }
      
      // 处理 defineExpose
      if (callee.name === 'defineExpose') {
        macros.expose = args[0]
      }
    }
  })
  
  return macros
}
```

### 编译前后对比

**编译前：**

```vue
<script setup>
import MyButton from './MyButton.vue'

const count = ref(0)

defineProps({
  title: String
})

defineEmits(['update'])

defineExpose({ count })
</script>
```

**编译后：**

```javascript
import MyButton from './MyButton.vue'

export default {
  components: {
    MyButton
  },
  props: {
    title: String
  },
  emits: ['update'],
  setup(props, { emit }) {
    const count = ref(0)
    
    return {
      count
    }
  }
}
```

## 六、运行时 setup 函数的执行时机

```typescript
function mountComponent(vnode) {
  // 1. 创建实例
  const instance = createComponentInstance(vnode)
  
  // 2. 调用 setup
  const setupResult = callSetup(instance)
  
  // 3. 处理返回值
  processSetupResult(instance, setupResult)
  
  // 4. 创建渲染上下文
  const setupContext = createSetupContext(instance)
  
  // 5. 调用 render 函数
  const renderResult = instance.render(setupContext)
  
  // 6. 更新 DOM
  patch(renderResult, vnode.el)
}
```

### setup 的执行时机

1. **创建实例**：`createApp` 或父组件渲染触发子组件创建
2. **初始化阶段**：在 `beforeCreate` 钩子**之前**，Vue 会调用内部的 `setupComponent(instance)`
3. **调用 setup**：此时会执行编译后的 `setup` 函数
4. **处理结果**：
   - 如果是对象：将其转为响应式并挂载到实例
   - 如果是函数：直接将其作为组件的 `render` 函数

## 七、为什么 `<script setup>` 性能更好

| 特性 | 普通 `<script>` + `setup()` | `<script setup>` |
|------|------------------------------|------------------|
| **代码量** | 冗长，需手动 return | 简洁，自动暴露 |
| **TS 支持** | 需配合 `defineComponent` | 原生支持更好 |
| **运行效率** | 依赖 Proxy 代理访问 | **闭包直接访问**，效率更高 |
| **心智负担** | 需要处理 `this` 和上下文 | 纯粹的 JS 函数逻辑 |

### 具体优势

1. **少一层代理**：编译阶段直接绑定变量，更少的运行时开销
2. **更好的 Tree Shaking**：未使用变量会被删除，更小打包体积
3. **更少的组件实例属性访问**：模板变量是静态分析绑定，而不是运行时动态查找

## 八、响应式在 setup 中的工作原理

```javascript
const count = ref(0)
```

ref 本质：

```javascript
function ref(value) {
  return {
    get value() {
      track()
      return value
    },
    set value(newVal) {
      trigger()
    }
  }
}
```

依赖收集发生在组件 render 执行时，访问了 `count.value`。

更新流程：

```
trigger()
  → scheduler
  → 重新执行 render
  → diff
  → patch
```

## 九、完整组件初始化流程

```
createComponentInstance
  → setupComponent
      → initProps
      → initSlots
      → setup()
      → proxyRefs
      → finishComponentSetup
          → compile template to render
  → setupRenderEffect
      → effect(render)
```

## 十、重要细节

- setup 只执行一次
- setup 早于 `beforeCreate`
- setup 里没有 `this`
- `<script setup>` 是编译宏，不是运行时特性

## 十一、总结

`<script setup>` 的本质是：**由编译器代劳，将原本需要开发者手动书写的组件配置（Props、Emits、Return 对象）通过静态分析自动生成，并利用 JS 闭包特性优化渲染性能。**

它是 Vue 3 从"选项式"转向"函数式"思想的终极形态。
