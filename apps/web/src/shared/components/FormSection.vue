<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <section class="form-section">
    <div class="form-section__heading">
      <h2>{{ title }}</h2>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="form-section__body">
      <slot />
    </div>
  </section>
</template>
