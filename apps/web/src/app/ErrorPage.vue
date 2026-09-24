<script setup lang="ts">
import { useRouter } from 'vue-router';

defineProps<{
  code: string;
  title: string;
  description: string;
}>();

const router = useRouter();
</script>

<template>
  <section class="error-page" aria-labelledby="error-page-title">
    <span class="error-page__code" aria-hidden="true">{{ code }}</span>
    <div class="error-page__copy">
      <h1 id="error-page-title">{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="error-page__actions">
      <el-button @click="router.back()">返回上一页</el-button>
      <el-button type="primary" @click="router.replace('/')">返回工作台</el-button>
    </div>
  </section>
</template>

<style scoped>
.error-page {
  display: grid;
  min-height: min(60vh, 460px);
  align-content: center;
  justify-items: start;
  gap: 16px;
  padding: 48px 0;
}
.error-page__code {
  color: var(--color-text-quaternary);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.error-page__copy h1 { margin: 0; font-size: 32px; font-weight: 600; }
.error-page__copy p { margin: 8px 0 0; max-width: 60ch; color: var(--color-text-tertiary); font-size: 14px; line-height: 1.6; }
.error-page__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
</style>
