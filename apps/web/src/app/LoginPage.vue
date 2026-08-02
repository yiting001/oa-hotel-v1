<script setup lang="ts">
import { LockOutlined, UserOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { reactive, type CSSProperties } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { destinationAfterLogin } from '../modules/account/account-security.policy';
import { useSessionStore } from '../shared/session';
import { appConfig, brandAssets, companyMark } from '../shared/app-config';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const form = reactive({ username: '', password: '' });
const loginBackgroundStyle = {
  '--login-background-image': `url("${brandAssets.loginBackground}")`,
} as CSSProperties;

async function submit(): Promise<void> {
  try {
    await session.signIn(form.username.trim(), form.password);
    const redirect = destinationAfterLogin(
      session.user?.passwordChangeRequired === true,
      route.query.redirect,
    );
    await router.replace(redirect);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '登录失败');
  }
}
</script>

<template>
  <main class="login-page" :style="loginBackgroundStyle">
    <div class="login-page__backdrop" />
    <div class="login-brand">
      <span class="login-brand__mark">{{ companyMark }}</span>
      <div>
        <h1>{{ appConfig.companyName }} OA</h1>
        <p>{{ appConfig.productName }}</p>
      </div>
    </div>

    <section class="login-panel" aria-labelledby="login-title">
      <div class="login-panel__heading">
        <span>欢迎登录</span>
        <h2 id="login-title">统一办公入口</h2>
      </div>
      <a-form :model="form" layout="vertical" @finish="submit">
        <a-form-item
          label="账号"
          name="username"
          :rules="[{ required: true, message: '请输入账号' }]"
        >
          <a-input v-model:value="form.username" autocomplete="username" size="large">
            <template #prefix><UserOutlined /></template>
          </a-input>
        </a-form-item>
        <a-form-item
          label="密码"
          name="password"
          :rules="[{ required: true, message: '请输入密码' }]"
        >
          <a-input-password
            v-model:value="form.password"
            autocomplete="current-password"
            size="large"
          >
            <template #prefix><LockOutlined /></template>
          </a-input-password>
        </a-form-item>
        <a-button :loading="session.loading" block html-type="submit" size="large" type="primary">
          登录
        </a-button>
      </a-form>
    </section>
  </main>
</template>
