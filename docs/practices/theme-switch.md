# 主题颜色切换实现思路

## 概述

主题颜色切换是前端开发中常见的需求，允许用户自定义界面颜色方案。

## 实现方案

### 1. CSS变量方案
使用CSS自定义属性（CSS Variables）实现主题切换：

```css
/* 定义主题变量 */
:root {
  --primary-color: #1890ff;
  --bg-color: #ffffff;
  --text-color: #333333;
}

/* 暗色主题 */
[data-theme="dark"] {
  --primary-color: #177ddc;
  --bg-color: #141414;
  --text-color: #ffffff;
}

/* 使用变量 */
.container {
  background-color: var(--bg-color);
  color: var(--text-color);
}

.button {
  background-color: var(--primary-color);
}
```

### 2. JavaScript切换
```typescript
// 切换主题
function switchTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

// 初始化主题
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  switchTheme(savedTheme as 'light' | 'dark');
}
```

### 3. Vue3实现
```vue
<template>
  <div class="theme-switch">
    <button @click="toggleTheme">
      {{ isDark ? '切换亮色' : '切换暗色' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isDark = ref(false);

const toggleTheme = () => {
  isDark.value = !isDark.value;
  const theme = isDark.value ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};

onMounted(() => {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    isDark.value = true;
    document.documentElement.setAttribute('data-theme', 'dark');
  }
});
</script>
```

## 动态主题色

### 1. 预定义主题色
```typescript
const themeColors = {
  blue: '#1890ff',
  green: '#52c41a',
  red: '#f5222d',
  purple: '#722ed1'
};

function setThemeColor(color: string) {
  document.documentElement.style.setProperty('--primary-color', color);
  localStorage.setItem('theme-color', color);
}
```

### 2. 用户自定义颜色
```vue
<template>
  <div class="color-picker">
    <input 
      type="color" 
      v-model="color" 
      @change="setThemeColor"
    />
    <span>当前主题色: {{ color }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const color = ref('#1890ff');

const setThemeColor = () => {
  document.documentElement.style.setProperty('--primary-color', color.value);
  localStorage.setItem('theme-color', color.value);
};
</script>
```

## 主题配置管理

### 1. 主题配置文件
```typescript
// theme.config.ts
export const themeConfig = {
  light: {
    primary: '#1890ff',
    bg: '#ffffff',
    text: '#333333',
    border: '#d9d9d9'
  },
  dark: {
    primary: '#177ddc',
    bg: '#141414',
    text: '#ffffff',
    border: #434343
  }
};
```

### 2. 主题管理器
```typescript
class ThemeManager {
  private currentTheme: 'light' | 'dark' = 'light';
  private currentColor: string = '#1890ff';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    const theme = localStorage.getItem('theme') as 'light' | 'dark';
    const color = localStorage.getItem('theme-color');
    
    if (theme) this.currentTheme = theme;
    if (color) this.currentColor = color;
    
    this.apply();
  }

  private apply() {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    document.documentElement.style.setProperty('--primary-color', this.currentColor);
  }

  toggleTheme() {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', this.currentTheme);
    this.apply();
  }

  setColor(color: string) {
    this.currentColor = color;
    localStorage.setItem('theme-color', color);
    this.apply();
  }

  getTheme() {
    return this.currentTheme;
  }

  getColor() {
    return this.currentColor;
  }
}

export const themeManager = new ThemeManager();
```

## 第三方库集成

### 1. Ant Design Vue主题
```typescript
// 使用ConfigProvider
import { ConfigProvider } from 'ant-design-vue';

const theme = ref({
  token: {
    colorPrimary: '#1890ff',
    colorBgContainer: '#ffffff'
  }
});

// 切换主题
const switchTheme = (color: string) => {
  theme.value.token.colorPrimary = color;
};
```

### 2. Element Plus主题
```typescript
// 使用CSS变量
:root {
  --el-color-primary: #409eff;
}

// 动态修改
document.documentElement.style.setProperty('--el-color-primary', color);
```

## 系统主题跟随

```typescript
// 跟随系统主题
function followSystemTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleChange = (e: MediaQueryListEvent) => {
    const theme = e.matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  };

  mediaQuery.addEventListener('change', handleChange);
  
  // 初始化
  if (mediaQuery.matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
}
```

## 最佳实践

1. **CSS变量优先**：使用CSS变量而非直接修改样式
2. **持久化存储**：保存用户主题选择到localStorage
3. **系统主题跟随**：支持跟随系统主题设置
4. **平滑过渡**：添加CSS过渡效果避免闪烁
5. **组件库集成**：与UI组件库主题系统配合
6. **性能考虑**：避免频繁操作DOM

## 常见问题

1. **主题闪烁**：在页面加载时设置主题，避免闪烁
2. **样式覆盖**：确保主题变量优先级足够高
3. **组件库兼容**：不同UI组件库主题配置方式不同
4. **颜色对比度**：确保文字和背景对比度符合无障碍标准