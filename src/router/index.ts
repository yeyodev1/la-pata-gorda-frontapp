import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { UserRole } from '@/types'

const ALL: UserRole[] = ['admin', 'gerencia', 'local', 'produccion', 'bodega', 'compras', 'contabilidad', 'atencion']
const OFICINA: UserRole[] = ['admin', 'gerencia', 'contabilidad']

const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'Login', component: () => import('@/views/LoginView.vue'), meta: { title: 'Ingresar', public: true } },
  // Tienda en línea (pública)
  { path: '/', name: 'Store', component: () => import('@/views/shop/StoreView.vue'), meta: { title: 'Pedidos en línea', public: true } },
  { path: '/tienda', redirect: '/' },
  { path: '/tienda/checkout', name: 'Checkout', component: () => import('@/views/shop/CheckoutView.vue'), meta: { title: 'Confirmar pedido', public: true } },
  { path: '/tienda/pedido/:code', name: 'Track', component: () => import('@/views/shop/TrackView.vue'), meta: { title: 'Tu pedido', public: true } },
  { path: '/tienda/pago', name: 'PayphoneReturn', component: () => import('@/views/shop/PayphoneReturnView.vue'), meta: { title: 'Pago', public: true } },
  { path: '/tienda/reservar', name: 'Reserve', component: () => import('@/views/shop/ReserveView.vue'), meta: { title: 'Reservar mesa', public: true } },
  { path: '/pedidos-tienda', name: 'ShopBoard', component: () => import('@/views/shop/ShopBoardView.vue'), meta: { title: 'Pedidos de la tienda', roles: ['local', 'atencion', 'produccion', ...OFICINA] } },
  { path: '/panel', name: 'Dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Panel', roles: ALL } },
  { path: '/alertas', name: 'Alerts', component: () => import('@/views/AlertsView.vue'), meta: { title: 'Alertas', roles: ALL } },
  { path: '/asistente', name: 'Assistant', component: () => import('@/views/AssistantView.vue'), meta: { title: 'Asistente', roles: ALL } },
  // Mi local
  { path: '/mi-local', name: 'MyBranch', component: () => import('@/views/branch/BranchHomeView.vue'), meta: { title: 'Mi local', roles: ['local', ...OFICINA, 'produccion'] } },
  { path: '/ventas', name: 'Sales', component: () => import('@/views/branch/SalesView.vue'), meta: { title: 'Ventas del día', roles: ['local', ...OFICINA] } },
  { path: '/inventario', name: 'Inventory', component: () => import('@/views/branch/InventoryView.vue'), meta: { title: 'Inventario', roles: ['local', 'produccion', 'bodega', ...OFICINA, 'compras'] } },
  { path: '/pedidos', name: 'Orders', component: () => import('@/views/orders/OrdersView.vue'), meta: { title: 'Pedidos a producción', roles: ['local', 'produccion', 'bodega', ...OFICINA] } },
  { path: '/pedidos/:id', name: 'OrderDetail', component: () => import('@/views/orders/OrderDetailView.vue'), meta: { title: 'Pedido', roles: ['local', 'produccion', 'bodega', ...OFICINA] } },
  // Producción y bodega
  { path: '/produccion', name: 'Production', component: () => import('@/views/production/PlansView.vue'), meta: { title: 'Plan de producción', roles: ['produccion', 'bodega', 'compras', ...OFICINA] } },
  { path: '/produccion/:id', name: 'PlanDetail', component: () => import('@/views/production/PlanDetailView.vue'), meta: { title: 'Plan de producción', roles: ['produccion', 'bodega', 'compras', ...OFICINA] } },
  { path: '/existencias', name: 'StockOverview', component: () => import('@/views/production/StockOverviewView.vue'), meta: { title: 'Existencias por lugar', roles: ['produccion', 'bodega', 'compras', ...OFICINA] } },
  { path: '/compras', name: 'Purchases', component: () => import('@/views/purchases/PurchasesView.vue'), meta: { title: 'Compras', roles: ['compras', 'bodega', 'produccion', ...OFICINA] } },
  // Atención
  { path: '/reservas', name: 'Reservations', component: () => import('@/views/attention/ReservationsView.vue'), meta: { title: 'Reservas', roles: ['atencion', 'local', ...OFICINA] } },
  { path: '/whatsapp', name: 'Conversations', component: () => import('@/views/attention/ConversationsView.vue'), meta: { title: 'WhatsApp', roles: ['atencion', 'local', ...OFICINA] } },
  { path: '/resenas', name: 'Reviews', component: () => import('@/views/attention/ReviewsView.vue'), meta: { title: 'Reseñas', roles: ['atencion', 'local', ...OFICINA] } },
  // Catálogos
  { path: '/menu', name: 'Menu', component: () => import('@/views/catalog/MenuView.vue'), meta: { title: 'Menú y recetas', roles: ALL } },
  { path: '/insumos', name: 'Ingredients', component: () => import('@/views/catalog/IngredientsView.vue'), meta: { title: 'Insumos y preparados', roles: ['produccion', 'bodega', 'compras', 'local', ...OFICINA] } },
  { path: '/proveedores', name: 'Suppliers', component: () => import('@/views/catalog/SuppliersView.vue'), meta: { title: 'Proveedores', roles: ['compras', 'bodega', 'produccion', ...OFICINA] } },
  { path: '/locales', name: 'Branches', component: () => import('@/views/catalog/BranchesView.vue'), meta: { title: 'Locales', roles: ALL } },
  // Reportes y sistema
  { path: '/reportes', name: 'Reports', component: () => import('@/views/ReportsView.vue'), meta: { title: 'Reportes', roles: ALL } },
  { path: '/equipo', name: 'Users', component: () => import('@/views/admin/UsersView.vue'), meta: { title: 'Equipo', roles: ['admin', 'gerencia'] } },
  { path: '/configuracion', name: 'Settings', component: () => import('@/views/admin/SettingsView.vue'), meta: { title: 'Configuración', roles: ['admin', 'gerencia'] } },
  { path: '/bitacora', name: 'Audit', component: () => import('@/views/admin/AuditView.vue'), meta: { title: 'Bitácora', roles: ['admin', 'gerencia', 'contabilidad'] } },
  { path: '/mi-cuenta', name: 'Account', component: () => import('@/views/AccountView.vue'), meta: { title: 'Mi cuenta', roles: ALL } },
  { path: '/:pathMatch(.*)*', name: 'NotFound', redirect: '/' },
]

const router = createRouter({ history: createWebHistory(), routes })

/** Primera pantalla de cada rol. */
export const ROLE_HOME: Record<UserRole, string> = { admin: '/panel', gerencia: '/panel', local: '/pedidos-tienda', produccion: '/pedidos', bodega: '/existencias', compras: '/compras', contabilidad: '/reportes', atencion: '/pedidos-tienda' }

router.beforeEach(async (to) => {
  const userStore = useUserStore()
  if (to.meta.public) return true
  if (!userStore.isLogged) await userStore.restore()
  if (!userStore.isLogged) return { name: 'Login', query: { next: to.fullPath } }
  const roles = to.meta.roles as UserRole[] | undefined
  const role = userStore.role
  if (roles && role && !roles.includes(role) && role !== 'admin' && role !== 'gerencia') return ROLE_HOME[role]
  return true
})

router.afterEach((to) => { document.title = to.meta.title ? `${to.meta.title} · La Pata Gorda` : 'La Pata Gorda' })

export default router
