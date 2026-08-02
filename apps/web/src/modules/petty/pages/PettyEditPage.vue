<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PettyForm from '../components/PettyForm.vue';

const route = useRoute();
const documentId = computed(() => String(route.params.id));
</script>

<template>
  <PettyForm :document-id="documentId" mode="edit" />
</template>
