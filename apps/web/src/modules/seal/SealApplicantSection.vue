<script setup lang="ts">
import FormSection from '../../shared/components/FormSection.vue';
import { formatDate } from '../../shared/format';

defineProps<{
  applicantName: string;
  departmentName: string;
  applicationDate: string;
}>();
</script>

<template>
  <FormSection title="申请信息">
    <a-descriptions :column="{ xs: 1, sm: 3 }" bordered size="small">
      <a-descriptions-item label="申请人">{{ applicantName }}</a-descriptions-item>
      <a-descriptions-item label="部门">{{ departmentName }}</a-descriptions-item>
      <a-descriptions-item label="填单日期">{{ formatDate(applicationDate) }}</a-descriptions-item>
    </a-descriptions>
  </FormSection>
</template>
