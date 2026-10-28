<script setup lang="ts">
defineProps<{ open: boolean; title: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="overlay" @click.self="emit('close')">
        <div class="modal" :class="{ wide }" role="dialog" aria-modal="true">
          <header class="modal-head"><h3>{{ title }}</h3><button type="button" class="btn ghost icon" aria-label="Cerrar" @click="emit('close')"><i class="fa-solid fa-xmark" /></button></header>
          <div class="modal-body"><slot /></div>
          <footer v-if="$slots.footer" class="modal-foot"><slot name="footer" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped lang="scss">
@use '@/styles/mixins' as *;
.overlay { position: fixed; inset: 0; background: rgba(10, 42, 66, 0.5); display: flex; align-items: flex-end; justify-content: center; z-index: 80; @include md { align-items: center; padding: 1rem; } }
.modal { background: var(--surface); width: 100%; max-height: 92dvh; display: flex; flex-direction: column; border-radius: 16px 16px 0 0; box-shadow: 0 20px 60px rgba(0,0,0,0.3); @include md { width: min(620px, 100%); border-radius: 14px; } &.wide { @include md { width: min(980px, 100%); } } }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 0.9rem 1.1rem; border-bottom: 1px solid var(--border); }
.modal-body { padding: 1.1rem; overflow-y: auto; }
.modal-foot { padding: 0.8rem 1.1rem calc(0.8rem + env(safe-area-inset-bottom)); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }
</style>
