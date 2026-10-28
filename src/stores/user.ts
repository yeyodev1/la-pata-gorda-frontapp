import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { SessionUser, UserRole } from '@/types'
import { api } from '@/services/api'
import { getToken, setToken } from '@/services/httpBase'

export const useUserStore = defineStore('user', () => {
  const user = ref<SessionUser | null>(null)
  const loading = shallowRef(false)
  /** "Ver como": admin y gerencia pueden mirar la app como otro rol (solo cambia lo que se muestra). */
  const viewAs = shallowRef<UserRole | null>(null)

  const isLogged = computed(() => Boolean(user.value))
  const realRole = computed(() => user.value?.role ?? null)
  const canViewAs = computed(() => realRole.value === 'admin' || realRole.value === 'gerencia')
  const role = computed<UserRole | null>(() => (canViewAs.value && viewAs.value) || realRole.value)
  const branchId = computed(() => user.value?.branch ?? null)
  const is = (...roles: UserRole[]) => Boolean(role.value && roles.includes(role.value))
  /** admin y gerencia ven todo. */
  const can = (...roles: UserRole[]) => is('admin', 'gerencia') || is(...roles)

  function setViewAs(target: UserRole | null) {
    if (!canViewAs.value) return
    viewAs.value = target && target !== realRole.value ? target : null
  }
  async function login(email: string, password: string) {
    loading.value = true
    try {
      const data = await api.login(email, password)
      setToken(data.token)
      user.value = data.user
    } finally {
      loading.value = false
    }
  }
  async function restore() {
    if (!getToken()) return
    try { user.value = (await api.me()).user } catch { clear() }
  }
  function clear() {
    setToken(null)
    user.value = null
    viewAs.value = null
  }
  return { user, loading, isLogged, role, realRole, branchId, viewAs, canViewAs, is, can, setViewAs, login, restore, clear }
})
