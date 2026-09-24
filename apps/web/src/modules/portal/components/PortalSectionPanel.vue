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
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { portalCategoryLabels } from '../domain/portal';

const props = defineProps<{ section: PortalSection }>();
const { isCompact } = useLayoutMode();
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
    :data-compact="isCompact"
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

<style scoped>
.portal-section-panel { padding: 16px; background: var(--color-surface); border-radius: var(--radius-lg); }
.portal-section-panel--featured { grid-column: 1 / -1; }
.portal-section-heading { display: flex; min-height: 28px; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.portal-section-heading > div { display: flex; align-items: center; gap: 8px; }
.portal-section-heading strong { font-size: 18px; font-weight: 600; }
.portal-section-heading span { color: var(--color-text-tertiary); font-size: 13px; }
.portal-featured-news {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(180px, 34%) minmax(0, 1fr);
  gap: 16px;
  margin-bottom: 8px;
  padding: 0;
  overflow: hidden;
  color: inherit;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
}
.portal-featured-news img { width: 100%; height: 148px; object-fit: cover; }
.portal-featured-news > span { display: flex; min-width: 0; flex-direction: column; justify-content: center; gap: 6px; padding: 12px 16px 12px 0; }
.portal-featured-news strong { font-size: 16px; font-weight: 600; line-height: 1.4; }
.portal-featured-news p { display: -webkit-box; margin: 0; overflow: hidden; color: var(--color-text-tertiary); font-size: 13px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.portal-featured-news small { color: var(--color-text-tertiary); font-size: 12px; }
.portal-content-list { display: grid; }
.portal-content-list button { display: flex; width: 100%; min-height: 44px; align-items: center; gap: 10px; padding: 8px 2px; color: inherit; background: transparent; border: 0; border-bottom: 1px solid var(--color-border); cursor: pointer; text-align: left; }
.portal-content-list button:last-child { border-bottom: 0; }
.portal-content-list button:hover strong { color: var(--color-brand-blue); }
.portal-content-list__status { width: 7px; height: 7px; flex: 0 0 7px; background: var(--color-brand-coral); border-radius: 50%; }
.portal-content-list__status.is-read { background: var(--color-border-strong); }
.portal-content-list__copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 2px; }
.portal-content-list__copy strong { overflow: hidden; font-size: 14px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.portal-content-list__copy small { color: var(--color-text-tertiary); font-size: 12px; }
.portal-section-panel[data-compact='true'] { padding: 12px; }
.portal-section-panel[data-compact='true'] .portal-featured-news { grid-template-columns: minmax(0, 1fr); }
.portal-section-panel[data-compact='true'] .portal-featured-news img { height: 156px; }
.portal-section-panel[data-compact='true'] .portal-featured-news > span { padding: 0 12px 12px; }
</style>
