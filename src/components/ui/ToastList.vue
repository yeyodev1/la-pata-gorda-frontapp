<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
const store = useToastStore()
const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' }
</script>
<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in store.toasts" :key="t.id" class="toast" :class="t.kind" role="status" @click="store.dismiss(t.id)"><i class="fa-solid" :class="icons[t.kind]" /><span>{{ t.message }}</span></div>
    </TransitionGroup>
  </div>
</template>
<style scoped lang="scss">
.toasts { position: fixed; left: 50%; bottom: calc(1rem + env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; flex-direction: column; gap: 0.5rem; z-index: 100; width: min(520px, calc(100vw - 2rem)); }
.toast { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.95rem; border-radius: 10px; background: var(--gray-900); color: #fff; font-weight: 600; font-size: 0.92rem; box-shadow: 0 8px 24px rgba(0,0,0,0.25); cursor: pointer; i { margin-top: 2px; } &.success { background: var(--green-600); } &.error { background: var(--red-600); } &.warn { background: var(--amber-600); } }
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
