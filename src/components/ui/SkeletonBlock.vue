<script setup lang="ts">
defineProps<{ height?: string; width?: string; radius?: string }>()
</script>
<template><span class="sk" :style="{ height: height ?? '1rem', width: width ?? '100%', borderRadius: radius ?? '6px' }" aria-hidden="true" /></template>
<style scoped>
.sk { display: block; background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%); background-size: 200% 100%; animation: sk 1.2s ease-in-out infinite; }
@keyframes sk { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
