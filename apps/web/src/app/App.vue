<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useSessionStore } from '../shared/session';

const session = useSessionStore();

onMounted(() => {
  void session.ensureSession();
});
</script>

<template>
  <a-layout class="shell">
    <a-layout-header class="header">
      <div class="brand">东方饭店 OA</div>
      <nav>
        <RouterLink to="/">工作台</RouterLink>
        <RouterLink to="/contract">合同支出</RouterLink>
        <RouterLink to="/seal">行政印章</RouterLink>
        <RouterLink to="/supply">物资申购领用</RouterLink>
      </nav>
      <a-space v-if="session.user">
        <span>{{ session.user.displayName }}</span>
        <a-select
          :value="session.user.username"
          size="small"
          style="width: 130px"
          @change="(value: string) => session.switchUser(value)"
        >
          <a-select-option value="applicant">申请人</a-select-option>
          <a-select-option value="manager">部门总监</a-select-option>
          <a-select-option value="finance">财务审核</a-select-option>
          <a-select-option value="office">办公室/印章</a-select-option>
          <a-select-option value="procurement">采购</a-select-option>
          <a-select-option value="warehouse">仓库</a-select-option>
        </a-select>
      </a-space>
    </a-layout-header>
    <a-layout-content class="content">
      <RouterView />
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  background: #f5f7fb;
}

.header {
  display: flex;
  align-items: center;
  gap: 24px;
  background: #0b1f44;
  color: #fff;
  padding: 0 24px;
}

.brand {
  font-weight: 700;
  white-space: nowrap;
}

nav {
  display: flex;
  flex: 1;
  gap: 16px;
  overflow-x: auto;
}

nav a {
  color: rgba(255, 255, 255, 0.82);
  text-decoration: none;
  white-space: nowrap;
}

nav a.router-link-active {
  color: #fff;
  font-weight: 700;
}

.content {
  padding: 24px;
}

@media (max-width: 767px) {
  .header {
    height: auto;
    flex-wrap: wrap;
    padding: 12px;
    line-height: 1.6;
  }

  .content {
    padding: 0;
  }
}
</style>
