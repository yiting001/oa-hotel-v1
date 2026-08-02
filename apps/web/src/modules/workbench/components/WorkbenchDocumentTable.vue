<script setup lang="ts">
import { View } from '@element-plus/icons-vue';
import type { DocumentStatus, WorkbenchItem } from '@oa/contracts';
import { documentTypeMeta } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import { documentStatusLabels } from '../domain/workbench';

withDefaults(defineProps<{ documents: WorkbenchItem[]; loading?: boolean }>(), {
  loading: false,
});
const emit = defineEmits<{ open: [document: WorkbenchItem] }>();

const statusTypes: Record<DocumentStatus, 'info' | 'primary' | 'warning' | 'success'> = {
  DRAFT: 'info',
  IN_REVIEW: 'primary',
  RETURNED: 'warning',
  APPROVED: 'success',
  CANCELLED: 'info',
};

function statusType(status: DocumentStatus): 'info' | 'primary' | 'warning' | 'success' {
  return statusTypes[status];
}

function typeLabel(document: WorkbenchItem): string {
  return documentTypeMeta[document.documentType].label;
}

function statusLabel(document: WorkbenchItem): string {
  return documentStatusLabels[document.documentStatus];
}

function collaborationLabel(document: WorkbenchItem): string {
  if (document.box === 'FOLLOWING' && document.followedAt) {
    return `关注于 ${formatDateTime(document.followedAt)}`;
  }
  if (document.box === 'COPIED') return `抄送人：${document.copySenderName ?? '-'}`;
  return '';
}
</script>

<template>
  <div class="portal-table portal-table--desktop">
    <el-table v-loading="loading" :data="documents" row-key="id">
      <el-table-column label="单据" min-width="270">
        <template #default="{ row }">
          <button class="portal-table-link" type="button" @click="emit('open', row)">
            {{ row.documentTitle }}
          </button>
        </template>
      </el-table-column>
      <el-table-column label="类型" min-width="160">
        <template #default="{ row }">{{ typeLabel(row) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }"
          ><el-tag :type="statusType(row.documentStatus)">{{ statusLabel(row) }}</el-tag></template
        >
      </el-table-column>
      <el-table-column label="申请部门" min-width="150">
        <template #default="{ row }">{{ row.departmentName }}</template>
      </el-table-column>
      <el-table-column
        v-if="documents[0]?.box === 'FOLLOWING' || documents[0]?.box === 'COPIED'"
        label="协作信息"
        min-width="190"
      >
        <template #default="{ row }">
          <span>{{ collaborationLabel(row) }}</span>
          <el-tag
            v-if="row.box === 'COPIED'"
            class="workbench-copy-state"
            :type="row.copyReadAt ? 'info' : 'danger'"
            size="small"
          >
            {{ row.copyReadAt ? '已读' : '未读' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="修订" width="90"
        ><template #default="{ row }">V{{ row.revision }}</template></el-table-column
      >
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column align="right" label="操作" width="100">
        <template #default="{ row }"
          ><el-button :icon="View" link type="primary" @click="emit('open', row)"
            >查看</el-button
          ></template
        >
      </el-table-column>
      <template #empty><el-empty description="暂无单据" :image-size="64" /></template>
    </el-table>
  </div>
  <div class="portal-card-list portal-table--mobile">
    <el-skeleton v-if="loading" :rows="6" animated />
    <button
      v-for="document in documents"
      v-else
      :key="document.id"
      type="button"
      @click="emit('open', document)"
    >
      <span
        ><strong>{{ document.documentTitle }}</strong
        ><el-tag :type="statusType(document.documentStatus)" size="small">{{
          documentStatusLabels[document.documentStatus]
        }}</el-tag></span
      >
      <small
        >{{ documentTypeMeta[document.documentType].label }} · {{ document.departmentName }} ·
        {{ formatDateTime(document.updatedAt) }}</small
      >
      <small v-if="document.box === 'FOLLOWING' || document.box === 'COPIED'">
        {{ collaborationLabel(document) }}
        <el-tag
          v-if="document.box === 'COPIED'"
          :type="document.copyReadAt ? 'info' : 'danger'"
          size="small"
        >
          {{ document.copyReadAt ? '已读' : '未读' }}
        </el-tag>
      </small>
    </button>
    <el-empty v-if="!loading && documents.length === 0" description="暂无单据" :image-size="64" />
  </div>
</template>
