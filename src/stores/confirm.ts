import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmOptions { title: string; message?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; icon?: string; /** Pide un motivo obligatorio y lo devuelve. */ requireNote?: boolean; notePlaceholder?: string }

export const useConfirmStore = defineStore('confirm', () => {
  const open = ref(false)
  const options = ref<ConfirmOptions>({ title: '' })
  const note = ref('')
  let resolver: ((value: string | false) => void) | null = null

  /** Devuelve false si cancela; si no pide motivo devuelve "ok"; si pide motivo devuelve el texto. */
  function ask(opts: ConfirmOptions): Promise<string | false> {
    options.value = opts
    note.value = ''
    open.value = true
    return new Promise((resolve) => { resolver = resolve })
  }
  function resolve(value: string | false) {
    open.value = false
    resolver?.(value)
    resolver = null
  }
  return { open, options, note, ask, resolve }
})
