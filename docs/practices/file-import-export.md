# 文件导入导出实现思路

## 概述

文件导入导出是企业级应用中常见的功能，核心是将文件在前端和后端之间进行传输和处理。

## 核心流程

### 文件导入流程
```
用户选择文件 → 前端封装FormData → 发送multipart/form-data请求 → 后端接收文件 → 解析文件内容 → 数据校验 → 数据入库 → 返回结果
```

### 文件导出流程
```
用户触发导出 → 前端发送请求 → 后端查询数据 → 生成文件 → 设置响应头 → 返回文件流 → 前端处理Blob → 触发下载
```

## 关键技术点

### 前端导入实现
1. **文件选择**：使用`<input type="file">`或UI组件库
2. **数据封装**：构造`FormData`对象，`formData.append('file', fileObj)`
3. **请求配置**：设置`Content-Type: multipart/form-data`
4. **响应处理**：解析后端返回的导入结果

### 前端导出实现
1. **请求配置**：设置`responseType: 'blob'`
2. **Blob处理**：`URL.createObjectURL(blob)`生成临时链接
3. **下载触发**：创建隐藏`<a>`标签，设置`download`属性，触发点击

### 后端导入实现
1. **文件接收**：使用`multer`等中间件处理`multipart/form-data`
2. **文件解析**：使用`ExcelJS`、`xlsx`等库解析Excel文件
3. **数据校验**：格式校验、业务规则校验
4. **数据入库**：批量插入数据库，支持事务处理

### 后端导出实现
1. **数据查询**：根据条件查询数据库
2. **文件生成**：使用库生成Excel/CSV文件
3. **流式响应**：设置正确的响应头，直接写入响应流

## 代码示例

### 前端导入示例
```typescript
// 文件导入
async function importFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/import', {
    method: 'POST',
    body: formData,
    // 注意：不要手动设置Content-Type，浏览器会自动设置
  });
  
  return response.json();
}
```

### 前端导出示例
```typescript
// 文件导出
async function exportFile(params: ExportParams) {
  const response = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    responseType: 'blob' // 重要：设置响应类型为blob
  });
  
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `export_${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### 后端导入示例 (Express)
```typescript
import multer from 'multer';
import ExcelJS from 'exceljs';

const upload = multer({ dest: 'uploads/' });

app.post('/api/import', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(file.path);
    
    const worksheet = workbook.getWorksheet(1);
    const data = [];
    
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // 跳过表头
        data.push({
          name: row.getCell(1).value,
          age: row.getCell(2).value,
          department: row.getCell(3).value
        });
      }
    });
    
    // 数据校验和入库逻辑
    const result = await importDataToDB(data);
    
    res.json({
      success: true,
      message: `成功导入 ${result.success} 条数据`,
      failed: result.failed
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

### 后端导出示例 (Express)
```typescript
import ExcelJS from 'exceljs';

app.post('/api/export', async (req, res) => {
  try {
    const { filters } = req.body;
    const data = await queryDataFromDB(filters);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    
    // 添加表头
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '姓名', key: 'name', width: 20 },
      { header: '年龄', key: 'age', width: 10 },
      { header: '部门', key: 'department', width: 20 }
    ];
    
    // 添加数据
    data.forEach(row => {
      worksheet.addRow(row);
    });
    
    // 设置响应头
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    
    // 流式写入响应
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
```

## 大文件处理策略

### 同步导入（小文件）
- 文件直接上传，后端同步处理
- 适合文件小于10MB，数据量小的场景

### 异步导入（大文件）
1. 用户上传文件
2. 后端保存文件并创建导入任务
3. 立即返回任务ID
4. 后端异步解析和处理
5. 前端通过轮询/WebSocket查询任务状态
6. 任务完成后展示结果

### 异步导出（大数据量）
1. 前端发起导出任务
2. 后端记录任务并立即返回任务ID
3. 后端异步查询数据并生成文件
4. 文件生成后上传到对象存储
5. 前端轮询任务状态
6. 任务完成后返回下载地址

## 最佳实践

1. **文件校验**：前后端都要进行文件类型、大小校验
2. **错误处理**：提供详细的错误信息和失败原因
3. **进度反馈**：显示导入导出进度
4. **数据预览**：导入前预览数据，确认后导入
5. **模板下载**：提供标准导入模板
6. **权限控制**：导入导出权限分离
7. **日志记录**：记录所有导入导出操作

## 常见问题

1. **中文文件名乱码**：使用`encodeURIComponent`编码文件名
2. **大文件超时**：使用异步任务模式
3. **内存溢出**：使用流式处理，避免一次性加载大文件
4. **并发安全**：导入时考虑幂等性，避免重复导入