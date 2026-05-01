# Table表格二次封装

## 概述

对Element Plus的Table组件进行二次封装，提供更易用的API和业务功能。

## 封装实现

### 1. 基础表格组件
```vue
<template>
  <div class="table-wrapper">
    <!-- 表格工具栏 -->
    <div class="table-toolbar" v-if="$slots.toolbar">
      <slot name="toolbar"></slot>
    </div>
    
    <!-- 表格主体 -->
    <el-table
      ref="tableRef"
      v-bind="$attrs"
      :data="data"
      :loading="loading"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
    >
      <!-- 选择列 -->
      <el-table-column
        v-if="selection"
        type="selection"
        width="55"
        align="center"
      />
      
      <!-- 序号列 -->
      <el-table-column
        v-if="showIndex"
        type="index"
        label="序号"
        width="70"
        align="center"
      />
      
      <!-- 数据列 -->
      <el-table-column
        v-for="column in columns"
        :key="column.prop"
        :prop="column.prop"
        :label="column.label"
        :width="column.width"
        :min-width="column.minWidth"
        :sortable="column.sortable"
        :fixed="column.fixed"
        :align="column.align || 'center'"
        show-overflow-tooltip
      >
        <template #default="scope" v-if="column.slot">
          <slot :name="column.slot" v-bind="scope"></slot>
        </template>
        
        <template #header="scope" v-if="column.headerSlot">
          <slot :name="column.headerSlot" v-bind="scope"></slot>
        </template>
      </el-table-column>
      
      <!-- 操作列 -->
      <el-table-column
        v-if="$slots.action"
        label="操作"
        :width="actionWidth"
        :fixed="actionFixed"
        align="center"
      >
        <template #default="scope">
          <slot name="action" v-bind="scope"></slot>
        </template>
      </el-table-column>
      
      <!-- 空数据插槽 -->
      <template #empty>
        <slot name="empty">
          <el-empty description="暂无数据" />
        </slot>
      </template>
    </el-table>
    
    <!-- 分页 -->
    <div class="table-pagination" v-if="pagination">
      <el-pagination
        v-bind="paginationProps"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { TableInstance } from 'element-plus';

interface Column {
  prop: string;
  label: string;
  width?: string | number;
  minWidth?: string | number;
  sortable?: boolean | 'custom';
  fixed?: boolean | 'left' | 'right';
  align?: 'left' | 'center' | 'right';
  slot?: string;
  headerSlot?: string;
  [key: string]: any;
}

interface Pagination {
  currentPage: number;
  pageSize: number;
  total: number;
  pageSizes?: number[];
  layout?: string;
  background?: boolean;
}

const props = withDefaults(defineProps<{
  data: any[];
  columns: Column[];
  loading?: boolean;
  selection?: boolean;
  showIndex?: boolean;
  pagination?: Pagination;
  actionWidth?: string | number;
  actionFixed?: boolean | 'left' | 'right';
}>(), {
  loading: false,
  selection: false,
  showIndex: false,
  actionWidth: '200',
  actionFixed: 'right'
});

const emit = defineEmits<{
  (e: 'selection-change', selection: any[]): void;
  (e: 'sort-change', sort: { prop: string; order: string }): void;
  (e: 'page-change', page: number): void;
  (e: 'size-change', size: number): void;
  (e: 'refresh'): void;
}>();

const tableRef = ref<TableInstance>();

const paginationProps = computed(() => {
  if (!props.pagination) return {};
  
  return {
    currentPage: props.pagination.currentPage,
    pageSize: props.pagination.pageSize,
    total: props.pagination.total,
    pageSizes: props.pagination.pageSizes || [10, 20, 50, 100],
    layout: props.pagination.layout || 'total, sizes, prev, pager, next, jumper',
    background: props.pagination.background !== false
  };
});

const handleSelectionChange = (selection: any[]) => {
  emit('selection-change', selection);
};

const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  emit('sort-change', { prop, order });
};

const handlePageChange = (page: number) => {
  emit('page-change', page);
};

const handleSizeChange = (size: number) => {
  emit('size-change', size);
};

// 暴露方法
const clearSelection = () => {
  tableRef.value?.clearSelection();
};

const toggleRowSelection = (row: any, selected?: boolean) => {
  tableRef.value?.toggleRowSelection(row, selected);
};

defineExpose({
  clearSelection,
  toggleRowSelection,
  tableRef
});
</script>

<style scoped>
.table-wrapper {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
}

.table-toolbar {
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
```

### 2. 使用示例
```vue
<template>
  <TableWrapper
    :data="tableData"
    :columns="columns"
    :loading="loading"
    :pagination="pagination"
    selection
    show-index
    @page-change="handlePageChange"
    @size-change="handleSizeChange"
    @selection-change="handleSelectionChange"
  >
    <template #toolbar>
      <el-button type="primary" @click="handleAdd">新增</el-button>
      <el-button @click="handleExport">导出</el-button>
    </template>
    
    <template #status="{ row }">
      <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
        {{ row.status === 'active' ? '启用' : '禁用' }}
      </el-tag>
    </template>
    
    <template #action="{ row }">
      <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
      <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
    </template>
  </TableWrapper>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import TableWrapper from '@/components/TableWrapper.vue';

const loading = ref(false);
const tableData = ref([
  { id: 1, name: '张三', age: 25, status: 'active' },
  { id: 2, name: '李四', age: 30, status: 'inactive' }
]);

const columns = [
  { prop: 'name', label: '姓名', width: '120' },
  { prop: 'age', label: '年龄', width: '100', sortable: true },
  { prop: 'status', label: '状态', slot: 'status' }
];

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 100
});

const handlePageChange = (page: number) => {
  pagination.currentPage = page;
  fetchData();
};

const handleSizeChange = (size: number) => {
  pagination.pageSize = size;
  pagination.currentPage = 1;
  fetchData();
};

const handleSelectionChange = (selection: any[]) => {
  console.log('选中的行:', selection);
};

const fetchData = async () => {
  loading.value = true;
  // 请求数据...
  loading.value = false;
};
</script>
```

## 高级功能

### 1. 列配置化
```typescript
// 列配置
const columns = [
  {
    prop: 'name',
    label: '姓名',
    width: 120,
    fixed: 'left',
    searchable: true,
    editable: true
  },
  {
    prop: 'email',
    label: '邮箱',
    minWidth: 200,
    ellipsis: true
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    type: 'tag',
    options: [
      { label: '启用', value: 'active', type: 'success' },
      { label: '禁用', value: 'inactive', type: 'danger' }
    ]
  }
];
```

### 2. 行编辑功能
```vue
<template>
  <el-table :data="data">
    <el-table-column
      v-for="column in columns"
      :key="column.prop"
      :prop="column.prop"
      :label="column.label"
    >
      <template #default="{ row, $index }">
        <template v-if="row._editing && column.editable">
          <el-input
            v-model="row[column.prop]"
            size="small"
          />
        </template>
        <template v-else>
          {{ row[column.prop] }}
        </template>
      </template>
    </el-table-column>
    
    <el-table-column label="操作" width="200">
      <template #default="{ row, $index }">
        <template v-if="row._editing">
          <el-button type="primary" link @click="handleSave(row, $index)">
            保存
          </el-button>
          <el-button link @click="handleCancel(row, $index)">
            取消
          </el-button>
        </template>
        <template v-else>
          <el-button type="primary" link @click="handleEdit(row)">
            编辑
          </el-button>
        </template>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
const handleEdit = (row: any) => {
  row._editing = true;
  row._originalData = { ...row };
};

const handleSave = async (row: any, index: number) => {
  // 保存逻辑
  row._editing = false;
  delete row._originalData;
};

const handleCancel = (row: any, index: number) => {
  Object.assign(row, row._originalData);
  row._editing = false;
  delete row._originalData;
};
</script>
```

## 最佳实践

1. **配置化**：通过配置生成表格，减少重复代码
2. **插槽支持**：保留灵活的插槽能力
3. **类型安全**：使用TypeScript定义类型
4. **性能优化**：大数据量使用虚拟滚动
5. **响应式**：适配不同屏幕尺寸
6. **可访问性**：支持键盘操作和屏幕阅读器

## 常见问题

1. **性能问题**：大数据量导致渲染卡顿
2. **样式覆盖**：自定义样式与默认样式冲突
3. **事件冲突**：封装事件与原生事件冲突
4. **内存泄漏**：未正确清理事件监听器