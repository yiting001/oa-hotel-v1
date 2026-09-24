<script setup lang="ts">
import FormSection from '../../shared/components/FormSection.vue';
import KeyValueSummary from '../../shared/components/KeyValueSummary.vue';
import { formatDate } from '../../shared/format';

defineProps<{ applicantName: string; departmentName: string; applicationDate: string }>();
</script>

<template>
  <FormSection title="申请信息">
    <KeyValueSummary :items="[{ label: '申请人', value: applicantName }, { label: '部门', value: departmentName }, { label: '填单日期', value: formatDate(applicationDate) }]" :columns="3" />
  </FormSection>
</template>
