export type UserRole = 'admin' | 'gerencia' | 'local' | 'produccion' | 'bodega' | 'compras' | 'contabilidad' | 'atencion'

export interface SessionUser { id: string; name: string; email: string; role: UserRole; branch: string | null; branchName?: string; phone: string; active: boolean }
export interface Paged<T> { items: T[]; total: number; page: number; pages: number }

export type BranchType = 'local' | 'produccion' | 'bodega'
export interface Branch { _id: string; code: string; name: string; type: BranchType; city: string; address: string; phone: string; capacity: number; hours: string; franchise: boolean; order: number; pickupEnabled: boolean; deliveryEnabled: boolean; deliveryFee: number; minOrder: number; prepMinutes: number; whatsapp: string; mapsUrl: string; privateTables: { name: string; capacity: number }[]; active: boolean }
export interface Category { _id: string; name: string; order: number; active: boolean }
export interface RecipeLine { ingredient: string | { _id: string; name: string; unit: string; cost?: number }; qty: number }
export interface Product { _id: string; code: string; name: string; category: string | Category; description: string; price: number; image: string; recipe: RecipeLine[]; featured: boolean; options: ProductOption[]; online: boolean; excludedBranches: string[]; active: boolean }
export type IngredientGroup = 'mariscos' | 'preparados' | 'granos' | 'verduras' | 'lacteos' | 'carnes' | 'bebidas' | 'insumos' | 'otros'
export interface Ingredient { _id: string; code: string; name: string; group: IngredientGroup; unit: string; cost: number; producedInHouse: boolean; recipe: RecipeLine[]; minStock: number; shelfLifeDays: number; supplier: string | { _id: string; name: string } | null; active: boolean }
export interface Supplier { _id: string; name: string; contact: string; phone: string; email: string; categories: string[]; creditDays: number; notes: string; active: boolean }

export interface StockItem { ingredient: string; name: string; code: string; group: IngredientGroup; unit: string; cost: number; producedInHouse: boolean; minStock: number; qty: number; value: number; low: boolean; updatedAt: string | null }
export interface StockMovement { _id: string; branch: { _id: string; name: string }; ingredient: { _id: string; name: string; unit: string }; type: string; qty: number; balance: number; refType: string; note: string; userName: string; at: string }
export interface DailyCount { _id: string; branch: { _id: string; name: string } | string; date: string; items: { ingredient: string; ingredientName: string; expected: number; counted: number; diff: number }[]; diffValue: number; note: string; countedBy: string }

export interface SalesLine { product: string; productName: string; qty: number; amount: number }
export interface DailySales { _id: string; branch: { _id: string; name: string } | string; date: string; weekday: number; items: SalesLine[]; totalQty: number; totalAmount: number; tickets: number; source: string; consumed: boolean; closedBy: string }

export type OrderStatus = 'borrador' | 'enviado' | 'aprobado' | 'despachado' | 'recibido' | 'anulado'
export interface OrderLine { ingredient: string; ingredientName: string; unit: string; stock: number; expected: number; suggested: number; requested: number; approved: number; dispatched: number; received: number; inflated: boolean; justification: string }
export interface InternalOrder { _id: string; number: string; branch: string; branchName: string; deliveryDate: string; status: OrderStatus; items: OrderLine[]; inflatedCount: number; notes: string; productionNote: string; createdBy: string; sentAt: string | null; approvedBy: string; approvedAt: string | null; dispatchedAt: string | null; receivedBy: string; receivedAt: string | null; createdAt: string }
export interface SuggestionLine { ingredient: string; ingredientName: string; unit: string; producedInHouse: boolean; stock: number; expected: number; suggested: number }
export interface Suggestion { lines: SuggestionLine[]; basedOnDays: number; weekday: number; safetyPct: number }

export interface PlanLine { ingredient: string; ingredientName: string; unit: string; required: number; stock: number; toProduce: number; produced: number }
export interface RawNeed { ingredient: string; ingredientName: string; unit: string; needed: number; stock: number; shortage: number }
export interface ProductionPlan { _id: string; number: string; date: string; status: 'borrador' | 'en_proceso' | 'cerrado'; orders: string[]; items: PlanLine[]; rawNeeds: RawNeed[]; notes: string; createdBy: string; closedAt: string | null }

export interface PurchaseLine { ingredient: string; ingredientName: string; unit: string; qty: number; unitCost: number; receivedQty: number }
export interface Purchase { _id: string; number: string; supplier: { _id: string; name: string } | string | null; supplierName: string; branch: string; status: 'requerimiento' | 'pedida' | 'recibida' | 'anulada'; items: PurchaseLine[]; total: number; expectedAt: string; receivedAt: string | null; invoiceNumber: string; notes: string; createdBy: string; createdAt: string }

export type ReservationStatus = 'pendiente' | 'confirmada' | 'sentada' | 'cancelada' | 'no_show'
export interface Reservation { _id: string; number: string; branch: string; branchName: string; date: string; time: string; name: string; phone: string; people: number; status: ReservationStatus; channel: string; notes: string; createdBy: string; createdAt: string }
export interface Availability { branch: { id: string; name: string; capacity: number; hours: string }; date: string; slots: { time: string; used: number; free: number }[] }

export interface Message { _id?: string; direction: 'entrante' | 'saliente'; text: string; by: string; at: string }
export interface Conversation { _id: string; phone: string; name: string; branch: string | null; topic: string; status: 'abierta' | 'esperando' | 'cerrada'; assignedTo: string; messages: Message[]; lastMessageAt: string; lastText: string; unread: number }
export interface Review { _id: string; branch: string | null; branchName: string; source: string; author: string; rating: number; text: string; reviewedAt: string; reply: string; repliedBy: string; repliedAt: string | null; status: 'nueva' | 'respondida' | 'escalada' }

export interface AlertItem { _id: string; type: string; severity: 'info' | 'warning' | 'critical'; title: string; body: string; branch: string | null; branchName: string; refType: string; refId: string | null; status: 'abierta' | 'atendida' | 'descartada'; resolvedBy: string; note: string; createdAt: string }
export interface Settings { safetyStockPct: number; weeksForAverage: number; inflatedThresholdPct: number; countDiffAlertPct: number; orderCutoff: string; reservationSlotMin: number; whatsappNumber: string; assistantName: string }
export interface AuditItem { _id: string; userName: string; role: string; action: string; entityType: string; entityLabel: string; detail: unknown; at: string }

export interface Dashboard {
  today: string; tomorrow: string
  shop: { orders: number; amount: number; pending: number; byBranch: Record<string, number> }
  totals: { today: number; week: number; reservationsToday: number; openAlerts: number; unreadConversations: number; pendingReviews: number; pendingOrders: number; openPurchases: number }
  branches: { id: string; name: string; city: string; today: number | null; week: number; daysClosed: number; orderToday: string | null; orderTomorrow: string | null; inflated: number; reservationsToday: number }[]
  byDay: { date: string; amount: number }[]
  alerts: AlertItem[]
  plan: { id: string; number: string; status: string; items: number; shortages: number } | null
}
export interface SalesReport { from: string; to: string; total: number; byBranch: { branch: string; days: number; totalAmount: number; totalQty: number; tickets: number }[]; byDay: { date: string; amount: number }[]; byWeekday: { weekday: number; label: string; days: number; totalAmount: number; avg: number }[]; topProducts: { product: string; name: string; qty: number; amount: number }[] }
export interface CountReport { from: string; to: string; byBranch: { branch: string; counts: number; diffValue: number; lines: number }[]; recent: DailyCount[] }
export interface OrderReport { from: string; to: string; byBranch: { branch: string; orders: number; inflatedLines: number; requested: number; suggested: number; ratio: number }[] }

export type CustomerOrderStatus = 'nuevo' | 'aceptado' | 'en_preparacion' | 'listo' | 'en_camino' | 'entregado' | 'cancelado'
export interface CustomerOrderItem { product: string; name: string; qty: number; unitPrice: number; options: { name: string; choice: string; price: number }[]; notes: string; lineTotal: number }
export interface CustomerOrder { _id: string; number: string; trackingCode: string; branch: string; branchName: string; type: 'retiro' | 'domicilio'; channel: string; customer: { name: string; phone: string; email: string }; address: { text: string; reference: string }; items: CustomerOrderItem[]; subtotal: number; deliveryFee: number; total: number; payment: { method: string; status: 'pendiente' | 'pagado' | 'fallido'; reference: string; paidAt: string | null }; status: CustomerOrderStatus; notes: string; scheduledFor: string; estimatedMinutes: number; timeline: { status: string; at: string; by: string; note: string }[]; enteredInPos: boolean; cancelReason: string; createdAt: string; updatedAt: string }
export interface ProductOption { name: string; required: boolean; max: number; choices: { label: string; price: number }[] }
