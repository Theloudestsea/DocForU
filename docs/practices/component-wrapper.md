# 组件二次封装思路

## 概述

组件二次封装是在现有组件基础上，根据业务需求进行定制和扩展。

## 封装原则

### 1. 保持原有功能
封装后的组件应保留原组件的所有功能。

### 2. 扩展新功能
在原有基础上添加业务所需的功能。

### 3. 简化使用
提供更简洁的API，隐藏复杂实现。

## 封装方案

### 1. 属性透传
```vue
<template>
  <el-button v-bind="$attrs" :type="type" :size="size">
    <slot></slot>
  </el-button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'large' | 'default' | 'small';
}>();

const type = computed(() => props.type || 'primary');
const size = computed(() => props.size || 'default');
</script>
```

### 2. 事件封装
```vue
<template>
  <el-input
    v-model="modelValue"
    v-bind="$attrs"
    @input="handleInput"
    @change="handleChange"
    @clear="handleClear"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </el-input>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue?: string;
  trim?: boolean;
  debounce?: number;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', value: string): void;
  (e: 'clear'): void;
}>();

let debounceTimer: number | null = null;

const handleInput = (value: string) => {
  const newValue = props.trim ? value.trim() : value;
  
  if (props.debounce) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      emit('update:modelValue', newValue);
      emit('change', newValue);
    }, props.debounce);
  } else {
    emit('update:modelValue', newValue);
    emit('change', newValue);
  }
};

const handleChange = (value: string) => {
  emit('change', value);
};

const handleClear = () => {
  emit('update:modelValue', '');
  emit('clear');
};
</script>
```

### 3. 插槽封装
```vue
<template>
  <el-dialog v-bind="$attrs" :visible="visible" @close="handleClose">
    <template #header>
      <slot name="header">
        <span class="dialog-title">{{ title }}</span>
      </slot>
    </template>
    
    <slot></slot>
    
    <template #footer>
      <slot name="footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确定</el-button>
      </slot>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
}>();

const handleClose = () => {
  emit('update:visible', false);
};

const handleConfirm = () => {
  emit('confirm');
};

const handleCancel = () => {
  emit('cancel');
  emit('update:visible', false);
};
</script>
```

## 高级封装

### 1. 表单组件封装
```vue
<template>
  <el-form ref="formRef" :model="formData" :rules="rules" v-bind="$attrs">
    <el-form-item
      v-for="item in formItems"
      :key="item.prop"
      :label="item.label"
      :prop="item.prop"
    >
      <component
        :is="getComponent(item.type)"
        v-model="formData[item.prop]"
        v-bind="item.props || {}"
        v-on="item.events || {}"
      />
    </el-form-item>
    
    <slot name="extra"></slot>
    
    <el-form-item>
      <slot name="actions">
        <el-button type="primary" @click="handleSubmit">提交</el-button>
        <el-button @click="handleReset">重置</el-button>
      </slot>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';

interface FormItem {
  label: string;
  prop: string;
  type: 'input' | 'select' | 'datepicker' | 'switch';
  props?: Record<string, any>;
  events?: Record<string, Function>;
}

const props = defineProps<{
  formItems: FormItem[];
  initialValues?: Record<string, any>;
  rules?: FormRules;
}>();

const emit = defineEmits<{
  (e: 'submit', values: Record<string, any>): void;
}>();

const formRef = ref<FormInstance>();
const formData = reactive<Record<string, any>>(
  props.initialValues || {}
);

const getComponent = (type: string) => {
  const componentMap: Record<string, string> = {
    input: 'el-input',
    select: 'el-select',
    datepicker: 'el-date-picker',
    switch: 'el-switch'
  };
  return componentMap[type] || 'el-input';
};

const handleSubmit = async () => {
  if (!formRef.value) return;
  
  try {
    await formRef.value.validate();
    emit('submit', { ...formData });
  } catch (error) {
    console.error('表单验证失败:', error);
  }
};

const handleReset = () => {
  formRef.value?.resetFields();
};
</script>
```

### 2. 表格组件封装
```vue
<template>
  <div class="table-wrapper">
    <div class="table-header" v-if="$slots.header">
      <slot name="header"></slot>
    </div>
    
    <el-table v-bind="$attrs" :data="data" v-loading="loading">
      <el-table-column
        v-for="column in columns"
        :key="column.prop"
        v-bind="column"
      >
        <template #default="scope" v-if="column.slot">
          <slot :name="column.slot" v-bind="scope"></slot>
        </template>
      </el-table-column>
      
      <slot></slot>
    </el-table>
    
    <div class="table-footer" v-if="pagination">
      <el-pagination
        v-bind="pagination"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Column {
  prop: string;
  label: string;
  width?: string | number;
  slot?: string;
  [key: string]: any;
}

interface Pagination {
  currentPage: number;
  pageSize: number;
  total: number;
  pageSizes?: number[];
  layout?: string;
}

defineProps<{
  data: any[];
  columns: Column[];
  loading?: boolean;
  pagination?: Pagination;
}>();

const emit = defineEmits<{
  (e: 'page-change', page: number): void;
  (e: 'size-change', size: number): void;
}>();

const handlePageChange = (page: number) => {
  emit('page-change', page);
};

const handleSizeChange = (size: number) => {
  emit('size-change', size);
};
</script>
```

## 最佳实践

1. **类型安全**：使用TypeScript定义Props类型
2. **属性透传**：使用`v-bind="$attrs"`透传未声明的属性
3. **插槽支持**：保留原组件的插槽功能
4. **事件处理**：合理封装事件，提供更好的API
5. **样式覆盖**：使用深度选择器覆盖原组件样式
6. **文档完善**：为封装组件提供使用文档

## 常见问题

1. **属性冲突**：封装组件的属性与原组件冲突
2. **事件重复**：事件触发多次或遗漏
3. **样式污染**：封装组件的样式影响原组件
4. **类型丢失**：封装后丢失原组件的类型定义