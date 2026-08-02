<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import ContractApprovalForm from '../components/ContractApprovalForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <ContractApprovalForm :document-id="documentId" mode="edit" />
</template>
