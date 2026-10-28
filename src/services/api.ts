import { http } from './httpBase'
import type * as T from '@/types'

type Q = Record<string, string | number | boolean | undefined | null>
const get = async <R>(url: string, params?: Q) => (await http.get<R>(url, { params })).data
const post = async <R>(url: string, body?: unknown) => (await http.post<R>(url, body)).data
const patch = async <R>(url: string, body?: unknown) => (await http.patch<R>(url, body)).data

export const api = {
  // sesión y equipo
  login: (email: string, password: string) => post<{ token: string; user: T.SessionUser }>('/auth/login', { email, password }),
  me: () => get<{ user: T.SessionUser }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) => post<{ ok: boolean }>('/auth/change-password', { currentPassword, newPassword }),
  users: (params?: Q) => get<{ items: T.SessionUser[] }>('/users', params),
  createUser: (body: unknown) => post<{ user: T.SessionUser }>('/users', body),
  updateUser: (id: string, body: unknown) => patch<{ user: T.SessionUser }>(`/users/${id}`, body),
  // catálogos
  branches: (params?: Q) => get<{ items: T.Branch[] }>('/branches', params),
  createBranch: (body: unknown) => post<{ branch: T.Branch }>('/branches', body),
  updateBranch: (id: string, body: unknown) => patch<{ branch: T.Branch }>(`/branches/${id}`, body),
  categories: () => get<{ items: T.Category[] }>('/categories'),
  saveCategory: (id: string | null, body: unknown) => (id ? patch<{ category: T.Category }>(`/categories/${id}`, body) : post<{ category: T.Category }>('/categories', body)),
  products: (params?: Q) => get<{ items: T.Product[] }>('/products', params),
  product: (id: string) => get<{ product: T.Product }>(`/products/${id}`),
  createProduct: (body: unknown) => post<{ product: T.Product }>('/products', body),
  updateProduct: (id: string, body: unknown) => patch<{ product: T.Product }>(`/products/${id}`, body),
  ingredients: (params?: Q) => get<{ items: T.Ingredient[] }>('/ingredients', params),
  createIngredient: (body: unknown) => post<{ ingredient: T.Ingredient }>('/ingredients', body),
  updateIngredient: (id: string, body: unknown) => patch<{ ingredient: T.Ingredient }>(`/ingredients/${id}`, body),
  suppliers: (params?: Q) => get<{ items: T.Supplier[] }>('/suppliers', params),
  createSupplier: (body: unknown) => post<{ supplier: T.Supplier }>('/suppliers', body),
  updateSupplier: (id: string, body: unknown) => patch<{ supplier: T.Supplier }>(`/suppliers/${id}`, body),
  // inventario
  stock: (branch?: string) => get<{ branch: { id: string; name: string; type: string }; items: T.StockItem[]; totalValue: number }>('/stock', { branch }),
  stockOverview: () => get<{ branches: { id: string; name: string; type: string }[]; rows: { ingredient: string; name: string; unit: string; group: string; producedInHouse: boolean; minStock: number; byBranch: { branch: string; qty: number }[]; total: number }[] }>('/stock/overview'),
  movements: (params?: Q) => get<T.Paged<T.StockMovement>>('/stock/movements', params),
  adjustStock: (body: unknown) => post<{ balance: number }>('/stock/adjust', body),
  dailyCount: (body: unknown) => post<{ count: T.DailyCount }>('/stock/count', body),
  counts: (params?: Q) => get<T.Paged<T.DailyCount>>('/stock/counts', params),
  // ventas
  sales: (params?: Q) => get<T.Paged<T.DailySales>>('/sales', params),
  salesDay: (branch: string | undefined, date: string) => get<{ sales: T.DailySales | null }>('/sales/day', { branch, date }),
  closeSales: (body: unknown) => post<{ sales: T.DailySales }>('/sales/close', body),
  // pedidos
  suggestion: (branch: string | undefined, date: string) => get<T.Suggestion>('/orders/suggestion', { branch, date }),
  orders: (params?: Q) => get<T.Paged<T.InternalOrder>>('/orders', params),
  order: (id: string) => get<{ order: T.InternalOrder }>(`/orders/${id}`),
  draftOrder: (branch: string | undefined, deliveryDate: string) => post<{ order: T.InternalOrder }>('/orders/draft', { branch, deliveryDate }),
  updateOrder: (id: string, body: unknown) => patch<{ order: T.InternalOrder }>(`/orders/${id}`, body),
  approveOrder: (id: string, body: unknown) => post<{ order: T.InternalOrder }>(`/orders/${id}/approve`, body),
  dispatchOrder: (id: string, body: unknown) => post<{ order: T.InternalOrder }>(`/orders/${id}/dispatch`, body),
  receiveOrder: (id: string, body: unknown) => post<{ order: T.InternalOrder }>(`/orders/${id}/receive`, body),
  cancelOrder: (id: string, note: string) => post<{ order: T.InternalOrder }>(`/orders/${id}/cancel`, { note }),
  // producción
  plans: (params?: Q) => get<T.Paged<T.ProductionPlan>>('/production/plans', params),
  plan: (id: string) => get<{ plan: T.ProductionPlan }>(`/production/plans/${id}`),
  buildPlan: (date: string) => post<{ plan: T.ProductionPlan }>('/production/plans/build', { date }),
  produce: (id: string, body: unknown) => post<{ plan: T.ProductionPlan }>(`/production/plans/${id}/produce`, body),
  closePlan: (id: string, notes: string) => post<{ plan: T.ProductionPlan }>(`/production/plans/${id}/close`, { notes }),
  // compras
  purchases: (params?: Q) => get<T.Paged<T.Purchase>>('/purchases', params),
  purchase: (id: string) => get<{ purchase: T.Purchase }>(`/purchases/${id}`),
  createPurchase: (body: unknown) => post<{ purchase: T.Purchase }>('/purchases', body),
  updatePurchase: (id: string, body: unknown) => patch<{ purchase: T.Purchase }>(`/purchases/${id}`, body),
  receivePurchase: (id: string, body: unknown) => post<{ purchase: T.Purchase }>(`/purchases/${id}/receive`, body),
  // reservas
  availability: (branch: string, date: string) => get<T.Availability>('/reservations/availability', { branch, date }),
  reservations: (params?: Q) => get<T.Paged<T.Reservation>>('/reservations', params),
  createReservation: (body: unknown) => post<{ reservation: T.Reservation }>('/reservations', body),
  updateReservation: (id: string, body: unknown) => patch<{ reservation: T.Reservation }>(`/reservations/${id}`, body),
  // atención
  conversations: (params?: Q) => get<T.Paged<T.Conversation>>('/conversations', params),
  conversation: (id: string) => get<{ conversation: T.Conversation }>(`/conversations/${id}`),
  inbound: (body: unknown) => post<{ conversation: T.Conversation }>('/conversations/inbound', body),
  reply: (id: string, text: string, status?: string) => post<{ conversation: T.Conversation }>(`/conversations/${id}/reply`, { text, status }),
  updateConversation: (id: string, body: unknown) => patch<{ conversation: T.Conversation }>(`/conversations/${id}`, body),
  reviews: (params?: Q) => get<T.Paged<T.Review> & { stats: { _id: string; avg: number; count: number; pending: number }[] }>('/reviews', params),
  createReview: (body: unknown) => post<{ review: T.Review }>('/reviews', body),
  replyReview: (id: string, body: unknown) => post<{ review: T.Review }>(`/reviews/${id}/reply`, body),
  // tienda (pantalla de pedidos)
  shopBoard: (branch?: string) => get<{ active: T.CustomerOrder[]; done: T.CustomerOrder[]; newCount: number; lastId: string }>('/shop/board', { branch }),
  shopOrders: (params?: Q) => get<T.Paged<T.CustomerOrder>>('/shop/orders', params),
  shopOrder: (id: string) => get<{ order: T.CustomerOrder }>(`/shop/orders/${id}`),
  updateShopOrder: (id: string, body: unknown) => patch<{ order: T.CustomerOrder }>(`/shop/orders/${id}`, body),
  signUpload: (body: { folder?: string; publicId?: string; tags?: string[] }) => post<{ cloudName: string; apiKey: string; uploadUrl: string; params: Record<string, string> }>('/media/sign', body),
  // panel y demás
  dashboard: () => get<T.Dashboard>('/dashboard'),
  alerts: (params?: Q) => get<T.Paged<T.AlertItem>>('/alerts', params),
  resolveAlert: (id: string, action: 'atender' | 'descartar', note: string) => post<{ alert: T.AlertItem }>(`/alerts/${id}/resolve`, { action, note }),
  report: <R>(kind: string, params?: Q) => get<R>('/reports', { kind, ...params }),
  assistantStatus: () => get<{ configured: boolean; snapshot: string }>('/assistant'),
  ask: (question: string, history: { role: 'user' | 'assistant'; text: string }[]) => post<{ answer: string; engine: string }>('/assistant/ask', { question, history }),
  settings: () => get<{ settings: T.Settings }>('/settings'),
  updateSettings: (body: unknown) => patch<{ settings: T.Settings }>('/settings', body),
  audit: (params?: Q) => get<T.Paged<T.AuditItem>>('/audit', params),
  health: () => get<{ ok: boolean; db: boolean; assistant: boolean }>('/health'),
}
