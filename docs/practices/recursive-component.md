# 递归组件详解

## 概述

递归组件是在其模板中引用自身的Vue组件，常用于渲染树形结构数据。

## 基本实现

### 1. 基础递归组件
```vue
<template>
  <div class="tree-node">
    <div class="node-content">
      {{ node.name }}
    </div>
    <div v-if="node.children" class="node-children">
      <tree-node 
        v-for="child in node.children" 
        :key="child.id" 
        :node="child"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface TreeNode {
  id: number;
  name: string;
  children?: TreeNode[];
}

defineProps<{
  node: TreeNode;
}>();
</script>

<script lang="ts">
export default {
  name: 'TreeNode'
};
</script>
```

### 2. 带缩进的递归组件
```vue
<template>
  <div class="tree">
    <div 
      v-for="item in data" 
      :key="item.id" 
      class="tree-item"
    >
      <div 
        class="tree-label"
        :style="{ paddingLeft: `${level * 20}px` }"
        @click="toggle(item)"
      >
        <span v-if="item.children" class="toggle-icon">
          {{ expanded[item.id] ? '▼' : '▶' }}
        </span>
        <span v-else class="leaf-icon">•</span>
        {{ item.name }}
      </div>
      
      <recursive-tree 
        v-if="item.children && expanded[item.id]"
        :data="item.children"
        :level="level + 1"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface TreeNode {
  id: number;
  name: string;
  children?: TreeNode[];
}

const props = defineProps<{
  data: TreeNode[];
  level?: number;
}>();

const level = props.level || 0;
const expanded = ref<Record<number, boolean>>({});

const toggle = (item: TreeNode) => {
  if (item.children) {
    expanded.value[item.id] = !expanded.value[item.id];
  }
};
</script>
```

## 高级功能

### 1. 可选择的递归组件
```vue
<template>
  <div class="tree">
    <div 
      v-for="item in data" 
      :key="item.id" 
      class="tree-item"
    >
      <div class="tree-label">
        <input 
          type="checkbox" 
          :checked="selected[item.id]"
          @change="toggleSelect(item)"
        />
        {{ item.name }}
      </div>
      
      <selectable-tree 
        v-if="item.children"
        :data="item.children"
        :selected="selected"
        @update:selected="$emit('update:selected', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: TreeNode[];
  selected: Record<number, boolean>;
}>();

const emit = defineEmits<{
  (e: 'update:selected', value: Record<number, boolean>): void;
}>();

const toggleSelect = (item: TreeNode) => {
  const newSelected = { ...props.selected };
  newSelected[item.id] = !newSelected[item.id];
  
  // 如果有子节点，递归选择/取消选择
  if (item.children) {
    const selectChildren = (nodes: TreeNode[], select: boolean) => {
      nodes.forEach(node => {
        newSelected[node.id] = select;
        if (node.children) {
          selectChildren(node.children, select);
        }
      });
    };
    selectChildren(item.children, newSelected[item.id]);
  }
  
  emit('update:selected', newSelected);
};
</script>
```

### 2. 拖拽排序的递归组件
```vue
<template>
  <div class="tree">
    <div 
      v-for="item in data" 
      :key="item.id" 
      class="tree-item"
      draggable="true"
      @dragstart="onDragStart(item, $event)"
      @dragover.prevent
      @drop="onDrop(item, $event)"
    >
      <div class="tree-label">
        {{ item.name }}
      </div>
      
      <draggable-tree 
        v-if="item.children"
        :data="item.children"
        @update:data="$emit('update:data', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const draggedItem = ref<TreeNode | null>(null);

const onDragStart = (item: TreeNode, event: DragEvent) => {
  draggedItem.value = item;
  event.dataTransfer?.setData('text/plain', item.id.toString());
};

const onDrop = (targetItem: TreeNode, event: DragEvent) => {
  event.preventDefault();
  if (draggedItem.value && draggedItem.value.id !== targetItem.id) {
    // 处理拖拽逻辑
    console.log(`将 ${draggedItem.value.name} 拖到 ${targetItem.name}`);
  }
  draggedItem.value = null;
};
</script>
```

## 性能优化

### 1. 虚拟滚动递归组件
```vue
<template>
  <div class="virtual-tree" :style="{ height: `${height}px` }">
    <div 
      class="tree-container"
      :style="{ transform: `translateY(${offset}px)` }"
    >
      <div 
        v-for="item in visibleItems" 
        :key="item.id"
        class="tree-item"
        :style="{ paddingLeft: `${item.level * 20}px` }"
      >
        {{ item.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  data: TreeNode[];
  height: number;
  itemHeight: number;
}>();

const scrollTop = ref(0);

const flatItems = computed(() => {
  const result: (TreeNode & { level: number })[] = [];
  
  const flatten = (nodes: TreeNode[], level: number) => {
    nodes.forEach(node => {
      result.push({ ...node, level });
      if (node.children) {
        flatten(node.children, level + 1);
      }
    });
  };
  
  flatten(props.data, 0);
  return result;
});

const visibleItems = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight);
  const end = start + Math.ceil(props.height / props.itemHeight);
  return flatItems.value.slice(start, end);
});

const offset = computed(() => {
  return Math.floor(scrollTop.value / props.itemHeight) * props.itemHeight;
});
</script>
```

### 2. 懒加载递归组件
```vue
<template>
  <div class="tree">
    <div 
      v-for="item in data" 
      :key="item.id" 
      class="tree-item"
    >
      <div 
        class="tree-label"
        @click="toggle(item)"
      >
        <span v-if="item.hasChildren" class="toggle-icon">
          {{ expanded[item.id] ? '▼' : '▶' }}
        </span>
        {{ item.name }}
      </div>
      
      <lazy-tree 
        v-if="item.hasChildren && expanded[item.id]"
        :data="children[item.id] || []"
        :load-children="(id) => loadChildren(id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  data: TreeNode[];
  loadChildren: (id: number) => Promise<TreeNode[]>;
}>();

const expanded = ref<Record<number, boolean>>({});
const children = ref<Record<number, TreeNode[]>>({});

const toggle = async (item: TreeNode) => {
  if (item.hasChildren) {
    expanded.value[item.id] = !expanded.value[item.id];
    
    if (expanded.value[item.id] && !children.value[item.id]) {
      children.value[item.id] = await props.loadChildren(item.id);
    }
  }
};
</script>
```

## 最佳实践

1. **组件命名**：递归组件必须有name属性
2. **数据结构**：确保数据结构正确，避免无限递归
3. **性能考虑**：大数据量使用虚拟滚动或懒加载
4. **展开状态**：使用对象记录展开状态，避免数组遍历
5. **事件处理**：递归组件事件需要逐层传递
6. **样式隔离**：使用scoped或BEM命名避免样式冲突

## 常见问题

1. **无限递归**：确保递归有终止条件
2. **性能问题**：大数据量导致渲染卡顿
3. **状态管理**：多层嵌套时状态管理复杂
4. **事件传递**：深层嵌套事件传递困难