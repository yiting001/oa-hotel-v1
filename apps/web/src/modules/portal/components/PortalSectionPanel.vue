<script setup lang="ts">
import {
  ArrowRight,
  Bell,
  Document,
  Memo,
  Notebook,
  OfficeBuilding,
  Calendar,
} from '@element-plus/icons-vue';
import type { PortalContentCategory, PortalContentSummary, PortalSection } from '@oa/contracts';
import { computed, type Component } from 'vue';
import { brandAssets } from '../../../shared/app-config';
import { formatDate } from '../../../shared/format';
import { portalCategoryLabels } from '../domain/portal';

const props = defineProps<{ section: PortalSection }>();
const emit = defineEmits<{
  open: [content: PortalContentSummary];
  more: [section: PortalSection];
}>();

const category = computed(() => props.section.key);
const featured = computed(() =>
  category.value === 'COMPANY_NEWS' ? (props.section.items[0] ?? null) : null,
);
const listItems = computed(() =>
  featured.value ? props.section.items.slice(1) : props.section.items,
);

const icons: Record<PortalContentCategory, Component> = {
  COMPANY_NEWS: OfficeBuilding,
  NOTICE: Bell,
  MEETING_MINUTES: Notebook,
  MEMO: Memo,
  POLICY: Document,
  PARTY_WORK: OfficeBuilding,
  EVENT: Calendar,
};
</script>

<template>
  <section
    class="portal-section-panel"
    :class="{ 'portal-section-panel--featured': category === 'COMPANY_NEWS' }"
  >
    <header class="portal-section-heading">
      <div>
        <el-icon v-if="category"><component :is="icons[category]" /></el-icon>
        <strong>{{
          section.title || (category ? portalCategoryLabels[category] : '信息栏目')
        }}</strong>
        <el-badge v-if="section.unreadCount" :value="section.unreadCount" />
      </div>
      <div>
        <span>{{ section.total }} 条</span>
        <el-button
          v-if="section.total > section.items.length"
          link
          size="small"
          type="primary"
          @click="emit('more', section)"
          >更多<el-icon><ArrowRight /></el-icon
        ></el-button>
      </div>
    </header>

    <button
      v-if="featured"
      class="portal-featured-news"
      type="button"
      @click="emit('open', featured)"
    >
      <img :alt="featured.title" :src="featured.coverImageUrl || brandAssets.portalNewsFallback" />
      <span>
        <small>{{ formatDate(featured.publishedAt) }}</small>
        <strong>{{ featured.title }}</strong>
        <p>{{ featured.summary }}</p>
      </span>
    </button>

    <div class="portal-content-list">
      <button v-for="item in listItems" :key="item.id" type="button" @click="emit('open', item)">
        <span class="portal-content-list__status" :class="{ 'is-read': item.read }" />
        <span class="portal-content-list__copy">
          <strong>{{ item.title }}</strong>
          <small>{{ item.publisherDepartmentName }} · {{ formatDate(item.publishedAt) }}</small>
        </span>
        <el-icon><ArrowRight /></el-icon>
      </button>
      <el-empty v-if="section.items.length === 0" description="暂无内容" :image-size="52" />
    </div>
  </section>
</template>
