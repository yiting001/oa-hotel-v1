<script setup lang="ts">
import ErrorPage from './ErrorPage.vue';
</script>

<template>
  <ErrorPage
    code="403"
    description="当前账号没有访问此功能所需的权限。如需开通，请联系系统管理员调整角色授权。"
    title="无权访问"
  />
</template>
