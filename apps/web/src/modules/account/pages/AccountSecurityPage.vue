<script setup lang="ts">
import { Check, Key, Lock } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { useSessionStore } from '../../../shared/session';
import { newPasswordError, passwordConfirmationError } from '../password-change';

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
}

const router = useRouter();
const session = useSessionStore();
const formRef = ref<FormInstance>();
const form = reactive<PasswordChangeForm>({
  currentPassword: '',
  newPassword: '',
  confirmation: '',
});

const rules: FormRules<PasswordChangeForm> = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [{ validator: validateNewPassword, trigger: ['blur', 'change'] }],
  confirmation: [{ validator: validateConfirmation, trigger: ['blur', 'change'] }],
};

function validateNewPassword(
  _rule: unknown,
  value: unknown,
  callback: (error?: string | Error) => void,
): void {
  const message = newPasswordError(form.currentPassword, String(value ?? ''));
  callback(message ? new Error(message) : undefined);
}

function validateConfirmation(
  _rule: unknown,
  value: unknown,
  callback: (error?: string | Error) => void,
): void {
  const message = passwordConfirmationError(form.newPassword, String(value ?? ''));
  callback(message ? new Error(message) : undefined);
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  try {
    await session.changePassword(form.currentPassword, form.newPassword);
    formRef.value?.resetFields();
    ElMessage.success('密码已更新');
    await router.replace({ name: 'personal-workbench' });
  } catch (cause) {
    ElMessage.error(cause instanceof Error ? cause.message : '密码修改失败');
  }
}
</script>

<template>
  <main class="account-security-page">
    <AppPageHeader eyebrow="个人设置" title="账号安全" />

    <el-alert
      v-if="session.user?.passwordChangeRequired"
      class="account-security-alert"
      :closable="false"
      show-icon
      title="当前使用初始密码，修改后方可进入系统"
      type="warning"
    />

    <section class="account-security-panel" aria-labelledby="password-form-title">
      <header class="account-security-panel__header">
        <span class="account-security-panel__icon"
          ><el-icon><Key /></el-icon
        ></span>
        <div>
          <h2 id="password-form-title">登录密码</h2>
          <p>{{ session.user?.displayName }} · {{ session.user?.departmentName }}</p>
        </div>
      </header>

      <el-form
        ref="formRef"
        class="account-security-form"
        label-position="top"
        :model="form"
        :rules="rules"
        @submit.prevent="submit"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="form.currentPassword"
            autocomplete="current-password"
            :prefix-icon="Lock"
            show-password
            type="password"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="form.newPassword"
            autocomplete="new-password"
            :prefix-icon="Key"
            show-password
            type="password"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmation">
          <el-input
            v-model="form.confirmation"
            autocomplete="new-password"
            :prefix-icon="Key"
            show-password
            type="password"
          />
        </el-form-item>
        <div class="account-security-form__actions">
          <el-button
            :icon="Check"
            :loading="session.changingPassword"
            native-type="submit"
            type="primary"
          >
            保存新密码
          </el-button>
        </div>
      </el-form>
    </section>
  </main>
</template>

<style scoped>
.account-security-page { display: flex; flex-direction: column; gap: 24px; }
.account-security-panel { width: min(100%, 640px); padding: 24px; background: var(--color-surface); border-radius: var(--radius-lg); }
.account-security-panel__header { display: flex; align-items: center; gap: 12px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--color-border); }
.account-security-panel__icon {
  display: inline-flex;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  color: var(--color-text);
  background: var(--color-canvas);
  border-radius: var(--radius-md);
  font-size: 19px;
}
.account-security-panel__header h2 { margin: 0; font-size: 18px; font-weight: 600; }
.account-security-panel__header p { margin: 4px 0 0; color: var(--color-text-tertiary); font-size: 13px; }
.account-security-form { max-width: none; }
.account-security-form__actions { display: flex; justify-content: flex-end; }
</style>
