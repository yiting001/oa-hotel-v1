<script setup lang="ts">
import { useRoute } from 'vue-router';
import MaterialLossForm from '../components/MaterialLossForm.vue';

const route = useRoute();
</script>

<template>
  <MaterialLossForm mode="edit" :document-id="String(route.params.id)" />
</template>
