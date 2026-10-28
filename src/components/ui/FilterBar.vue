<script setup lang="ts">
/** Barra de filtros amigable: búsqueda + chips rápidos + extras (fechas, selects) + contador y botón limpiar. */
defineProps<{ total?: number | null; hasFilters?: boolean }>()
const emit = defineEmits<{ clear: [] }>()
</script>
<template>
  <div class="filterbar no-print">
    <div class="filterbar-main"><slot /></div>
    <div v-if="$slots.chips" class="filterbar-chips"><slot name="chips" /></div>
    <div class="filterbar-foot"><span v-if="total !== null && total !== undefined" class="hint"><i class="fa-solid fa-list" /> {{ total }} resultado{{ total === 1 ? '' : 's' }}</span><span class="spacer" /><button v-if="hasFilters" type="button" class="btn sm ghost" @click="emit('clear')"><i class="fa-solid fa-filter-circle-xmark" /> Limpiar filtros</button></div>
  </div>
</template>
<style scoped lang="scss">
.filterbar { display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem; }
.filterbar-main { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: flex-end; :deep(> *) { flex: 1 1 180px; min-width: 0; } :deep(> .btn) { flex: 0 0 auto; } }
.filterbar-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.filterbar-foot { display: flex; align-items: center; gap: 0.5rem; }
</style>
