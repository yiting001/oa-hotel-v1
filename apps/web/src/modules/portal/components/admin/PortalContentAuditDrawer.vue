<script setup lang="ts">
import type { PortalContentAuditEvent, PortalContentAuditTrail } from '@oa/contracts';
import { formatDateTime } from '../../../../shared/format';

defineProps<{
  open: boolean;
  title: string;
  trail: PortalContentAuditTrail | null;
  loading: boolean;
}>();
const emit = defineEmits<{ close: [] }>();

const actionLabels: Record<PortalContentAuditEvent['action'], string> = {
  CREATED: '创建草稿',
  UPDATED: '保存修订',
  SCHEDULED: '设置定时发布',
  PUBLISHED: '发布内容',
  WITHDRAWN: '撤回内容',
};
</script>

<template>
  <el-drawer
    :model-value="open"
    data-testid="portal-content-audit-drawer"
    size="min(560px, 100%)"
    title="内容审计"
    @close="emit('close')"
  >
    <header class="portal-audit-heading">
      <strong>{{ title }}</strong>
      <span>{{ trail?.events.length ?? 0 }} 条事件</span>
    </header>
    <el-skeleton v-if="loading" :rows="8" animated />
    <el-timeline v-else class="portal-audit-timeline">
      <el-timeline-item
        v-for="event in trail?.events ?? []"
        :key="event.id"
        :timestamp="formatDateTime(event.occurredAt)"
        placement="top"
      >
        <article>
          <div>
            <strong>{{ actionLabels[event.action] }}</strong>
            <el-tag effect="plain" size="small">修订 {{ event.revision }}</el-tag>
          </div>
          <p>{{ event.actorName }} · {{ event.actorDepartmentName || '系统' }}</p>
          <small v-if="typeof event.details.publishAt === 'string'">
            计划时间：{{ formatDateTime(event.details.publishAt) }}
          </small>
          <small v-if="typeof event.details.scheduledAt === 'string'">
            计划时间：{{ formatDateTime(event.details.scheduledAt) }}
          </small>
        </article>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-if="!loading && (trail?.events.length ?? 0) === 0" description="暂无审计记录" />
  </el-drawer>
</template>
