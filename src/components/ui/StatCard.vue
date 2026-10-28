<script setup lang="ts">
defineProps<{ label: string; value: string | number; sub?: string; tone?: 'good' | 'bad' | 'warn' | ''; icon?: string }>()
</script>
<template>
  <div class="stat" :class="tone"><span class="stat-label"><i v-if="icon" class="fa-solid" :class="icon" /> {{ label }}</span><span class="stat-value">{{ value }}</span><span v-if="sub" class="stat-sub">{{ sub }}</span></div>
</template>
