# 路由面包屑实现

## 概述

面包屑导航显示用户在网站中的位置路径，帮助用户理解网站结构和导航。

## 实现方案

### 1. 基于路由配置
从Vue Router配置中自动生成面包屑：

```typescript
// router/index.ts
const routes = [
  {
    path: '/home',
    name: '首页',
    component: Home
  },
  {
    path: '/user',
    name: '用户管理',
    component: UserLayout,
    children: [
      {
        path: 'list',
        name: '用户列表',
        component: UserList
      },
      {
        path: 'detail/:id',
        name: '用户详情',
        component: UserDetail
      }
    ]
  }
];
```

### 2. 面包屑组件
```vue
<template>
  <div class="breadcrumb">
    <span 
      v-for="(item, index) in breadcrumbs" 
      :key="index"
      class="breadcrumb-item"
    >
      <router-link 
        v-if="item.path" 
        :to="item.path"
      >
        {{ item.name }}
      </router-link>
      <span v-else>{{ item.name }}</span>
      <span v-if="index < breadcrumbs.length - 1" class="separator">/</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

interface BreadcrumbItem {
  name: string;
  path?: string;
}

const route = useRoute();

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const matched = route.matched;
  const items: BreadcrumbItem[] = [];
  
  matched.forEach((record, index) => {
    if (record.meta?.title) {
      items.push({
        name: record.meta.title as string,
        path: index < matched.length - 1 ? record.path : undefined
      });
    }
  });
  
  return items;
});
</script>
```

### 3. 动态面包屑
支持动态路由参数：

```typescript
// utils/breadcrumb.ts
export function generateBreadcrumbs(route: RouteLocationNormalized) {
  const breadcrumbs: BreadcrumbItem[] = [];
  const matched = route.matched;
  
  matched.forEach((record) => {
    // 处理动态路由参数
    let path = record.path;
    const params = route.params;
    
    Object.keys(params).forEach(key => {
      path = path.replace(`:${key}`, params[key] as string);
    });
    
    if (record.meta?.title) {
      breadcrumbs.push({
        name: record.meta.title as string,
        path
      });
    }
  });
  
  return breadcrumbs;
}
```

## 高级功能

### 1. 自定义面包屑项
```vue
<template>
  <div class="breadcrumb">
    <slot name="prefix"></slot>
    
    <template v-for="(item, index) in breadcrumbs" :key="index">
      <slot name="item" :item="item" :index="index">
        <span class="breadcrumb-item">
          <router-link v-if="item.path" :to="item.path">
            {{ item.name }}
          </router-link>
          <span v-else>{{ item.name }}</span>
        </span>
      </slot>
      
      <span 
        v-if="index < breadcrumbs.length - 1" 
        class="separator"
      >
        <slot name="separator">/</slot>
      </span>
    </template>
    
    <slot name="suffix"></slot>
  </div>
</template>
```

### 2. 面包屑缓存
```typescript
// 缓存面包屑数据
const breadcrumbCache = new Map<string, BreadcrumbItem[]>();

export function getCachedBreadcrumbs(route: RouteLocationNormalized) {
  const key = route.path;
  
  if (breadcrumbCache.has(key)) {
    return breadcrumbCache.get(key)!;
  }
  
  const breadcrumbs = generateBreadcrumbs(route);
  breadcrumbCache.set(key, breadcrumbs);
  
  return breadcrumbs;
}
```

## 样式示例

```css
.breadcrumb {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 16px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
}

.breadcrumb-item a {
  color: #1890ff;
  text-decoration: none;
}

.breadcrumb-item a:hover {
  text-decoration: underline;
}

.breadcrumb-item span {
  color: #666;
}

.separator {
  margin: 0 8px;
  color: #999;
}
```

## 最佳实践

1. **路由元信息**：在路由配置中使用`meta.title`定义面包屑名称
2. **动态参数**：处理动态路由参数，生成正确的面包屑路径
3. **缓存优化**：缓存面包屑数据，避免重复计算
4. **样式统一**：保持面包屑样式与整体UI风格一致
5. **响应式设计**：移动端考虑折叠或省略过长的面包屑
6. **无障碍支持**：添加适当的ARIA属性

## 常见问题

1. **动态路由**：处理动态路由参数的面包屑显示
2. **权限控制**：根据用户权限显示不同的面包屑
3. **缓存更新**：路由变化时及时更新面包屑缓存
4. **性能优化**：避免在每次渲染时重新计算面包屑