<script setup lang="ts">
/** Casilla / interruptor con estilo propio (sin checkbox nativo visible). */
defineProps<{ label?: string; toggle?: boolean; disabled?: boolean }>()
const model = defineModel<boolean>({ default: false })
</script>
<template>
  <button type="button" class="bcheck" :class="{ on: model, toggle, disabled }" :disabled="disabled" role="checkbox" :aria-checked="model" @click="model = !model">
    <span v-if="toggle" class="bcheck-track"><span class="bcheck-knob" /></span>
    <span v-else class="bcheck-box"><i class="fa-solid fa-check" /></span>
    <span v-if="label || $slots.default" class="bcheck-label"><slot>{{ label }}</slot></span>
  </button>
</template>
<style scoped lang="scss">
.bcheck { display: inline-flex; align-items: center; gap: 0.55rem; min-height: 42px; background: none; border: none; padding: 0; font-weight: 600; color: var(--text); text-align: left; &.disabled { opacity: 0.55; cursor: not-allowed; } }
.bcheck-box { width: 22px; height: 22px; border-radius: 6px; border: 2px solid var(--gray-300); display: flex; align-items: center; justify-content: center; color: transparent; font-size: 0.75rem; flex: none; transition: all 0.12s; .on & { background: var(--primary); border-color: var(--primary); color: #fff; } }
.bcheck-track { width: 42px; height: 24px; border-radius: 999px; background: var(--gray-300); position: relative; flex: none; transition: background 0.15s; .on & { background: var(--green-500); } }
.bcheck-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.15s; .on & { transform: translateX(18px); } }
</style>
