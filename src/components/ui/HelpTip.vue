<script setup lang="ts">
import { ref } from 'vue'
/** Icono de ayuda con explicación: se muestra al pasar el mouse o al tocar (móvil). */
defineProps<{ text: string; title?: string }>()
const open = ref(false)
</script>
<template>
  <span class="help" :class="{ open }" @mouseenter="open = true" @mouseleave="open = false">
    <button type="button" class="help-btn" :aria-label="title ?? 'Ayuda'" @click.stop="open = !open"><i class="fa-solid fa-circle-question" /></button>
    <span class="help-pop" role="tooltip"><strong v-if="title">{{ title }}</strong>{{ text }}</span>
  </span>
</template>
<style scoped lang="scss">
.help { position: relative; display: inline-flex; vertical-align: middle; margin-left: 0.3rem; }
.help-btn { background: none; border: none; padding: 0; color: var(--blue-500); font-size: 0.95rem; line-height: 1; display: inline-flex; &:hover { color: var(--navy-700); } }
.help-pop { display: none; position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); width: max-content; max-width: min(300px, 80vw); background: var(--gray-900); color: #fff; font-size: 0.8rem; font-weight: 500; line-height: 1.4; text-transform: none; letter-spacing: 0; padding: 0.55rem 0.7rem; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.25); z-index: 70; white-space: normal; flex-direction: column; gap: 0.2rem; strong { color: #fff; } &::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 6px solid transparent; border-top-color: var(--gray-900); } }
.help.open .help-pop { display: flex; }
</style>
