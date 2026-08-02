<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="not-found-page">
    <a-result status="403" title="无权访问" sub-title="当前账号没有访问此功能所需的权限">
      <template #extra>
        <a-button type="primary" @click="router.replace('/')">返回工作台</a-button>
      </template>
    </a-result>
  </div>
</template>
