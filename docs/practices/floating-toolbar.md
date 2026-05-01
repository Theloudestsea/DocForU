# 浮动工具栏实现

## 概述

浮动工具栏是固定在页面某个位置的工具栏，通常用于提供快捷操作。

## 实现方案

### 1. 基础浮动工具栏
```vue
<template>
  <div class="floating-toolbar" :style="positionStyle">
    <div class="toolbar-header" @mousedown="startDrag">
      <span>工具栏</span>
      <button @click="toggleCollapse">
        {{ collapsed ? '展开' : '折叠' }}
      </button>
    </div>
    
    <div v-show="!collapsed" class="toolbar-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const position = ref({ x: 100, y: 100 });
const collapsed = ref(false);
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });

const positionStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`
}));

const startDrag = (e: MouseEvent) => {
  isDragging.value = true;
  dragOffset.value = {
    x: e.clientX - position.value.x,
    y: e.clientY - position.value.y
  };
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
};

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return;
  
  position.value = {
    x: e.clientX - dragOffset.value.x,
    y: e.clientY - dragOffset.value.y
  };
};

const stopDrag = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
};

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
};
</script>

<style scoped>
.floating-toolbar {
  position: fixed;
  z-index: 1000;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  min-width: 200px;
}

.toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px 8px 0 0;
  cursor: move;
  user-select: none;
}

.toolbar-content {
  padding: 12px;
}
</style>
```

### 2. 可吸附边缘的工具栏
```vue
<template>
  <div 
    class="floating-toolbar"
    :class="{ 'is-docked': isDocked }"
    :style="positionStyle"
    @mouseenter="showToolbar"
    @mouseleave="hideToolbar"
  >
    <div class="toolbar-content" v-show="isVisible">
      <slot></slot>
    </div>
    
    <div class="toolbar-trigger" v-show="!isVisible">
      <span>工具</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const position = ref({ x: 0, y: 100 });
const isDocked = ref(true);
const isVisible = ref(false);
const dockSide = ref<'left' | 'right'>('right');

const positionStyle = computed(() => {
  if (isDocked.value) {
    return dockSide.value === 'right' 
      ? { right: '0', top: `${position.value.y}px` }
      : { left: '0', top: `${position.value.y}px` };
  }
  return {
    left: `${position.value.x}px`,
    top: `${position.value.y}px`
  };
});

const showToolbar = () => {
  isVisible.value = true;
};

const hideToolbar = () => {
  isVisible.value = false;
};
</script>

<style scoped>
.floating-toolbar {
  position: fixed;
  z-index: 1000;
  transition: transform 0.3s ease;
}

.floating-toolbar.is-docked {
  transform: translateX(0);
}

.floating-toolbar.is-docked:not(:hover) {
  transform: translateX(calc(100% - 40px));
}

.toolbar-trigger {
  padding: 8px 12px;
  background: #1890ff;
  color: white;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
}
</style>
```

## 高级功能

### 1. 多工具栏管理
```typescript
class ToolbarManager {
  private toolbars = new Map<string, HTMLElement>();

  register(id: string, element: HTMLElement) {
    this.toolbars.set(id, element);
    this.arrangeToolbars();
  }

  unregister(id: string) {
    this.toolbars.delete(id);
    this.arrangeToolbars();
  }

  private arrangeToolbars() {
    const toolbars = Array.from(this.toolbars.values());
    const screenHeight = window.innerHeight;
    const toolbarHeight = 50;
    const gap = 10;
    
    toolbars.forEach((toolbar, index) => {
      const y = (screenHeight - (toolbars.length * (toolbarHeight + gap))) / 2 
                + index * (toolbarHeight + gap);
      toolbar.style.top = `${y}px`;
    });
  }
}

export const toolbarManager = new ToolbarManager();
```

### 2. 工具栏位置记忆
```typescript
function useToolbarPosition(toolbarId: string) {
  const position = ref({ x: 0, y: 0 });
  
  // 从localStorage恢复位置
  const savedPosition = localStorage.getItem(`toolbar-position-${toolbarId}`);
  if (savedPosition) {
    position.value = JSON.parse(savedPosition);
  }
  
  // 保存位置到localStorage
  const savePosition = () => {
    localStorage.setItem(
      `toolbar-position-${toolbarId}`,
      JSON.stringify(position.value)
    );
  };
  
  return { position, savePosition };
}
```

## 最佳实践

1. **拖拽体验**：提供平滑的拖拽体验
2. **边界检测**：防止工具栏被拖出视窗
3. **位置记忆**：记住用户上次的工具栏位置
4. **响应式设计**：适配不同屏幕尺寸
5. **无障碍支持**：支持键盘操作
6. **性能优化**：避免频繁重绘

## 常见问题

1. **拖拽卡顿**：使用transform代替top/left
2. **层级问题**：确保工具栏在最顶层
3. **移动端适配**：触摸事件处理
4. **内存泄漏**：及时清理事件监听器