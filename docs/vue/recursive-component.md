# Vue3 递归组件详解

## 一、什么是递归组件？

**递归组件**是指一个组件在自己的模板中调用自身，从而形成嵌套结构的组件。就像函数递归调用自身一样，组件也可以递归使用。

### 核心特点

1. **自我调用**：组件在模板中通过名称调用自己
2. **层级结构**：适合处理树形、层级结构的数据
3. **终止条件**：必须有明确的终止条件，否则会无限递归导致栈溢出

### 关键前提

在 `<script setup>` 语法糖中，组件默认是匿名的，递归调用时必须通过 `defineOptions` 显式指定组件名称；非 setup 语法则通过 `name` 选项指定。

## 二、基础示例：树形菜单

### 1. 创建递归组件 TreeMenu.vue

```vue
<template>
  <ul class="tree-menu">
    <li v-for="item in items" :key="item.id">
      <!-- 显示当前节点内容 -->
      <div class="menu-item" @click="toggle(item)">
        <span class="icon">
          <span v-if="item.children && item.children.length">
            {{ item.expanded ? '▼' : '▶' }}
          </span>
          <span v-else>•</span>
        </span>
        <span class="label">{{ item.label }}</span>
        <span class="badge" v-if="item.count">{{ item.count }}</span>
      </div>
      
      <!-- 递归调用自身 -->
      <TreeMenu
        v-if="item.expanded && item.children && item.children.length"
        :items="item.children"
        :depth="depth + 1"
      />
    </li>
  </ul>
</template>

<script setup>
import { defineProps } from 'vue'

defineOptions({
  name: 'TreeMenu'
})

const props = defineProps({
  items: {
    type: Array,
    required: true,
    default: () => []
  },
  depth: {
    type: Number,
    default: 0
  }
})

// 切换展开/收起状态
const toggle = (item) => {
  if (item.children && item.children.length) {
    item.expanded = !item.expanded
  }
}
</script>

<style scoped>
.tree-menu {
  list-style: none;
  padding-left: 0;
  margin: 0;
}

.tree-menu ul {
  list-style: none;
  padding-left: 20px;
  margin: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.2s;
  margin-bottom: 2px;
}

.menu-item:hover {
  background-color: #f0f0f0;
}

.icon {
  width: 20px;
  display: inline-block;
  text-align: center;
  margin-right: 8px;
  color: #666;
}

.label {
  flex: 1;
}

.badge {
  background: #42b983;
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}
</style>
```

### 2. 使用示例

```vue
<template>
  <div class="container">
    <h2>递归组件示例：树形菜单</h2>
    
    <!-- 递归组件调用 -->
    <TreeMenu :items="menuData" />
    
    <!-- 按钮控制 -->
    <div class="controls">
      <button @click="expandAll">展开全部</button>
      <button @click="collapseAll">收起全部</button>
      <button @click="addNode">添加节点</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import TreeMenu from './components/TreeMenu.vue'

// 初始菜单数据
const menuData = ref([
  {
    id: 1,
    label: '首页',
    count: 0,
    expanded: false,
    children: []
  },
  {
    id: 2,
    label: '产品管理',
    count: 5,
    expanded: true,
    children: [
      {
        id: 21,
        label: '电子产品',
        count: 3,
        expanded: false,
        children: [
          { id: 211, label: '手机', count: 0, expanded: false, children: [] },
          { id: 212, label: '电脑', count: 0, expanded: false, children: [] }
        ]
      },
      {
        id: 22,
        label: '家居用品',
        count: 2,
        expanded: false,
        children: [
          { id: 221, label: '家具', count: 0, expanded: false, children: [] },
          { id: 222, label: '厨具', count: 0, expanded: false, children: [] }
        ]
      }
    ]
  },
  {
    id: 3,
    label: '用户管理',
    count: 10,
    expanded: false,
    children: [
      { id: 31, label: '用户列表', count: 0, expanded: false, children: [] },
      { id: 32, label: '权限管理', count: 0, expanded: false, children: [] }
    ]
  }
])

// 递归展开所有节点
const expandAll = () => {
  const expandRecursively = (nodes) => {
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        node.expanded = true
        expandRecursively(node.children)
      }
    })
  }
  expandRecursively(menuData.value)
}

// 递归收起所有节点
const collapseAll = () => {
  const collapseRecursively = (nodes) => {
    nodes.forEach(node => {
      node.expanded = false
      if (node.children && node.children.length > 0) {
        collapseRecursively(node.children)
      }
    })
  }
  collapseRecursively(menuData.value)
}

// 添加新节点
const addNode = () => {
  const addRecursively = (nodes, depth = 0) => {
    for (let node of nodes) {
      if (node.children && node.children.length > 0) {
        node.children.push({
          id: Date.now(),
          label: `新节点-${depth + 1}`,
          count: 0,
          expanded: false,
          children: []
        })
        node.expanded = true
        return true
      }
      if (addRecursively(node.children || [], depth + 1)) {
        return true
      }
    }
    return false
  }
  
  if (!addRecursively(menuData.value)) {
    menuData.value[0].children.push({
      id: Date.now(),
      label: '新根节点',
      count: 0,
      expanded: false,
      children: []
    })
    menuData.value[0].expanded = true
  }
}
</script>
```

## 三、进阶实战：嵌套评论系统

### 评论递归组件 CommentItem.vue

```vue
<template>
  <div class="comment-item">
    <!-- 当前评论内容 -->
    <div class="comment-content">
      <h4>{{ comment.author }}</h4>
      <p>{{ comment.content }}</p>
      <button @click="showReply = true">回复</button>
    </div>

    <!-- 回复输入框 -->
    <div v-if="showReply" class="reply-input">
      <input v-model="replyContent" placeholder="输入回复内容..." />
      <button @click="addReply">发送</button>
    </div>

    <!-- 递归渲染回复 -->
    <div v-if="comment.replies.length" class="comment-replies">
      <CommentItem 
        v-for="reply in comment.replies" 
        :key="reply.id" 
        :comment="reply" 
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineOptions({ name: 'CommentItem' })

const props = defineProps({
  comment: {
    type: Object,
    required: true
  }
})

const showReply = ref(false)
const replyContent = ref('')

const addReply = () => {
  if (!replyContent.value) return
  props.comment.replies.push({
    id: Date.now(),
    author: '我',
    content: replyContent.value,
    replies: []
  })
  replyContent.value = ''
  showReply.value = false
}
</script>

<style scoped>
.comment-item {
  margin: 10px 0;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}
.comment-replies {
  margin-left: 20px;
  margin-top: 10px;
}
.reply-input {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}
</style>
```

## 四、使用场景与适用范围

### 适用场景

| 场景 | 示例 |
|------|------|
| 树形结构展示 | 文件夹目录、组织架构、商品分类 |
| 嵌套评论系统 | 知乎/微博的评论+回复层级 |
| 无限级导航菜单 | 网站侧边栏/顶部导航的多级菜单 |
| 动态嵌套表单 | 订单的多级收货地址、问卷的多级问题 |

### 不适用场景

- 层级固定且较少（2-3 层）：用普通 `v-for` 嵌套更简单
- 数据量极大 + 层级极深：递归可能导致栈溢出，需结合虚拟列表、懒加载优化

## 五、性能优化建议

```javascript
// 1. 使用 v-memo 优化重复渲染
<OrgNode 
  v-memo="[node.id, node.expanded, node.count]"
  :node="node"
/>

// 2. 懒加载子节点
const loadChildren = async (node) => {
  if (!node.children && node.hasChildren) {
    node.children = await fetchChildren(node.id)
  }
}

// 3. 限制最大递归深度
const MAX_DEPTH = 10
const renderNode = (node, depth = 0) => {
  if (depth > MAX_DEPTH) return null
  // ...
}
```

## 六、常见陷阱与解决方案

| 陷阱 | 解决方案 |
|------|----------|
| 无限递归导致栈溢出 | 设置最大深度限制，确保有终止条件 |
| 数据更新时组件不更新 | 使用 `reactive` 或 `ref` 包裹数据 |
| `<script setup` 中无法递归 | 使用 `defineOptions` 指定组件名称 |
| 内存泄漏 | 在 `beforeUnmount` 中清理事件监听器 |
