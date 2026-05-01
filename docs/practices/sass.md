# Sass预编译器使用

## 概述

Sass是CSS的预处理器，提供变量、嵌套、混入、函数等功能。

## 基础语法

### 1. 变量
```scss
// 定义变量
$primary-color: #1890ff;
$font-size: 14px;
$spacing: 16px;

// 使用变量
.container {
  color: $primary-color;
  font-size: $font-size;
  padding: $spacing;
}

// 默认变量
$border-color: #ddd !default;
```

### 2. 嵌套
```scss
.nav {
  background: #fff;
  
  // 嵌套选择器
  .nav-item {
    color: #333;
    
    // 父选择器引用
    &:hover {
      color: $primary-color;
    }
    
    // 伪类
    &::before {
      content: '';
    }
  }
  
  // 属性嵌套
  border: {
    top: 1px solid #ddd;
    bottom: 1px solid #ddd;
  }
}
```

### 3. 混入 (Mixin)
```scss
// 定义混入
@mixin flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

@mixin size($width, $height: $width) {
  width: $width;
  height: $height;
}

// 使用混入
.container {
  @include flex-center;
  @include size(100px, 200px);
}
```

### 4. 继承 (Extend)
```scss
// 基础样式
%button-base {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

// 继承样式
.button-primary {
  @extend %button-base;
  background: $primary-color;
  color: white;
}

.button-secondary {
  @extend %button-base;
  background: #f5f5f5;
  color: #333;
}
```

### 5. 函数
```scss
// 内置函数
.container {
  color: darken($primary-color, 10%);
  background: lighten($primary-color, 40%);
  padding: ceil(16.5px);
}

// 自定义函数
@function calculate-width($col, $total: 12) {
  @return percentage($col / $total);
}

.col-6 {
  width: calculate-width(6);
}
```

## 模块化

### 1. 文件组织
```scss
// styles/
// ├── variables.scss    // 变量
// ├── mixins.scss       // 混入
// ├── functions.scss    // 函数
// ├── base.scss         // 基础样式
// ├── components/       // 组件样式
// │   ├── button.scss
// │   └── card.scss
// └── main.scss         // 主入口
```

### 2. 导入使用
```scss
// main.scss
@import 'variables';
@import 'mixins';
@import 'functions';
@import 'base';
@import 'components/button';
@import 'components/card';
```

### 3. 使用@use (推荐)
```scss
// _variables.scss
$primary-color: #1890ff;

// main.scss
@use 'variables' as vars;

.container {
  color: vars.$primary-color;
}
```

## Vue3中使用

### 1. 安装配置
```bash
npm install sass sass-loader -D
```

### 2. 组件中使用
```vue
<style lang="scss" scoped>
.container {
  color: $primary-color;
  
  .title {
    font-size: 18px;
  }
}
</style>
```

### 3. 全局变量
```typescript
// vite.config.ts
export default defineConfig({
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  }
});
```

## 高级特性

### 1. 控制指令
```scss
// @if
@mixin theme($theme) {
  @if $theme == 'light' {
    background: white;
    color: black;
  } @else if $theme == 'dark' {
    background: black;
    color: white;
  }
}

// @for
@for $i from 1 through 5 {
  .col-#{$i} {
    width: percentage($i / 5);
  }
}

// @each
$colors: ('primary': #1890ff, 'success': #52c41a, 'warning': #faad14);

@each $name, $color in $colors {
  .text-#{$name} {
    color: $color;
  }
}
```

### 2. Map数据结构
```scss
$theme-colors: (
  'primary': #1890ff,
  'success': #52c41a,
  'warning': #faad14,
  'error': #f5222d
);

@function theme-color($key) {
  @return map-get($theme-colors, $key);
}

.button-primary {
  background: theme-color('primary');
}
```

## 最佳实践

1. **变量命名**：使用kebab-case命名
2. **文件组织**：按功能模块组织文件
3. **避免嵌套过深**：嵌套不超过3层
4. **使用Mixin**：复用样式片段
5. **使用@use**：替代@import
6. **注释规范**：使用//注释

## 常见问题

1. **编译错误**：语法错误或文件路径问题
2. **变量作用域**：注意变量的作用域
3. **性能问题**：复杂的嵌套可能影响编译性能
4. **浏览器兼容**：需要编译为CSS