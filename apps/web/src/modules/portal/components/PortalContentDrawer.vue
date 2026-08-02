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
