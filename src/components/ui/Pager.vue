<script setup lang="ts">
defineProps<{ page: number; pages: number; total: number }>()
const emit = defineEmits<{ change: [page: number] }>()
</script>
<template>
  <div v-if="pages > 1" class="pager"><span class="muted small">{{ total }} registros</span><div class="row"><button class="btn sm" :disabled="page <= 1" @click="emit('change', page - 1)"><i class="fa-solid fa-chevron-left" /></button><span class="small">{{ page }} / {{ pages }}</span><button class="btn sm" :disabled="page >= pages" @click="emit('change', page + 1)"><i class="fa-solid fa-chevron-right" /></button></div></div>
</template>
<style scoped>.pager { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.25rem; }</style>
