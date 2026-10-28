import axios from 'axios'

const TOKEN_KEY = 'lpg.token'

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8400/api' })

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* almacenamiento bloqueado */ }
}
export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) window.dispatchEvent(new CustomEvent('auth:token-expired'))
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return (error.response?.data as { message?: string })?.message ?? 'Error de conexión con el servidor'
  return error instanceof Error ? error.message : 'Error inesperado'
}
export function apiErrorDetails<T = Record<string, unknown>>(error: unknown): T | null {
  if (axios.isAxiosError(error)) return ((error.response?.data as { details?: T })?.details as T) ?? null
  return null
}
