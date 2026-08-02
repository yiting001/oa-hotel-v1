<script setup lang="ts">
import type { NavigationGroup } from './navigation';

defineProps<{
  activePath: string;
  collapsed?: boolean;
  groups: NavigationGroup[];
}>();

const emit = defineEmits<{ navigate: [path: string] }>();
</script>

<template>
  <nav class="app-navigation-menu" aria-label="系统主导航">
    <section v-for="group in groups" :key="group.id" class="app-navigation-menu__group">
      <div v-if="!collapsed" class="app-navigation-menu__label">{{ group.label }}</div>
      <el-menu
        :collapse="collapsed"
        :collapse-transition="false"
        :default-active="activePath"
        @select="emit('navigate', String($event))"
      >
        <el-menu-item v-for="item in group.items" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>
    </section>
  </nav>
</template>
