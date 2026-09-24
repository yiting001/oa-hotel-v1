<script setup lang="ts">
import { Download, User } from '@element-plus/icons-vue';
import type { PortalContentDetail } from '@oa/contracts';
import DOMPurify from 'dompurify';
import { computed } from 'vue';
import { formatDateTime } from '../../../shared/format';
import { portalCategoryLabels } from '../domain/portal';

const props = defineProps<{
  open: boolean;
  loading: boolean;
  content: PortalContentDetail | null;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();
const safeBody = computed(() => DOMPurify.sanitize(props.content?.body ?? ''));
</script>

<template>
  <el-drawer
    :model-value="open"
    size="min(760px, 100%)"
    title="门户内容"
    @update:model-value="emit('update:open', $event)"
  >
    <el-skeleton v-if="loading" :rows="12" animated />
    <article v-else-if="content" class="portal-content-detail">
      <div class="portal-content-detail__meta">
        <el-tag effect="plain">{{ portalCategoryLabels[content.category] }}</el-tag>
        <span>{{ formatDateTime(content.publishedAt) }}</span>
        <span
          ><el-icon><User /></el-icon>{{ content.publisherName }} ·
          {{ content.publisherDepartmentName }}</span
        >
      </div>
      <h1>{{ content.title }}</h1>
      <p class="portal-content-detail__summary">{{ content.summary }}</p>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="portal-content-detail__body" v-html="safeBody" />
      <section v-if="content.attachments.length" class="portal-content-detail__attachments">
        <strong>附件</strong>
        <div v-for="attachment in content.attachments" :key="attachment">
          <el-icon><Download /></el-icon><span>{{ attachment }}</span>
        </div>
      </section>
    </article>
  </el-drawer>
</template>

<style scoped>
.portal-content-detail { display: grid; gap: 16px; }
.portal-content-detail__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; color: var(--color-text-tertiary); font-size: 13px; }
.portal-content-detail h1 { margin: 0; font-size: 24px; font-weight: 600; }
.portal-content-detail__summary { margin: 0; color: var(--color-text-secondary); line-height: 1.7; }
.portal-content-detail__body { color: var(--color-text-secondary); font-size: 14px; line-height: 1.75; overflow-wrap: anywhere; }
.portal-content-detail__body :deep(img) { max-width: 100%; height: auto; border-radius: var(--radius-md); }
.portal-content-detail__attachments { display: grid; gap: 8px; padding-top: 16px; border-top: 1px solid var(--color-border); }
.portal-content-detail__attachments h2 { margin: 0; font-size: 16px; font-weight: 600; }
.portal-content-detail__attachments ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.portal-content-detail__attachments li { display: flex; align-items: center; gap: 8px; color: var(--color-text-secondary); font-size: 13px; overflow-wrap: anywhere; }
</style>
