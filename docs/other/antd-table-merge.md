# Ant Design Vue 表格行/列合并实现指南

## 项目概述

本文档说明在当前 **CBPS2G-UI** 项目（基于 Vue 3 + Ant Design Vue 2.2.8 + Vben Admin）中如何实现表格的行合并（rowSpan）和列合并（colSpan）功能。

## 当前项目表格架构

### 技术栈
- **Ant Design Vue**: 2.2.8 版本
- **Vue**: 3.5.12 版本
- **表格组件**: 项目封装的 BasicTable 组件

### 核心文件路径
```
src/
├── components/Table/
│   ├── src/BasicTable.vue              # 基础表格组件
│   ├── src/types/column.ts             # 列定义类型
│   └── src/types/table.ts              # 表格属性类型
└── views/
    └── **/tableDefine.tsx              # 各业务模块的列定义文件
```

## Ant Design Vue 原生支持的合并方式

### 1. customRender 返回合并对象（推荐）

这是最常用的方式，通过在列定义的 `customRender` 函数中返回包含 `attrs` 的对象：

```typescript
// 在 tableDefine.tsx 中
export const basicColumns: BasicColumn[] = [
  {
    title: '业务日期',
    dataIndex: 'busiDate',
    customRender: ({ text, record, index }) => {
      // 计算行合并数
      const rowSpan = calculateRowSpan(record, index);

      if (rowSpan > 0) {
        return {
          children: text,  // 渲染内容
          attrs: {
            rowSpan: rowSpan,  // 行合并数
            colSpan: 1,        // 列合并数
          },
        };
      }

      // 不显示该单元格（已被合并）
      return {
        children: text,
        attrs: {
          rowSpan: 0,
          colSpan: 1,
        },
      };
    },
  },
];
```

### 2. customCell 设置单元格属性

在列定义中直接设置单元格属性：

```typescript
{
  title: '金额',
  dataIndex: 'amount',
  customCell: (record, rowIndex) => {
    // 根据业务逻辑返回合并配置
    const rowSpan = calculateRowSpan(record, rowIndex);
    return {
      rowSpan,
      colSpan: 1,
      style: { textAlign: 'right' },  // 可同时设置样式
    };
  },
}
```

### 3. spanMethod 属性（需组件支持）

在 Table 组件上直接使用 `spanMethod` 属性：

```typescript
// 需要 BasicTable 组件支持该属性
<a-table
  :dataSource="data"
  :columns="columns"
  :spanMethod="handleSpanMethod"
/>

// 处理函数
const handleSpanMethod = (record, rowIndex, column, columnIndex) => {
  // 返回 [rowSpan, colSpan]
  if (column.dataIndex === 'busiDate') {
    return [2, 1];  // 合并2行1列
  }
  return [1, 1];    // 默认不合并
};
```

## 实现步骤

### 步骤 1：创建合并计算函数

```typescript
// 可在工具文件中定义，如 src/utils/merge-utils.ts
/**
 * 计算行合并数
 * @param record 当前行数据
 * @param currentIndex 当前行索引
 * @param data 数据源
 * @param mergeFields 需要合并的字段数组
 * @returns 合并行数
 */
export function calculateRowSpan(
  record: any,
  currentIndex: number,
  data: any[],
  mergeFields: string[]
): number {
  if (currentIndex === 0) {
    // 第一行，向后查找相同值的行数
    let rowSpan = 1;
    const currentValue = getMergeKey(record, mergeFields);

    for (let i = currentIndex + 1; i < data.length; i++) {
      const nextValue = getMergeKey(data[i], mergeFields);
      if (currentValue === nextValue) {
        rowSpan++;
      } else {
        break;
      }
    }
    return rowSpan;
  }

  // 检查是否与上一行相同
  const prevValue = getMergeKey(data[currentIndex - 1], mergeFields);
  const currentValue = getMergeKey(record, mergeFields);

  if (prevValue === currentValue) {
    return 0;  // 已被合并，不显示
  }

  // 是新的合并组，重新计算
  let rowSpan = 1;
  for (let i = currentIndex + 1; i < data.length; i++) {
    const nextValue = getMergeKey(data[i], mergeFields);
    if (currentValue === nextValue) {
      rowSpan++;
    } else {
      break;
    }
  }
  return rowSpan;
}

/**
 * 获取合并键值
 */
function getMergeKey(record: any, fields: string[]): string {
  return fields.map(field => record[field]).join('|');
}
```

### 步骤 2：在列定义中使用

```typescript
// src/views/core/exchangepay/bigpay/YourModule/tableDefine.tsx
import { calculateRowSpan } from '@/utils/merge-utils';

export const basicColumns: BasicColumn[] = [
  {
    title: '业务日期',
    dataIndex: 'busiDate',
    width: 120,
    align: 'left',
    customRender: ({ text, record, index }) => {
      const rowSpan = calculateRowSpan(record, index, tableData.value, ['busiDate']);

      if (rowSpan > 0) {
        return {
          children: text,
          attrs: { rowSpan, colSpan: 1 },
        };
      }
      return {
        children: text,
        attrs: { rowSpan: 0, colSpan: 1 },
      };
    },
  },
  {
    title: '系统编号',
    dataIndex: 'sysNo',
    width: 150,
    customRender: ({ text, record, index }) => {
      // 可以对不同列使用不同的合并逻辑
      const rowSpan = calculateRowSpan(record, index, tableData.value, ['busiDate', 'sysNo']);

      if (rowSpan > 0) {
        return {
          children: text,
          attrs: { rowSpan, colSpan: 1 },
        };
      }
      return {
        children: text,
        attrs: { rowSpan: 0, colSpan: 1 },
      };
    },
  },
  {
    title: '金额',
    dataIndex: 'amount',
    width: 150,
    align: 'right',
    // 这列不合并，直接显示
    customRender: ({ text }) => {
      return formatMoney(text);
    },
  },
];
```

### 步骤 3：在组件中使用

```vue
<!-- src/views/core/exchangepay/bigpay/YourModule/index.vue -->
<template>
  <div>
    <BasicTable
      @register="registerTable"
      :columns="basicColumns"
      :dataSource="tableData"
      :rowKey="'id'"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { BasicTable, useTable } from '/@/components/Table';
import { basicColumns } from './tableDefine';

export default defineComponent({
  name: 'YourModule',
  components: { BasicTable },
  setup() {
    const tableData = ref([]);

    const [registerTable] = useTable({
      // 表格配置
      showIndexColumn: false,
      bordered: true,
      // ... 其他配置
    });

    // 加载数据
    const loadData = async () => {
      // 从API获取数据
      const result = await yourApiService.query();
      tableData.value = result;
    };

    return {
      registerTable,
      basicColumns,
      tableData,
      loadData,
    };
  },
});
</script>
```

## 复杂合并场景示例

### 场景 1：多级表头合并

```typescript
export const advancedColumns: BasicColumn[] = [
  {
    title: '基本信息',
    children: [
      {
        title: '日期',
        dataIndex: 'date',
        customRender: ({ text, record, index }) => {
          const rowSpan = calculateRowSpan(record, index, tableData.value, ['date']);
          return rowSpan > 0
            ? { children: text, attrs: { rowSpan, colSpan: 1 } }
            : { children: text, attrs: { rowSpan: 0, colSpan: 1 } };
        },
      },
      {
        title: '编号',
        dataIndex: 'code',
      },
    ],
  },
  {
    title: '金额信息',
    children: [
      { title: '借记', dataIndex: 'debit' },
      { title: '贷记', dataIndex: 'credit' },
    ],
  },
];
```

### 场景 2：条件合并（特定行合并）

```typescript
{
  title: '状态',
  dataIndex: 'status',
  customRender: ({ text, record, index }) => {
    // 只对"成功"状态的行进行合并
    if (text === 'SUCCESS') {
      const rowSpan = calculateRowSpanByCondition(
        record,
        index,
        tableData.value,
        (item) => item.status === 'SUCCESS'
      );
      if (rowSpan > 0) {
        return {
          children: text,
          attrs: { rowSpan, colSpan: 1, style: { background: '#f6ffed' } },
        };
      }
      return { children: text, attrs: { rowSpan: 0, colSpan: 1 } };
    }
    return text; // 不合并
  },
}
```

### 场景 3：列合并（横向合并）

```typescript
{
  title: '备注',
  dataIndex: 'remark',
  customRender: ({ text, record, index }) => {
    // 根据条件合并列
    if (record.needMerge) {
      return {
        children: text,
        attrs: { rowSpan: 1, colSpan: 2 }, // 合并2列
      };
    }
    return text;
  },
},
{
  title: '详情',
  dataIndex: 'detail',
  customRender: ({ text, record, index }) => {
    if (record.needMerge) {
      return {
        children: '',
        attrs: { rowSpan: 1, colSpan: 0 }, // 被合并，不显示
      };
    }
    return text;
  },
}
```

## 注意事项

### 1. 数据排序
**重要**：合并前必须确保数据按合并字段排序，否则合并逻辑会出错。

```typescript
// 在获取数据后先排序
const processData = (data: any[]) => {
  return data.sort((a, b) => {
    if (a.busiDate === b.busiDate) {
      return a.sysNo.localeCompare(b.sysNo);
    }
    return a.busiDate.localeCompare(b.busiDate);
  });
};
```

### 2. 性能考虑
- 大数据量时，合并计算可能影响性能
- 建议在后端返回数据时直接计算好合并信息
- 或使用虚拟滚动减少渲染量

### 3. 分页问题
表格合并与分页存在冲突，建议：
- 合并场景下禁用分页或使用大数据分页
- 或在每页内独立计算合并

### 4. 导出问题
导出Excel时需要单独处理合并逻辑：
```typescript
// 导出时的合并计算
const exportWithMerge = () => {
  const ws = XLSX.utils.json_to_sheet(data);
  // 使用 XLSX 的 merge_cells 功能
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }, // A1:A3 合并
  ];
};
```

## 调试技巧

### 1. 查看合并效果
```typescript
// 在 customRender 中添加调试信息
customRender: ({ text, record, index }) => {
  const rowSpan = calculateRowSpan(record, index, tableData.value, ['busiDate']);
  console.log(`行 ${index}: rowSpan=${rowSpan}`, record);
  // ...
}
```

### 2. 验证数据
```typescript
// 验证数据是否已排序
const checkDataOrder = (data: any[], fields: string[]) => {
  for (let i = 1; i < data.length; i++) {
    const prev = fields.map(f => data[i-1][f]).join('|');
    const curr = fields.map(f => data[i][f]).join('|');
    if (prev > curr) {
      console.warn('数据未排序，合并可能出错', { prev, curr, index: i });
    }
  }
};
```

## 完整示例

### 示例：日终轧差记账表格合并

```typescript
// src/views/core/exchangepay/dayendnetting/Bookkeeping/tableDefine.tsx
import { BasicColumn } from '/@/components/Table';
import { calculateRowSpan } from '@/utils/merge-utils';

export const getBookkeepingColumns = (tableData: Ref<any[]>): BasicColumn[] => {
  return [
    {
      title: '对账日期',
      dataIndex: 'chckDate',
      width: 120,
      align: 'center',
      customRender: ({ text, record, index }) => {
        const rowSpan = calculateRowSpan(
          record,
          index,
          tableData.value,
          ['chckDate', 'sysNo']
        );

        return rowSpan > 0
          ? {
              children: text,
              attrs: {
                rowSpan,
                colSpan: 1,
                style: { background: '#fafafa', fontWeight: 'bold' }
              }
            }
          : { children: text, attrs: { rowSpan: 0, colSpan: 1 } };
      },
    },
    {
      title: '系统编号',
      dataIndex: 'sysNo',
      width: 150,
      customRender: ({ text, record, index }) => {
        const rowSpan = calculateRowSpan(
          record,
          index,
          tableData.value,
          ['chckDate', 'sysNo']
        );

        return rowSpan > 0
          ? { children: text, attrs: { rowSpan, colSpan: 1 } }
          : { children: text, attrs: { rowSpan: 0, colSpan: 1 } };
      },
    },
    {
      title: '借记金额',
      dataIndex: 'debitAmount',
      width: 150,
      align: 'right',
      customRender: ({ text }) => {
        return formatMoney(text);
      },
    },
    {
      title: '贷记金额',
      dataIndex: 'creditAmount',
      width: 150,
      align: 'right',
      customRender: ({ text }) => {
        return formatMoney(text);
      },
    },
    {
      title: '轧差金额',
      dataIndex: 'netAmount',
      width: 150,
      align: 'right',
      customRender: ({ text }) => {
        return formatMoney(text);
      },
    },
  ];
};
```

## 总结

### 推荐实现方式
1. **优先使用 `customRender`**：灵活性高，可同时控制内容和样式
2. **创建通用合并函数**：提高代码复用性
3. **注意数据排序**：确保合并逻辑正确
4. **考虑性能**：大数据量时优化实现

### 关键文件
- 工具函数：`src/utils/merge-utils.ts`
- 列定义：`src/views/**/tableDefine.tsx`
- 表格组件：`src/components/Table/src/BasicTable.vue`

### 参考链接
- [Ant Design Vue Table 官方文档](https://2x.antdv.com/components/table-cn/#components-table-demo-colspan-rowspan)
- [Ant Design Vue 2.2.8 API](https://2x.antdv.com/components/table-cn/#API)

---

**文档版本**: v1.0
**最后更新**: 2026-01-12
**适用项目**: CBPS2G-UI (Vue 3 + Ant Design Vue 2.2.8)