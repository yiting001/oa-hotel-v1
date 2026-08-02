<script setup lang="ts">
import { Monitor, Setting, Suitcase, TrendCharts } from '@element-plus/icons-vue';
import { computed, type Component } from 'vue';
import type { NavigationGroup } from './navigation';

const props = defineProps<{
  activePath: string;
  collapsed?: boolean;
  groups: NavigationGroup[];
}>();

const emit = defineEmits<{ navigate: [path: string] }>();

const openedGroups = computed(() =>
  props.groups
    .filter((group) => group.items.some((item) => item.path === props.activePath))
    .map((group) => group.id),
);

const groupIcons: Record<string, Component> = {
  office: Monitor,
  business: Suitcase,
  insight: TrendCharts,
  platform: Setting,
};
</script>

<template>
  <nav class="app-navigation-menu" aria-label="系统主导航">
    <el-menu
      :collapse="collapsed"
      :collapse-transition="false"
      :default-active="activePath"
      :default-openeds="openedGroups"
      @select="emit('navigate', String($event))"
    >
      <el-sub-menu
        v-for="group in groups"
        :key="group.id"
        :index="group.id"
        popper-class="app-navigation-popup"
      >
        <template #title>
          <el-icon><component :is="groupIcons[group.id] ?? Monitor" /></el-icon>
          <span class="app-navigation-menu__group-title">{{ group.label }}</span>
        </template>
        <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-sub-menu>
    </el-menu>
  </nav>
</template>
