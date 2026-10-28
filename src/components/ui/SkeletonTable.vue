<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue'
defineProps<{ rows?: number; cols?: number }>()
</script>
<template>
  <div class="table-wrap sk-table" aria-busy="true" aria-label="Cargando">
    <div class="sk-row head"><SkeletonBlock v-for="c in cols ?? 5" :key="c" height="0.8rem" /></div>
    <div v-for="r in rows ?? 6" :key="r" class="sk-row"><SkeletonBlock v-for="c in cols ?? 5" :key="c" height="1rem" :width="`${60 + ((r * c * 7) % 40)}%`" /></div>
  </div>
</template>
<style scoped>.sk-table { padding: 0.5rem 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; } .sk-row { display: flex; gap: 1rem; align-items: center; } .sk-row > * { flex: 1; } .head { opacity: 0.6; }</style>
