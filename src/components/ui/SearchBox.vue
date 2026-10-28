<script setup lang="ts">
const model = defineModel<string>({ default: '' })
defineProps<{ placeholder?: string }>()
</script>
<template><label class="search"><i class="fa-solid fa-magnifying-glass" /><input v-model="model" class="input" type="search" :placeholder="placeholder ?? 'Buscar…'" /></label></template>
<style scoped>.search { position: relative; display: block; min-width: 200px; } .search i { position: absolute; left: 0.7rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none; } .search .input { padding-left: 2rem; }</style>
