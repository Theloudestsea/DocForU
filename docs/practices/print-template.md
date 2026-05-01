# 浏览器实现模板打印思路

## 概述

浏览器打印功能允许用户将网页内容打印为纸质文档或PDF文件。

## 实现方案

### 1. 基础打印
使用`window.print()`触发浏览器打印对话框：

```typescript
function printPage() {
  window.print();
}
```

### 2. 打印指定区域
使用CSS `@media print`控制打印内容：

```css
/* 打印时隐藏不需要的元素 */
@media print {
  .no-print {
    display: none !important;
  }
  
  .print-only {
    display: block !important;
  }
  
  /* 打印时调整样式 */
  body {
    font-size: 12pt;
    color: #000;
    background: #fff;
  }
  
  /* 避免分页断裂 */
  .page-break {
    page-break-before: always;
  }
  
  .avoid-break {
    page-break-inside: avoid;
  }
}
```

### 3. 打印iframe内容
```typescript
function printIframe(iframeId: string) {
  const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (iframe?.contentWindow) {
    iframe.contentWindow.print();
  }
}
```

## 打印模板实现

### 1. Vue3打印组件
```vue
<template>
  <div>
    <div ref="printContent" class="print-content">
      <h1>打印标题</h1>
      <p>打印内容...</p>
      <table>
        <tr><td>数据1</td><td>数据2</td></tr>
      </table>
    </div>
    
    <button @click="handlePrint">打印</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const printContent = ref<HTMLElement>();

const handlePrint = () => {
  if (!printContent.value) return;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  printWindow.document.write(`
    <html>
      <head>
        <title>打印</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 8px; }
        </style>
      </head>
      <body>
        ${printContent.value.innerHTML}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};
</script>
```

### 2. 打印样式优化
```css
/* 打印专用样式 */
@media print {
  /* 隐藏非打印元素 */
  .no-print,
  .el-dialog,
  .el-notification,
  .el-message {
    display: none !important;
  }
  
  /* 设置打印页面 */
  @page {
    size: A4;
    margin: 20mm;
  }
  
  /* 打印内容样式 */
  .print-content {
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  }
  
  /* 表格打印样式 */
  .print-table {
    border-collapse: collapse;
    width: 100%;
  }
  
  .print-table th,
  .print-table td {
    border: 1px solid #000;
    padding: 8px;
    text-align: left;
  }
  
  /* 避免分页断裂 */
  .print-row {
    page-break-inside: avoid;
  }
  
  /* 分页控制 */
  .page-break {
    page-break-before: always;
  }
}
```

## 高级打印功能

### 1. 打印预览
```typescript
function printPreview(content: string) {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow) return;
  
  previewWindow.document.write(`
    <html>
      <head>
        <title>打印预览</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px;
            background: #f5f5f5;
          }
          .preview-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
          @media print {
            .print-btn { display: none; }
            body { background: white; }
            .preview-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">打印</button>
        <div class="preview-container">
          ${content}
        </div>
      </body>
    </html>
  `);
}
```

### 2. 打印PDF生成
```typescript
// 使用html2pdf库
import html2pdf from 'html2pdf.js';

function generatePDF(element: HTMLElement, filename: string) {
  const opt = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  html2pdf().set(opt).from(element).save();
}
```

### 3. 打印Excel导出
```typescript
// 使用xlsx库
import * as XLSX from 'xlsx';

function exportToExcel(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

## 打印模板设计

### 1. 发票打印模板
```vue
<template>
  <div class="invoice-template">
    <div class="invoice-header">
      <h1>发票</h1>
      <div class="invoice-info">
        <p>发票号码: {{ invoice.number }}</p>
        <p>开票日期: {{ invoice.date }}</p>
      </div>
    </div>
    
    <div class="invoice-body">
      <table class="invoice-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>数量</th>
            <th>单价</th>
            <th>金额</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in invoice.items" :key="item.id">
            <td>{{ item.name }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ item.price }}</td>
            <td>{{ item.amount }}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="invoice-total">
        <p>总计: {{ invoice.total }}</p>
      </div>
    </div>
    
    <div class="invoice-footer">
      <p>备注: {{ invoice.remark }}</p>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .invoice-template {
    font-size: 12pt;
    padding: 0;
    margin: 0;
  }
  
  .invoice-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .invoice-table th,
  .invoice-table td {
    border: 1px solid #000;
    padding: 8px;
    text-align: left;
  }
}
</style>
```

## 最佳实践

1. **打印样式分离**：使用`@media print`定义打印专用样式
2. **内容精简**：打印时隐藏不必要的UI元素
3. **分页控制**：使用`page-break`控制分页位置
4. **字体大小**：打印时适当增大字体大小
5. **颜色调整**：打印时使用黑色文字，避免彩色
6. **测试验证**：在不同浏览器中测试打印效果

## 常见问题

1. **样式丢失**：打印时某些CSS样式可能不生效
2. **分页问题**：内容在分页处被切断
3. **背景色打印**：浏览器默认不打印背景色
4. **图片打印**：确保图片路径正确，考虑跨域问题