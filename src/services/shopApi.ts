import axios from 'axios'

/** API pública de la tienda (sin sesión). */
const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:8400/api').replace(/\/api\/?$/, '')
const pub = axios.create({ baseURL: `${base}/public`, timeout: 25000 })
const CACHE_KEY = 'lpg.storefront'

export interface ShopBranch { id: string; code: string; name: string; city: string; address: string; phone: string; hours: string; pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFee: number; minOrder: number; prepMinutes: number; whatsapp: string; mapsUrl: string; lat: number | null; lng: number | null; deliveryRadiusKm: number; capacity: number; privateTables: { name: string; capacity: number }[] }
export interface ShopOption { name: string; required: boolean; max: number; choices: { label: string; price: number }[] }
export interface ShopProduct { id: string; code: string; name: string; category: string; description: string; price: number; image: string; featured: boolean; options: ShopOption[]; excludedBranches: string[] }
export interface Storefront { branches: ShopBranch[]; categories: { id: string; name: string; order: number }[]; products: ShopProduct[]; payments: { payphone: boolean; local: boolean; efectivo: boolean; transferencia: boolean }; whatsapp: string; mapsKey: string }
export interface CartLine { key: string; product: ShopProduct; qty: number; options: { name: string; choice: string; price: number }[]; notes: string }
export interface CheckoutBody { branch: string; type: 'retiro' | 'domicilio'; customer: { name: string; phone: string; email?: string }; address?: { text: string; reference: string; lat?: number | null; lng?: number | null }; items: { product: string; qty: number; options: { name: string; choice: string }[]; notes: string }[]; payment: string; notes?: string; scheduledFor?: string }
export interface TrackedOrder { number: string; trackingCode: string; branchName: string; type: 'retiro' | 'domicilio'; customer: { name: string }; address: { text: string; reference: string }; items: { name: string; qty: number; unitPrice: number; options: { name: string; choice: string; price: number }[]; notes: string; lineTotal: number }[]; subtotal: number; deliveryFee: number; total: number; payment: { method: string; status: string }; status: string; estimatedMinutes: number; scheduledFor: string; timeline: { status: string; at: string; by: string; note: string }[]; createdAt: string; cancelReason: string }

export const shopApi = {
  /** Menú: si hay copia en el navegador se devuelve al instante y se refresca en segundo plano. */
  storefront: async (): Promise<Storefront> => {
    let cached: Storefront | null = null
    try { const raw = localStorage.getItem(CACHE_KEY); if (raw) { const c = JSON.parse(raw) as { at: number; data: Storefront }; if (Date.now() - c.at < 6 * 3600000) cached = c.data } } catch { /* privado */ }
    const fetchFresh = async () => { const d = (await pub.get<Storefront>('/storefront')).data; try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: d })) } catch { /* privado */ } return d }
    if (cached) { void fetchFresh().catch(() => undefined); return cached }
    return fetchFresh()
  },
  checkout: async (body: CheckoutBody) => (await pub.post<{ number: string; trackingCode: string; total: number; paymentUrl: string | null; status: string }>('/checkout', body)).data,
  track: async (code: string) => (await pub.get<{ order: TrackedOrder }>(`/orders/${code}`)).data.order,
  payphoneConfirm: async (order: string, id: string, clientTransactionId: string) => (await pub.post<{ status: string; payment: string; trackingCode: string }>('/payphone/confirm', { order, id, clientTransactionId })).data,
  reserve: async (body: unknown) => (await pub.post<{ reservation: { number: string; status: string; branchName: string; date: string; time: string; people: number }; message: string }>('/reservations', body)).data,
}
export function shopErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) return (error.response?.data as { message?: string })?.message ?? 'No pudimos conectar con la tienda. Intenta de nuevo.'
  return error instanceof Error ? error.message : 'Error inesperado'
}
