# 后端返回路由实现思路

## 概述

动态路由是根据用户权限从后端获取路由配置，实现权限控制和动态菜单。

## 实现方案

### 1. 路由配置结构
```typescript
// 路由配置类型
interface RouteConfig {
  path: string;
  name: string;
  component: string; // 组件路径字符串
  meta?: {
    title: string;
    icon?: string;
    permission?: string[];
  };
  children?: RouteConfig[];
}
```

### 2. 后端路由接口
```typescript
// 后端返回的路由数据
const routes: RouteConfig[] = [
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: 'views/dashboard/index',
    meta: { title: '仪表盘', icon: 'dashboard' }
  },
  {
    path: '/user',
    name: 'User',
    component: 'views/user/index',
    meta: { title: '用户管理', icon: 'user', permission: ['user:manage'] },
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: 'views/user/list',
        meta: { title: '用户列表' }
      },
      {
        path: 'detail/:id',
        name: 'UserDetail',
        component: 'views/user/detail',
        meta: { title: '用户详情', hidden: true }
      }
    ]
  }
];
```

### 3. 前端动态路由实现
```typescript
// router/dynamic.ts
import { RouteRecordRaw } from 'vue-router';

// 组件映射表
const componentModules = import.meta.glob('../views/**/*.vue');

// 将后端路由转换为Vue Router路由
export function transformRoutes(routes: RouteConfig[]): RouteRecordRaw[] {
  return routes.map(route => {
    const { component, children, ...rest } = route;
    
    const transformedRoute: RouteRecordRaw = {
      ...rest,
      component: loadComponent(component),
      children: children ? transformRoutes(children) : []
    };
    
    return transformedRoute;
  });
}

// 动态加载组件
function loadComponent(component: string) {
  const componentPath = `../${component}.vue`;
  return componentModules[componentPath];
}

// 添加动态路由
export function addDynamicRoutes(routes: RouteConfig[]) {
  const router = useRouter();
  const transformedRoutes = transformRoutes(routes);
  
  transformedRoutes.forEach(route => {
    router.addRoute(route);
  });
  
  // 添加404路由（放在最后）
  router.addRoute({
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  });
}
```

### 4. 路由守卫实现
```typescript
// permission.ts
import router from './router';
import { useUserStore } from '@/stores/user';

const whiteList = ['/login', '/register'];

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  const hasToken = userStore.token;
  
  if (hasToken) {
    if (to.path === '/login') {
      next({ path: '/' });
    } else {
      const hasRoles = userStore.roles.length > 0;
      
      if (hasRoles) {
        next();
      } else {
        try {
          // 获取用户信息
          const { roles, routes } = await userStore.getUserInfo();
          
          // 生成动态路由
          const accessRoutes = await userStore.generateRoutes(roles);
          
          // 添加路由
          accessRoutes.forEach(route => {
            router.addRoute(route);
          });
          
          // 确保路由已加载完成
          next({ ...to, replace: true });
        } catch (error) {
          // 清除token并跳转登录页
          await userStore.logout();
          next(`/login?redirect=${to.path}`);
        }
      }
    }
  } else {
    if (whiteList.includes(to.path)) {
      next();
    } else {
      next(`/login?redirect=${to.path}`);
    }
  }
});
```

## 权限控制

### 1. 按钮权限
```typescript
// directives/permission.ts
import { Directive } from 'vue';
import { useUserStore } from '@/stores/user';

export const vPermission: Directive = {
  mounted(el, binding) {
    const { value } = binding;
    const userStore = useUserStore();
    
    if (value && value instanceof Array && value.length > 0) {
      const permissions = userStore.permissions;
      const hasPermission = value.some(permission => 
        permissions.includes(permission)
      );
      
      if (!hasPermission) {
        el.parentNode?.removeChild(el);
      }
    }
  }
};

// 使用示例
// <button v-permission="['user:delete']">删除</button>
```

### 2. 菜单权限
```typescript
// 根据权限过滤菜单
export function filterMenusByPermission(
  menus: RouteConfig[],
  permissions: string[]
): RouteConfig[] {
  return menus.filter(menu => {
    if (menu.meta?.permission) {
      return menu.meta.permission.some(p => permissions.includes(p));
    }
    return true;
  }).map(menu => {
    if (menu.children) {
      return {
        ...menu,
        children: filterMenusByPermission(menu.children, permissions)
      };
    }
    return menu;
  });
}
```

## Vue3实现

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

onMounted(async () => {
  if (userStore.token && userStore.roles.length === 0) {
    try {
      // 获取用户信息和路由
      const { routes } = await userStore.getUserInfo();
      
      // 动态添加路由
      routes.forEach(route => {
        router.addRoute(route);
      });
    } catch (error) {
      console.error('获取路由失败:', error);
    }
  }
});
</script>
```

## 最佳实践

1. **路由缓存**：缓存路由配置，避免重复请求
2. **权限校验**：前后端双重权限校验
3. **路由懒加载**：使用动态import实现路由懒加载
4. **错误处理**：路由加载失败的降级处理
5. **刷新恢复**：页面刷新后重新加载路由
6. **白名单**：登录、注册等页面不鉴权

## 常见问题

1. **刷新丢失**：页面刷新后动态路由丢失
2. **404问题**：动态路由未加载完成时访问404
3. **权限变更**：用户权限变更后路由未更新
4. **路由重复**：重复添加相同路由导致警告