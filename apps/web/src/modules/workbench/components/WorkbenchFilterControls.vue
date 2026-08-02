<script setup lang="ts">
import type { DirectoryUser } from '@oa/contracts';
import { computed } from 'vue';
import type { DepartmentOption } from '../../../shared/directory';
import { documentTypeMeta } from '../../../shared/document';
import type { WorkbenchFilters } from '../domain/workbench';

const props = withDefaults(
  defineProps<{
    users: DirectoryUser[];
    departments: DepartmentOption[];
    modelValue: WorkbenchFilters;
    showApplicant?: boolean;
    showStatus?: boolean;
    stacked?: boolean;
  }>(),
  { showApplicant: false, showStatus: false, stacked: false },
);
const emit = defineEmits<{ 'update:modelValue': [value: WorkbenchFilters] }>();

const keyword = fieldModel('keyword');
const documentType = fieldModel('documentType');
const applicantId = fieldModel('applicantId');
const departmentId = fieldModel('departmentId');
const status = fieldModel('status');
const dateRange = fieldModel('dateRange');

function fieldModel<Key extends keyof WorkbenchFilters>(key: Key) {
  return computed({
    get: () => props.modelValue[key],
    set: (value: WorkbenchFilters[Key]) =>
      emit('update:modelValue', {
        ...props.modelValue,
        [key]: Array.isArray(value) ? [...value] : value,
      }),
  });
}
</script>

<template>
  <div class="workbench-filter-controls" :class="{ 'is-stacked': stacked }">
    <el-input v-model="keyword" clearable placeholder="搜索标题、发起人或部门" />
    <el-select v-model="documentType" aria-label="流程类型">
      <el-option label="全部流程" value="ALL" />
      <el-option
        v-for="(meta, key) in documentTypeMeta"
        :key="key"
        :label="meta.label"
        :value="key"
      />
    </el-select>
    <el-select
      v-if="showApplicant"
      v-model="applicantId"
      clearable
      filterable
      placeholder="全部发起人"
    >
      <el-option
        v-for="user in users"
        :key="user.id"
        :label="`${user.displayName} · ${user.departmentName}`"
        :value="user.id"
      />
    </el-select>
    <el-select v-model="departmentId" clearable filterable placeholder="全部部门">
      <el-option
        v-for="department in departments"
        :key="department.id"
        :label="department.name"
        :value="department.id"
      />
    </el-select>
    <el-select v-if="showStatus" v-model="status" aria-label="单据状态">
      <el-option label="全部状态" value="ALL" />
      <el-option label="草稿" value="DRAFT" />
      <el-option label="审批中" value="IN_REVIEW" />
      <el-option label="已退回" value="RETURNED" />
      <el-option label="已通过" value="APPROVED" />
      <el-option label="已取消" value="CANCELLED" />
    </el-select>
    <el-date-picker
      v-model="dateRange"
      end-placeholder="结束日期"
      range-separator="至"
      start-placeholder="开始日期"
      type="daterange"
      value-format="YYYY-MM-DD"
    />
  </div>
</template>
