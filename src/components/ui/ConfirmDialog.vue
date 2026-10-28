<script setup lang="ts">
import { useConfirmStore } from '@/stores/confirm'
const store = useConfirmStore()
function confirm() {
  if (store.options.requireNote && !store.note.trim()) return
  store.resolve(store.options.requireNote ? store.note.trim() : 'ok')
}
</script>
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="store.open" class="overlay" @click.self="store.resolve(false)">
        <div class="dialog" role="dialog" aria-modal="true">
          <div class="dialog-icon" :class="{ danger: store.options.danger }"><i class="fa-solid" :class="store.options.icon ?? (store.options.danger ? 'fa-triangle-exclamation' : 'fa-circle-question')" /></div>
          <h3>{{ store.options.title }}</h3>
          <p v-if="store.options.message" class="muted">{{ store.options.message }}</p>
          <textarea v-if="store.options.requireNote" v-model="store.note" class="input" :placeholder="store.options.notePlaceholder ?? 'Motivo (obligatorio)'" autofocus />
          <div class="dialog-actions">
            <button type="button" class="btn" @click="store.resolve(false)">{{ store.options.cancelLabel ?? 'Cancelar' }}</button>
            <button type="button" class="btn" :class="store.options.danger ? 'danger' : 'primary'" :disabled="store.options.requireNote && !store.note.trim()" @click="confirm">{{ store.options.confirmLabel ?? 'Confirmar' }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
<style scoped lang="scss">
.overlay { position: fixed; inset: 0; background: rgba(10, 42, 66, 0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 90; }
.dialog { background: var(--surface); border-radius: 14px; padding: 1.5rem; width: min(440px, 100%); display: flex; flex-direction: column; gap: 0.75rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.dialog-icon { width: 46px; height: 46px; border-radius: 50%; background: var(--blue-100); color: var(--navy-700); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; &.danger { background: var(--red-100); color: var(--red-600); } }
.dialog-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
</style>
