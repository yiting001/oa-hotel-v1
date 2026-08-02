<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="not-found-page">
    <a-result status="404" title="页面不存在" sub-title="访问地址无效或页面已调整">
      <template #extra>
        <a-button type="primary" @click="router.replace('/')">返回工作台</a-button>
      </template>
    </a-result>
  </div>
</template>
