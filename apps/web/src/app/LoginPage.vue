<script setup lang="ts">
import { Lock, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, reactive, type CSSProperties } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { destinationAfterLogin } from '../modules/account/account-security.policy';
import { appConfig, brandAssets, companyMark } from '../shared/app-config';
import { loadRememberedLogin, saveRememberedLogin } from '../shared/remember-login';
import { useSessionStore } from '../shared/session';
import { useLayoutMode } from '../ui/useLayoutMode';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const remembered = loadRememberedLogin();
const { isCompact } = useLayoutMode();
const form = reactive({
  username: remembered.username,
  password: '',
  remember: remembered.remember,
});
const backgroundStyle = {
  '--login-photo': `url("${brandAssets.loginBackground}")`,
} as CSSProperties;
const capabilities = ['流程审批与待办', '单据制表与归档', '门户资讯与工作台'];
const heading = computed(() => (isCompact ? '登录' : '统一办公入口'));

async function submit(): Promise<void> {
  try {
    await session.signIn(form.username.trim(), form.password);
    saveRememberedLogin(form.remember, form.username.trim());
    const redirect = destinationAfterLogin(
      session.user?.passwordChangeRequired === true,
      route.query.redirect,
    );
    await router.replace(redirect);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '登录失败');
  }
}
</script>

<template>
  <main class="login" :data-compact="isCompact" :style="backgroundStyle">
    <section class="login__panel" aria-labelledby="login-title">
      <header class="login__brand">
        <span class="login__mark" aria-hidden="true">{{ companyMark }}</span>
        <span class="login__brand-copy">
          <strong>{{ appConfig.companyName }} OA</strong>
          <small>{{ appConfig.productName }}</small>
        </span>
      </header>

      <div class="login__intro">
        <h1 id="login-title">{{ heading }}</h1>
        <p v-if="!isCompact">流程审批、单据制表、公司门户与 A4 打印归档集中在一处，按角色与数据范围展示。</p>
        <ul v-if="!isCompact" class="login__list">
          <li v-for="item in capabilities" :key="item">{{ item }}</li>
        </ul>
      </div>

      <el-form label-position="top" :model="form" @submit.prevent="submit">
        <el-form-item label="账号" required>
          <el-input v-model="form.username" autocomplete="username" :prefix-icon="User" aria-label="账号" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input
            v-model="form.password"
            autocomplete="current-password"
            :prefix-icon="Lock"
            aria-label="密码"
            show-password
            type="password"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.remember">记住登录</el-checkbox>
        </el-form-item>
        <el-button class="login__submit" :loading="session.loading" native-type="submit" size="large" type="primary">登录</el-button>
      </el-form>

      <p class="login__foot">{{ appConfig.companyName }} · {{ appConfig.productName }}</p>
    </section>

    <aside class="login__visual" aria-hidden="true" />
  </main>
</template>

<style scoped>
.login {
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(0, 480px) minmax(0, 1fr);
  background: var(--color-canvas);
}
.login__panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 56px 48px 40px;
  border-right: 1px solid var(--color-border);
}
.login__brand { display: flex; align-items: center; gap: 12px; }
.login__mark {
  display: inline-grid;
  width: 40px;
  height: 40px;
  place-items: center;
  color: var(--color-on-dark);
  background: var(--color-primary);
  border-radius: 50%;
  font-size: 18px;
  font-weight: 600;
}
.login__brand-copy { display: flex; min-width: 0; flex-direction: column; }
.login__brand-copy strong { font-size: 16px; font-weight: 600; }
.login__brand-copy small { color: var(--color-text-tertiary); font-size: 12px; }
.login__intro h1 { margin: 0; font-size: 32px; font-weight: 600; line-height: 1.25; }
.login__intro p { margin: 12px 0 0; color: var(--color-text-tertiary); font-size: 14px; line-height: 1.6; }
.login__list { display: grid; gap: 6px; margin: 20px 0 0; padding: 0; color: var(--color-text-secondary); font-size: 14px; list-style: none; }
.login__list li::before { content: '·'; margin-right: 8px; color: var(--color-text-quaternary); }
.login__submit { width: 100%; }
.login__foot { margin: auto 0 0; color: var(--color-text-quaternary); font-size: 12px; }
.login__visual {
  position: relative;
  background-image: var(--login-photo);
  background-position: center;
  background-size: cover;
}
.login__visual::after { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.2)); content: ''; }

.login[data-compact='true'] { grid-template-columns: minmax(0, 1fr); }
.login[data-compact='true'] .login__panel { gap: 24px; padding: 32px 20px 28px; border-right: 0; }
.login[data-compact='true'] .login__visual { display: none; }
.login[data-compact='true'] .login__intro h1 { font-size: 24px; }
</style>
