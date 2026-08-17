<script setup lang="ts">
import { EyeOutlined } from '@ant-design/icons-vue';
import type { DocumentSummary, DocumentType } from '@oa/contracts';
import { documentTypeMeta } from '../document';
import { formatDateTime } from '../format';
import StatusTag from './StatusTag.vue';

defineProps<{
  documents: DocumentSummary[];
  loading?: boolean;
}>();

const emit = defineEmits<{ open: [document: DocumentSummary] }>();

function documentTypeLabel(documentType: DocumentType): string {
  return documentTypeMeta[documentType].label;
}

const columns = [
  { title: '单据', dataIndex: 'title', key: 'title' },
  { title: '类型', dataIndex: 'documentType', key: 'documentType', width: 160 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
  { title: '修订', dataIndex: 'revision', key: 'revision', width: 80 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 180 },
  { title: '操作', key: 'actions', width: 88 },
];
</script>

<template>
  <div class="document-table document-table--desktop">
    <a-table
      :columns="columns"
      :data-source="documents"
      :loading="loading"
      :locale="{ emptyText: '暂无符合条件的单据' }"
      :pagination="{ pageSize: 10, showTotal: (total: number) => `共 ${total} 条` }"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'title'">
          <button class="table-link" type="button" @click="emit('open', record)">
            {{ record.title }}
          </button>
        </template>
        <template v-else-if="column.key === 'documentType'">
          {{ documentTypeLabel(record.documentType) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <StatusTag :status="record.status" />
        </template>
        <template v-else-if="column.key === 'updatedAt'">
          {{ formatDateTime(record.updatedAt) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-tooltip title="查看单据">
            <a-button
              :aria-label="`查看${record.title}`"
              shape="circle"
              type="text"
              @click="emit('open', record)"
            >
              <template #icon><EyeOutlined /></template>
            </a-button>
          </a-tooltip>
        </template>
      </template>
    </a-table>
  </div>

  <div class="document-cards document-table--mobile">
    <a-empty v-if="!loading && documents.length === 0" description="暂无符合条件的单据" />
    <article
      v-for="document in documents"
      :key="document.id"
      class="document-card"
      role="button"
      tabindex="0"
      @click="emit('open', document)"
      @keydown.enter="emit('open', document)"
    >
      <div class="document-card__header">
        <strong>{{ document.title }}</strong>
        <StatusTag :status="document.status" />
      </div>
      <span>{{ documentTypeLabel(document.documentType) }}</span>
      <small>更新于 {{ formatDateTime(document.updatedAt) }} · 修订 {{ document.revision }}</small>
    </article>
  </div>
</template>
