import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast { id: number; message: string; kind: 'success' | 'error' | 'info' | 'warn' }
let nextId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  function push(message: string, kind: Toast['kind'] = 'info', ms = 4200) {
    const id = nextId++
    toasts.value.push({ id, message, kind })
    setTimeout(() => dismiss(id), ms)
  }
  function dismiss(id: number) { toasts.value = toasts.value.filter((t) => t.id !== id) }
  return { toasts, push, dismiss, success: (m: string) => push(m, 'success'), error: (m: string) => push(m, 'error', 6500), warn: (m: string) => push(m, 'warn', 6000) }
})
