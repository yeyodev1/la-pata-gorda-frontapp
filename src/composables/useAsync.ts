import { ref, shallowRef } from 'vue'
import { apiErrorMessage } from '@/services/httpBase'
import { useToastStore } from '@/stores/toast'

/** Carga de datos con estado y error en toast. */
export function useAsync<T>(fn: () => Promise<T>, initial: T | null = null) {
  const data = shallowRef<T | null>(initial)
  const loading = ref(false)
  const error = ref('')
  const toast = useToastStore()
  async function run() {
    loading.value = true
    error.value = ''
    try {
      data.value = await fn()
    } catch (err) {
      error.value = apiErrorMessage(err)
      toast.error(error.value)
    } finally {
      loading.value = false
    }
    return data.value
  }
  return { data, loading, error, run }
}

/** Ejecuta una acción mostrando éxito/error en toast. */
export function useAction() {
  const busy = ref(false)
  const toast = useToastStore()
  async function run<T>(fn: () => Promise<T>, successMessage?: string): Promise<T | null> {
    busy.value = true
    try {
      const r = await fn()
      if (successMessage) toast.success(successMessage)
      return r
    } catch (err) {
      toast.error(apiErrorMessage(err))
      return null
    } finally {
      busy.value = false
    }
  }
  return { busy, run }
}
