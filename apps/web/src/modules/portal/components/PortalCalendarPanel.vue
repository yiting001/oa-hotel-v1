<script setup lang="ts">
import { ArrowLeft, ArrowRight, Location } from '@element-plus/icons-vue';
import type { PortalCalendarEvent } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import {
  businessCalendarDays,
  businessDateKey,
  businessDateRangeKeys,
  businessMonthLabel,
  businessMonthStart,
  shiftBusinessMonth,
} from '../../../shared/business-time';
import { formatDateTime } from '../../../shared/format';
import { loadPortalCalendar } from '../api/portal-api';

const props = defineProps<{ events: PortalCalendarEvent[] }>();
const cursor = ref(businessMonthStart());
const today = businessDateKey();
const selectedDate = ref(today);
const calendarEvents = ref<PortalCalendarEvent[]>([...props.events]);
const loading = ref(false);
let requestSequence = 0;

const monthLabel = computed(() => businessMonthLabel(cursor.value));
const days = computed(() => businessCalendarDays(cursor.value));
const eventsByDate = computed(() => {
  const map = new Map<string, PortalCalendarEvent[]>();
  for (const event of calendarEvents.value) {
    for (const key of businessDateRangeKeys(event.startAt, event.endAt)) {
      map.set(key, [...(map.get(key) ?? []), event]);
    }
  }
  return map;
});
const selectedEvents = computed(() => eventsByDate.value.get(selectedDate.value) ?? []);

watch(
  () => props.events,
  (events) => {
    if (requestSequence === 0) calendarEvents.value = [...events];
  },
  { immediate: true },
);
watch(
  () => cursor.value,
  () => void refreshCalendar(),
  { immediate: true },
);

async function refreshCalendar(): Promise<void> {
  const visibleDays = days.value;
  const from = visibleDays[0]?.key;
  const to = visibleDays.at(-1)?.key;
  if (!from || !to) return;
  const sequence = ++requestSequence;
  loading.value = true;
  try {
    const result = await loadPortalCalendar(from, to);
    if (sequence === requestSequence) calendarEvents.value = result.events;
  } catch (error) {
    if (sequence === requestSequence) {
      ElMessage.warning(error instanceof Error ? error.message : '日历加载失败');
    }
  } finally {
    if (sequence === requestSequence) loading.value = false;
  }
}

function changeMonth(offset: number): void {
  cursor.value = shiftBusinessMonth(cursor.value, offset);
  selectedDate.value = cursor.value;
}

function dayAriaLabel(dayKey: string): string {
  const count = eventsByDate.value.get(dayKey)?.length ?? 0;
  return `${dayKey}，${count ? `${count} 项日程` : '无日程'}`;
}
</script>

<template>
  <section class="portal-calendar-panel" :aria-busy="loading">
    <header class="portal-section-heading">
      <strong>日历</strong>
      <div class="portal-calendar-panel__controls">
        <el-button circle text title="上个月" @click="changeMonth(-1)"
          ><el-icon><ArrowLeft /></el-icon
        ></el-button>
        <span>{{ monthLabel }}</span>
        <el-button circle text title="下个月" @click="changeMonth(1)"
          ><el-icon><ArrowRight /></el-icon
        ></el-button>
      </div>
    </header>
    <div class="portal-calendar-weekdays" aria-hidden="true">
      <span v-for="day in '日一二三四五六'" :key="day">{{ day }}</span>
    </div>
    <div class="portal-calendar-grid">
      <button
        v-for="day in days"
        :key="day.key"
        :aria-current="day.key === today ? 'date' : undefined"
        :aria-label="dayAriaLabel(day.key)"
        :aria-pressed="selectedDate === day.key"
        :class="{ 'is-current': day.current, 'is-selected': selectedDate === day.key }"
        type="button"
        @click="selectedDate = day.key"
      >
        <span>{{ day.label }}</span
        ><i v-if="eventsByDate.has(day.key)" aria-hidden="true" />
      </button>
    </div>
    <div class="portal-calendar-agenda">
      <article v-for="event in selectedEvents" :key="event.id">
        <strong>{{ event.title }}</strong>
        <span>{{ event.allDay ? '全天' : formatDateTime(event.startAt) }}</span>
        <small v-if="event.location"
          ><el-icon><Location /></el-icon>{{ event.location }}</small
        >
      </article>
      <el-empty v-if="selectedEvents.length === 0" description="当日无安排" :image-size="32" />
    </div>
  </section>
</template>

<style scoped>
.portal-calendar-panel { padding: 16px; background: var(--color-surface); border-radius: var(--radius-lg); }
.portal-section-heading { display: flex; min-height: 28px; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.portal-section-heading strong { font-size: 18px; font-weight: 600; }
.portal-calendar-panel__controls { display: flex; align-items: center; gap: 4px; }
.portal-calendar-panel__controls span { min-width: 84px; text-align: center; font-size: 13px; color: var(--color-text-tertiary); }
.portal-calendar-weekdays, .portal-calendar-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
.portal-calendar-weekdays { margin-bottom: 4px; }
.portal-calendar-weekdays span { padding: 4px 0; color: var(--color-text-tertiary); font-size: 12px; text-align: center; }
.portal-calendar-grid button {
  position: relative;
  display: grid;
  min-height: 34px;
  place-items: center;
  padding: 0;
  color: var(--color-text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.portal-calendar-grid button:hover { background: var(--color-canvas); color: var(--color-text); }
.portal-calendar-grid button.is-current { color: var(--color-text-quaternary); }
.portal-calendar-grid button.is-selected { color: #fff; background: var(--color-primary); font-weight: 600; }
.portal-calendar-grid button i { position: absolute; bottom: 4px; width: 4px; height: 4px; background: var(--color-brand-coral); border-radius: 50%; }
.portal-calendar-grid button.is-selected i { background: #fff; }
.portal-calendar-agenda { display: grid; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--color-border); }
.portal-calendar-agenda article { display: grid; gap: 2px; }
.portal-calendar-agenda strong { font-size: 14px; font-weight: 500; }
.portal-calendar-agenda span, .portal-calendar-agenda small { color: var(--color-text-tertiary); font-size: 12px; }
.portal-calendar-agenda small { display: flex; align-items: center; gap: 4px; }
</style>
