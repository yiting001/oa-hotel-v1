<script setup lang="ts">
import { View } from '@element-plus/icons-vue';
import type { DocumentStatus, WorkbenchItem } from '@oa/contracts';
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import StatusTag from '../../../shared/components/StatusTag.vue';
import { documentTypeMeta } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import { documentStatusLabels } from '../domain/workbench';

const props = withDefaults(defineProps<{ documents: WorkbenchItem[]; loading?: boolean }>(), {
  loading: false,
});
const emit = defineEmits<{ open: [document: WorkbenchItem] }>();

const baseColumns: DataColumn[] = [
  { key: 'documentTitle', label: '单据', minWidth: 260 },
  { key: 'documentType', label: '类型', minWidth: 150 },
  { key: 'documentStatus', label: '状态', width: 120 },
  { key: 'departmentName', label: '申请部门', minWidth: 140 },
  { key: 'revision', label: '修订', width: 90 },
  { key: 'updatedAt', label: '更新时间', minWidth: 170 },
  { key: 'actions', label: '操作', width: 108 },
];

function typeLabel(document: WorkbenchItem): string {
  return documentTypeMeta[document.documentType].label;
}

function statusLabel(document: WorkbenchItem): string {
  return documentStatusLabels[document.documentStatus as DocumentStatus];
}

function collaborationLabel(document: WorkbenchItem): string {
  if (document.box === 'FOLLOWING' && document.followedAt) {
    return `关注于 ${formatDateTime(document.followedAt)}`;
  }
  if (document.box === 'COPIED') return `抄送人：${document.copySenderName ?? '-'}`;
  return '';
}

/** 关注/抄送工作箱才展示协作信息列，列定义与两种呈现共用 */
function columns(): DataColumn[] {
  const box = props.documents[0]?.box;
  if (box !== 'FOLLOWING' && box !== 'COPIED') return baseColumns;
  return [
    ...baseColumns.slice(0, 3),
    { key: 'collaboration', label: '协作信息', minWidth: 170 },
    ...baseColumns.slice(3),
  ];
}
</script>

<template>
  <UiDataList
    :columns="columns()"
    :loading="loading"
    :rows="documents"
    empty-text="暂无单据"
    test-id="workbench-document-list"
    @row-click="emit('open', $event)"
  >
    <template #cell-documentTitle="{ row }">
      <button class="workbench-link" type="button" @click.stop="emit('open', row)">
        {{ row.documentTitle }}
      </button>
    </template>
    <template #cell-documentType="{ row }">{{ typeLabel(row) }}</template>
    <template #cell-documentStatus="{ row }"><StatusTag :status="row.documentStatus" /></template>
    <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
    <template #cell-collaboration="{ row }">
      <span>{{ collaborationLabel(row) }}</span>
      <el-tag v-if="row.box === 'COPIED'" :type="row.copyReadAt ? 'info' : 'danger'" size="small">
        {{ row.copyReadAt ? '已读' : '未读' }}
      </el-tag>
    </template>
    <template #mobile-title="{ row }">
      <button class="workbench-link" type="button" @click.stop="emit('open', row)">
        {{ row.documentTitle }}
      </button>
    </template>
    <template #mobile-summary="{ row }">
      <dl class="ui-record__facts">
        <div><dt>类型</dt><dd>{{ typeLabel(row) }}</dd></div>
        <div><dt>状态</dt><dd>{{ statusLabel(row) }}</dd></div>
        <div><dt>申请部门</dt><dd>{{ row.departmentName }}</dd></div>
        <div><dt>更新时间</dt><dd>{{ formatDateTime(row.updatedAt) }}</dd></div>
        <div v-if="collaborationLabel(row)"><dt>协作信息</dt><dd>{{ collaborationLabel(row) }}</dd></div>
      </dl>
    </template>
    <template #actions="{ row }">
      <el-button :icon="View" link @click.stop="emit('open', row)">查看</el-button>
    </template>
  </UiDataList>
</template>

<style scoped>
.workbench-link {
  max-width: 100%;
  padding: 0;
  color: var(--color-text);
  background: none;
  border: 0;
  font: inherit;
  font-weight: 600;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.workbench-link:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
