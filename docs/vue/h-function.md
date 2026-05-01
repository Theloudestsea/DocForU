# Vue 中 h 函数详解

通俗地说，**h 函数**就像是 Vue 里的"**虚拟乐高工厂**"。

我们平时写 `<div class="box">Hello</div>` 这种模板，Vue 内部其实会把它翻译成 h 函数调用。而直接使用 h 函数，就是跳过"设计图纸"（模板），直接用 JavaScript 代码告诉 Vue："给我造一个 div 积木，刷上红色的 class 漆，里面写上 Hello 文字"。

## 一、基本用法（Vue 3）

在 Vue 3 中，你需要从 vue 中导入它：

```typescript
import { h } from 'vue'

// 基础配方：h(标签名, 属性对象, 子内容)
const vnode = h('div', { class: 'box', id: 'app' }, 'Hello World')
```

这相当于模板中的：

```html
<div class="box" id="app">Hello World</div>
```

## 二、三个参数详解

想象你在点菜（创建 DOM 节点）：

| 参数 | 作用 | 类比 |
|------|------|------|
| **第1个** | 标签名或组件 | 菜名（宫保鸡丁） |
| **第2个** | 属性/事件/配置 | 口味要求（少辣、加葱） |
| **第3个** | 子节点内容 | 配菜搭配 |

```typescript
// 例子：创建一个带点击事件的按钮，里面有个图标和文字
h('button', 
  { 
    class: 'btn',
    onClick: () => console.log('clicked!')
  }, 
  [
    h('span', { class: 'icon' }, '🔥'),
    ' 点击我'
  ]
)
```

## 三、为什么不用模板，要用 h 函数？

### 场景1：动态性太强（比如根据数据生成不同层级）

假设你要做一个**递归树组件**，不知道会有多少层嵌套：

```typescript
import { h } from 'vue'

interface TreeNode {
  name: string
  children?: TreeNode[]
}

// 函数组件：递归渲染树
function TreeNodeComponent(props: { data: TreeNode }) {
  const { data } = props

  // 如果有子节点，递归调用自己
  const children = data.children?.map(child => 
    h(TreeNodeComponent, { data: child, key: child.name })
  )

  return h('div', { class: 'tree-node' }, [
    h('span', { class: 'node-title' }, data.name),
    children && h('div', { class: 'children' }, children)
  ])
}
```

用模板写递归很麻烦，但用 h 函数就很自然。

### 场景2：完全动态的表格列

```typescript
import { h, ref } from 'vue'

function renderTable() {
  const columns = [
    { title: '姓名', key: 'name' },
    { title: '操作', key: 'action', render: (row) => 
      h('button', {
        onClick: () => handleDelete(row)
      }, '删除')
    }
  ]

  // 动态生成表头
  return h('table', {}, [
    h('thead', {}, 
      h('tr', {}, columns.map(col => 
        h('th', {}, col.title)
      ))
    ),
    h('tbody', {}, data.map(row =>
      h('tr', {}, columns.map(col =>
        h('td', {}, 
          col.render ? col.render(row) : row[col.key]
        )
      ))
    ))
  ])
}
```

## 四、h 函数 vs 模板：对比示例

假设要实现一个**消息提示框**，根据类型显示不同颜色：

**模板写法**（受限）：

```html
<div v-if="type === 'success'" class="success">成功</div>
<div v-else-if="type === 'error'" class="error">失败</div>
<div v-else class="info">提示</div>
```

**h 函数写法**（灵活）：

```typescript
function Message(props: { type: 'success' | 'error' | 'info', text: string }) {
  const colorMap = {
    success: 'green',
    error: 'red',
    info: 'blue'
  }

  return h('div', {
    class: `message ${props.type}`,
    style: { color: colorMap[props.type] }
  }, props.text)
}
```

## 五、Vue 2 vs Vue 3 的区别

**Vue 2**（h 作为 render 参数）：

```typescript
export default {
  render(h) {  // h 是 Vue 传进来的
    return h('div', {}, 'Hello')
  }
}
```

**Vue 3**（从 vue 导入）：

```typescript
import { h } from 'vue'

export default {
  setup() {
    return () => h('div', {}, 'Hello')  // 返回渲染函数
  }
}
```

## 六、实战：封装一个 Badge 组件

```typescript
import { h, computed } from 'vue'

interface BadgeProps {
  count: number
  showZero?: boolean
  color?: string
}

function Badge(props: BadgeProps, { slots }: any) {
  // 计算是否显示
  const shouldShow = computed(() => {
    if (props.count === 0) return props.showZero
    return props.count > 0
  })

  return h('span', { class: 'badge-wrapper' }, [
    // 默认插槽内容
    slots.default?.(),
  
    // 徽标数字
    shouldShow.value && h('sup', {
      class: 'badge-count',
      style: props.color ? { backgroundColor: props.color } : {}
    }, props.count > 99 ? '99+' : props.count)
  ])
}
```

## 七、总结记忆口诀

**h 函数三句话**：

1. **一参数**是"什么"（div/组件）
2. **二参数**是"怎样"（class、style、onClick）
3. **三参数**是"里面装啥"（文字、子元素数组）

**什么时候用**：

- 写**递归组件**（树、菜单）
- 需要**高度动态**的渲染逻辑（根据配置生成表单）
- 写**函数组件**（简单轻量，无状态）
- 封装**命令式调用**的组件（如 `Message.success()` 这种 API）

h 函数其实就是 Vue 的"手动挡"，虽然比模板难开一点，但操控性更强。
