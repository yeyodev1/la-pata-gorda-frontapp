<script setup lang="ts">
import { ref } from 'vue'
/** Caja explicativa al inicio de cada pantalla: qué es, quién la usa y qué pasa al guardar. Se puede ocultar. */
const props = defineProps<{ id: string; icon?: string }>()
const KEY = `lpg.intro.${props.id}`
const hidden = ref(false)
try { hidden.value = localStorage.getItem(KEY) === '1' } catch { /* sin almacenamiento */ }
function hide() { hidden.value = true; try { localStorage.setItem(KEY, '1') } catch { /* ignorar */ } }
function show() { hidden.value = false; try { localStorage.removeItem(KEY) } catch { /* ignorar */ } }
</script>
<template>
  <div v-if="!hidden" class="intro"><i class="fa-solid intro-ico" :class="icon ?? 'fa-lightbulb'" /><div class="intro-body"><slot /></div><button type="button" class="btn ghost icon sm" aria-label="Ocultar ayuda" @click="hide"><i class="fa-solid fa-xmark" /></button></div>
  <button v-else type="button" class="intro-show" @click="show"><i class="fa-solid fa-circle-question" /> ¿Cómo funciona esta pantalla?</button>
</template>
<style scoped lang="scss">
.intro { display: flex; gap: 0.7rem; align-items: flex-start; background: var(--blue-100); border: 1px solid var(--border); border-radius: 10px; padding: 0.75rem 0.9rem; margin-bottom: 1rem; font-size: 0.9rem; color: var(--navy-800); }
.intro-ico { color: var(--blue-500); font-size: 1.1rem; margin-top: 0.15rem; }
.intro-body { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; :deep(p) { margin: 0; } :deep(ul) { margin: 0.2rem 0 0; padding-left: 1.1rem; } }
.intro-show { background: none; border: none; color: var(--blue-500); font-weight: 600; font-size: 0.85rem; padding: 0; margin-bottom: 0.75rem; display: inline-flex; gap: 0.35rem; align-items: center; }
</style>
