# Vue路由恢复实现

## 概述

Vue路由恢复包括恢复滚动位置和恢复上次访问路由。

## 恢复滚动位置

### 1. 使用scrollBehavior
```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 路由配置
  ],
  scrollBehavior(to, from, savedPosition) {
    // 如果有保存的位置，恢复到该位置
    if (savedPosition) {
      return savedPosition;
    }
    
    // 如果有hash，滚动到锚点
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    
    // 默认滚动到顶部
    return { top: 0, behavior: 'smooth' };
  }
});
```

### 2. 自定义滚动位置保存
```typescript
// utils/scrollPosition.ts
const scrollPositions = new Map<string, number>();

export function saveScrollPosition(path: string) {
  scrollPositions.set(path, window.scrollY);
}

export function getScrollPosition(path: string): number {
  return scrollPositions.get(path) || 0;
}

// 路由守卫中使用
router.beforeEach((to, from) => {
  // 保存离开页面的滚动位置
  saveScrollPosition(from.path);
});

router.afterEach((to) => {
  // 恢复滚动位置
  const position = getScrollPosition(to.path);
  nextTick(() => {
    window.scrollTo(0, position);
  });
});
```

### 3. 使用keep-alive缓存
```vue
<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="cachedViews">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '@/stores/app';

const appStore = useAppStore();

const cachedViews = computed(() => appStore.cachedViews);
</script>
```

## 恢复上次访问路由

### 1. 使用localStorage保存
```typescript
// utils/routeStorage.ts
const ROUTE_KEY = 'last_visited_route';

export function saveLastRoute(route: RouteLocationNormalized) {
  const routeInfo = {
    path: route.path,
    query: route.query,
    params: route.params,
    hash: route.hash
  };
  localStorage.setItem(ROUTE_KEY, JSON.stringify(routeInfo));
}

export function getLastRoute() {
  const stored = localStorage.getItem(ROUTE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearLastRoute() {
  localStorage.removeItem(ROUTE_KEY);
}
```

### 2. 路由守卫实现
```typescript
// permission.ts
import router from './router';
import { saveLastRoute, getLastRoute } from './utils/routeStorage';

// 保存路由
router.afterEach((to) => {
  saveLastRoute(to);
});

// 恢复路由（在登录后）
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  
  if (userStore.token) {
    if (to.path === '/login') {
      // 已登录，跳转到上次访问的路由或首页
      const lastRoute = getLastRoute();
      next(lastRoute || '/');
    } else {
      next();
    }
  } else {
    // 未登录，保存当前路由，登录后跳转
    if (to.path !== '/login') {
      saveLastRoute(to);
    }
    next();
  }
});
```

### 3. 登录后恢复
```typescript
// stores/user.ts
import { defineStore } from 'pinia';
import { getLastRoute, clearLastRoute } from '@/utils/routeStorage';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null
  }),
  
  actions: {
    async login(credentials: any) {
      // 登录逻辑
      this.token = 'xxx';
      
      // 获取上次访问的路由
      const lastRoute = getLastRoute();
      if (lastRoute) {
        clearLastRoute();
        return lastRoute;
      }
      
      return '/';
    },
    
    logout() {
      this.token = '';
      this.userInfo = null;
      clearLastRoute();
    }
  }
});
```

## 高级功能

### 1. 多标签页路由同步
```typescript
// utils/tabSync.ts
const TAB_KEY = 'active_tabs';

export function syncRouteAcrossTabs() {
  // 监听storage事件
  window.addEventListener('storage', (e) => {
    if (e.key === TAB_KEY) {
      const route = JSON.parse(e.newValue || '{}');
      if (route.path) {
        router.push(route);
      }
    }
  });
  
  // 路由变化时同步
  router.afterEach((to) => {
    localStorage.setItem(TAB_KEY, JSON.stringify({
      path: to.path,
      query: to.query
    }));
  });
}
```

### 2. 路由历史记录
```typescript
// utils/routeHistory.ts
const MAX_HISTORY = 10;
const history: string[] = [];

export function addToHistory(path: string) {
  const index = history.indexOf(path);
  if (index > -1) {
    history.splice(index, 1);
  }
  history.unshift(path);
  
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
}

export function getHistory() {
  return [...history];
}
```

## 最佳实践

1. **滚动行为**：使用scrollBehavior配置
2. **缓存策略**：合理使用keep-alive
3. **存储选择**：根据需求选择sessionStorage或localStorage
4. **安全性**：敏感路由不建议持久化
5. **清理策略**：及时清理过期的路由数据
6. **用户体验**：页面刷新后保持用户状态

## 常见问题

1. **滚动冲突**：keep-alive与scrollBehavior冲突
2. **缓存过多**：缓存过多组件导致内存占用高
3. **路由重复**：重复添加相同路由
4. **数据过期**：保存的路由数据可能已失效