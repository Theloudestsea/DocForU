# 前端埋点实现

## 概述

前端埋点用于收集用户行为数据，帮助分析用户使用情况和优化产品。

## 埋点类型

### 1. 代码埋点
手动在代码中插入埋点代码：

```typescript
// 点击事件埋点
function trackClick(eventName: string, params?: Record<string, any>) {
  analytics.track(eventName, {
    ...params,
    timestamp: Date.now(),
    page: window.location.pathname
  });
}

// 使用示例
button.addEventListener('click', () => {
  trackClick('button_click', { buttonId: 'submit' });
});
```

### 2. 自动埋点
自动收集页面访问、元素点击等：

```typescript
// 页面访问埋点
function trackPageView() {
  analytics.track('page_view', {
    url: window.location.href,
    referrer: document.referrer,
    timestamp: Date.now()
  });
}

// 自动收集点击事件
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.dataset.track) {
    trackClick(target.dataset.track, {
      element: target.tagName,
      text: target.textContent
    });
  }
});
```

### 3. 可视化埋点
通过配置平台标记需要埋点的元素：

```typescript
// 可视化埋点配置
const trackConfig = {
  '#submit-btn': { event: 'submit_click' },
  '.product-card': { event: 'product_view', params: { id: 'data-id' } }
};

// 应用配置
Object.entries(trackConfig).forEach(([selector, config]) => {
  document.querySelectorAll(selector).forEach(element => {
    element.addEventListener('click', () => {
      const params = config.params 
        ? { [config.params.id]: element.getAttribute('data-id') }
        : {};
      trackClick(config.event, params);
    });
  });
});
```

## navigator.sendBeacon

使用`navigator.sendBeacon`发送埋点数据，确保页面关闭时也能发送：

```typescript
function sendBeacon(url: string, data: any) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  return navigator.sendBeacon(url, blob);
}

// 页面离开时发送埋点
window.addEventListener('beforeunload', () => {
  sendBeacon('/api/track', {
    event: 'page_leave',
    duration: Date.now() - pageLoadTime
  });
});
```

## 埋点数据结构

### 1. 基础数据结构
```typescript
interface TrackEvent {
  // 事件类型
  event: string;
  // 事件参数
  params?: Record<string, any>;
  // 用户信息
  user?: {
    id: string;
    deviceId: string;
  };
  // 页面信息
  page?: {
    url: string;
    title: string;
    referrer: string;
  };
  // 时间信息
  timestamp: number;
  // 设备信息
  device?: {
    userAgent: string;
    screen: string;
    language: string;
  };
}
```

### 2. 埋点SDK实现
```typescript
class Analytics {
  private queue: TrackEvent[] = [];
  private endpoint: string;
  private batchSize = 10;
  private flushInterval = 5000;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
    this.initAutoTrack();
    this.startFlushTimer();
  }

  track(event: string, params?: Record<string, any>) {
    const trackEvent: TrackEvent = {
      event,
      params,
      timestamp: Date.now(),
      page: {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer
      }
    };

    this.queue.push(trackEvent);

    if (this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const events = [...this.queue];
    this.queue = [];

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(this.endpoint, JSON.stringify(events));
      } else {
        await fetch(this.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(events)
        });
      }
    } catch (error) {
      console.error('埋点发送失败:', error);
      this.queue.unshift(...events);
    }
  }

  private initAutoTrack() {
    // 页面访问
    this.track('page_view');

    // 页面离开
    window.addEventListener('beforeunload', () => {
      this.track('page_leave', {
        duration: Date.now() - performance.timing.navigationStart
      });
      this.flush();
    });
  }

  private startFlushTimer() {
    setInterval(() => this.flush(), this.flushInterval);
  }
}

export const analytics = new Analytics('/api/track');
```

## Vue3埋点指令

```typescript
// directives/track.ts
import { Directive } from 'vue';

export const vTrack: Directive = {
  mounted(el, binding) {
    const { event, params } = binding.value;
    
    el.addEventListener('click', () => {
      analytics.track(event, {
        ...params,
        element: el.tagName,
        text: el.textContent?.trim()
      });
    });
  }
};

// 使用示例
// <button v-track="{ event: 'submit_click', params: { formId: 'login' } }">
//   提交
// </button>
```

## 性能监控埋点

```typescript
// 性能指标收集
function collectPerformanceMetrics() {
  const metrics = {
    // 页面加载时间
    pageLoadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    // DOM解析时间
    domParseTime: performance.timing.domContentLoadedEventEnd - performance.timing.domLoading,
    // 首次渲染时间
    firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
    // 首次内容渲染
    firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime
  };

  analytics.track('performance', metrics);
}

// 页面加载完成后收集
window.addEventListener('load', () => {
  setTimeout(collectPerformanceMetrics, 0);
});
```

## 错误监控埋点

```typescript
// 全局错误捕获
window.addEventListener('error', (event) => {
  analytics.track('error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

// Promise错误捕获
window.addEventListener('unhandledrejection', (event) => {
  analytics.track('promise_error', {
    reason: event.reason?.toString(),
    stack: event.reason?.stack
  });
});
```

## 最佳实践

1. **数据脱敏**：敏感信息不埋点或加密处理
2. **批量发送**：减少网络请求次数
3. **失败重试**：埋点发送失败时重试
4. **性能考虑**：埋点代码不影响页面性能
5. **数据校验**：确保埋点数据格式正确
6. **隐私合规**：遵守相关隐私法规

## 常见问题

1. **数据丢失**：页面关闭时使用sendBeacon确保数据发送
2. **重复埋点**：避免同一事件重复埋点
3. **性能影响**：大量埋点可能影响页面性能
4. **跨域问题**：确保埋点接口支持跨域