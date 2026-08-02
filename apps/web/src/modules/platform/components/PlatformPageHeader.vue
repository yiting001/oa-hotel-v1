<script setup lang="ts">
defineProps<{
  eyebrow: string;
  title: string;
  description: string;
}>();
</script>

<template>
  <header class="platform-page-header">
    <div class="platform-page-header__copy">
      <span>{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </div>
    <div class="platform-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
