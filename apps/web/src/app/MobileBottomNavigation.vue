<script setup lang="ts">
import { MoreFilled } from '@element-plus/icons-vue';
import type { NavigationItem } from './navigation';

const props = defineProps<{
  activePath: string;
  items: NavigationItem[];
}>();

const emit = defineEmits<{
  more: [];
  navigate: [path: string];
}>();

function isActive(path: string): boolean {
  return props.activePath === path;
}
</script>

<template>
  <nav class="mobile-bottom-navigation" aria-label="手机端主导航">
    <button
      v-for="item in items"
      :key="item.id"
      :class="{ 'is-active': isActive(item.path) }"
      type="button"
      @click="emit('navigate', item.path)"
    >
      <el-icon><component :is="item.icon" /></el-icon>
      <span>{{ item.label }}</span>
    </button>
    <button
      :class="{ 'is-active': !items.some((item) => isActive(item.path)) }"
      type="button"
      @click="emit('more')"
    >
      <el-icon><MoreFilled /></el-icon>
      <span>更多</span>
    </button>
  </nav>
</template>
