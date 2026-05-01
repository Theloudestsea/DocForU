# 并发处理多个请求的实现思路

## 概述

这是一个 **JavaScript 并发控制函数**，实现了类似"线程池"或"生产线"的模式。想象一个工厂有 `max` 个工人（比如3个），要处理 `urls` 中堆积的 100 个包裹。每个工人一次拿一个包裹处理，处理完立即拿下一个，直到包裹全部处理完毕。

## 基础实现（Fetch 版本）

### 代码实现

```javascript
async function concurrencyRequest(urls, max) {
  // 存储所有请求结果的数组，保持与urls相同的顺序
  const results = [];

  // 当前待处理URL的索引，全局共享（所有"工人"都盯着这个号码牌）
  let i = 0;

  // 单个"工人"的工作循环
  async function run() {
    // 如果号码已发完（没有更多URL了），这个工人就可以下班了
    if (i >= urls.length) return;
  
    // 抢占一个号码牌（idx），并把全局号码i+1（给下一个工人）
    // 注意：i++ 是先赋值给idx，再自增
    const idx = i++;
  
    // 发送请求并等待结果，按idx位置存入results（保证顺序）
    results[idx] = await fetch(urls[idx]);
  
    // 递归调用：这个工人完成当前任务后，立即接手下一个任务
    // 形成"链式反应"，保证始终有max个请求在并发进行
    await run();
  }

  // 创建max个并发的run实例（雇佣max个工人同时开始工作）
  // Array(max).fill() 创建一个长度为max的空数组
  // .map(run) 让每个位置都启动一个run函数
  // Promise.all 等待所有"工人"都真正下班（所有链式递归都结束）
  await Promise.all(Array(max).fill().map(run));

  return results;
}
```

### 执行流程图解

假设 `urls` 有 5 个链接，`max = 2`：

```
时间线：
┌──────────────────────────────────────────────┐
│ 工人A: 拿0号 → 请求中 → 完成 → 拿2号 → 请求中 → 完成 → 拿4号 → 请求中 → 完成 → 没任务了，下班 │
│ 工人B: 拿1号 → 请求中 → 完成 → 拿3号 → 请求中 → 完成 → 没任务了，下班                   │
└──────────────────────────────────────────────┘

共享变量i的变化：0 → 1 → 2 → 3 → 4 → 5（结束）
```

## 关键点解析

### 1. "抢单"机制（闭包共享）
`i` 被所有 `run` 实例共享。当多个 `run` 同时执行 `i++` 时：
- 由于 JavaScript 是单线程，虽然异步但不会出现竞争条件
- 每个工人拿到的 `idx` 都是唯一的，不会重复处理或遗漏

### 2. 递归链式反应（无栈溢出）
你可能会担心 `await run()` 是递归，会不会爆栈？
- **不会**。因为 `await` 会暂停当前函数，等待内部的 `fetch` 和下一轮 `run` 完成
- 实际上形成的是"异步链"而非"调用栈堆积"
- 每个 `await` 都会让出主线程，相当于"完成任务后重新排队"

### 3. 顺序保证
`results[idx]` 通过索引直接赋值，而非 `push`，因此无论哪个请求先完成，最终在 `results` 中的位置都与 `urls` 中的原始顺序一致。

## 优缺点分析

**优点：**
- 代码简洁，利用闭包和递归实现，无需复杂的状态管理
- 最大并发数严格等于 `max`，不会超发
- 结果保持原始顺序

**潜在问题：**
- 如果某个请求卡住（timeout很长），对应的"工人"会一直占用并发槽位，期间不会释放给新任务（因为没有超时中断机制）
- 错误处理缺失：如果某个 `fetch` 抛出异常，整个 `Promise.all` 会失败，且已成功的请求结果可能丢失

## 改进版本（带错误处理和超时）

```javascript
async function concurrencyRequest(urls, max, timeout = 8000) {
  const results = [];
  let i = 0;
  let completed = 0; // 已完成计数

  async function run() {
    if (i >= urls.length) return;
    const idx = i++;
    const url = urls[idx];
  
    try {
      // 添加超时控制
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
    
      results[idx] = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
    } catch (error) {
      results[idx] = { error: error.message, url };
    }
  
    completed++;
    console.log(`进度: ${completed}/${urls.length}`);
  
    // 继续下一个
    await run();
  }

  // 启动max个工人
  const workers = Array(max).fill().map(run);
  await Promise.all(workers);

  return results;
}
```

**使用示例：**
```javascript
const urls = ['https://api1.com', 'https://api2.com', 'https://api3.com'];
const data = await concurrencyRequest(urls, 2); // 最多同时请求2个
console.log(data); // 按urls顺序排列的结果数组
```

## Axios 版本实现

把 `fetch` 换成 `axios` 其实非常顺滑，甚至更简单，因为 `axios` 帮我们处理了很多繁琐的细节（比如自动解析 JSON、更简单的超时设置）。

### Axios 版本实现代码

```javascript
// 假设你已经安装了 axios: npm install axios
// const axios = require('axios'); // Node.js 环境需要这行
// import axios from 'axios';      // 前端 ES6 模块需要这行

async function concurrencyRequestAxios(urls, max, axiosConfig = {}) {
  const results = [];
  let i = 0;

  // 工人函数
  async function worker() {
    // 如果没有包裹了，下班
    if (i >= urls.length) return;

    // 抢占任务
    const idx = i++;
    const url = urls[idx];

    try {
      // --- 核心差异点 1：请求与超时 ---
      // axios 自动解析 JSON，不需要像 fetch 那样再调用 .json()
      // 直接在 config 中设置 timeout，单位是毫秒
      const response = await axios.get(url, {
        timeout: 5000,      // 单个请求超过5秒就视为失败
        ...axiosConfig      // 允许外部传入 headers 或其他配置
      });

      // 通常我们只需要 axios 返回对象中的 data 字段
      results[idx] = response.data;

    } catch (error) {
      // --- 核心差异点 2：错误处理 ---
      // axios 在 HTTP 状态码为 4xx 或 5xx 时也会抛出异常（fetch 不会）
      // 我们捕获错误，存入 results，保证其他请求不受影响
      results[idx] = {
        isError: true,
        msg: error.message,
        // 如果有响应（比如 404），可以把状态码存下来
        status: error.response ? error.response.status : null
      };
    }

    // 继续处理下一个
    await worker();
  }

  // 招募 max 个工人同时开工
  const workers = Array(max).fill().map(worker);
  await Promise.all(workers);

  return results;
}
```

## Axios 版本与 Fetch 版本的关键区别分析

### 1. 数据处理（更省心）
*   **Fetch**:
    *   拿到的是一个 `Response` 对象流。
    *   你需要手动调用 `response.json()` 才能拿到真正的数据，还要再写一层 `await`。
*   **Axios**:
    *   它是一个"贴心管家"，拿到响应后，自动把 JSON 字符串转成了 JavaScript 对象。
    *   直接取 `response.data` 就是你想要的内容，代码少了一层嵌套。

### 2. 错误抛出机制（更严格）
*   **Fetch**:
    *   只有网络断线（比如没网）才会 `reject`（报错）。
    *   如果服务器返回 `404` 或 `500`，Fetch **认为这是成功的请求**，不会进入 `catch`。你需要手动检查 `response.ok` 或 `response.status`。
*   **Axios**:
    *   只要 HTTP 状态码不是 `2xx`（比如 404, 500, 403），它都会直接**抛出异常**进入 `catch`。
    *   这对于业务逻辑判断非常方便，但在这个并发控制函数里，**必须** 用 `try/catch` 包住，否则一个 404 错误会导致整个程序崩溃，后续请求全停。

### 3. 超时取消（更简单）
*   **Fetch**:
    *   原生 Fetch 没有直接的 `timeout` 参数。
    *   你需要搞一个 `AbortController`，还要写一个 `setTimeout` 去手动触发 `controller.abort()`，代码比较啰嗦（如上一个回答所示）。
*   **Axios**:
    *   自带 `timeout` 属性。只要在配置里写 `timeout: 5000`，时间一到它自己就会取消请求并抛错，省心省力。

## 实战运行示例

你可以直接复制下面的代码到支持 `async/await` 的环境（或者浏览器的控制台，前提是引入了 axios 库）来测试：

```javascript
// 模拟一批测试 URL（使用公共测试 API）
const testUrls = [
  'https://jsonplaceholder.typicode.com/todos/1', // 正常
  'https://jsonplaceholder.typicode.com/todos/2', // 正常
  'https://jsonplaceholder.typicode.com/todos/404-error-test', // 模拟 404
  'https://jsonplaceholder.typicode.com/todos/4', // 正常
  'https://jsonplaceholder.typicode.com/todos/5', // 正常
];

// 运行并发请求
concurrencyRequestAxios(testUrls, 2)
  .then(res => {
    console.log("全部处理完成，结果如下：");
    console.log(res);
    /*
      你会看到结果数组中，索引2的位置是一个包含 isError: true 的对象
      而其他位置则是正常的 JSON 数据
    */
  })
  .catch(err => {
    console.log("宏观错误（通常不应该走到这里，除非代码写错）：", err);
  });
```

## 总结

用 `axios` 实现并发控制，逻辑和 `fetch` 完全一致（递归+索引抢占），主要的优势在于**代码更少**（自动解析JSON、配置超时更简单）以及**对错误的语义化处理**（HTTP错误自动抛异常）。

如果在你的项目中已经使用了 `axios`，优先使用这个版本。