<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useConfirmStore } from '@/stores/confirm'
import { api } from '@/services/api'
import type { UserRole } from '@/types'
import { ROLE_LABELS } from '@/utils/format'
import { ROLE_HOME } from '@/router'
import BaseSelect from '@/components/ui/BaseSelect.vue'

interface NavItem { to: string; label: string; icon: string; roles: UserRole[]; desc?: string }
interface NavSection { label: string; items: NavItem[] }

const ALL: UserRole[] = ['admin', 'gerencia', 'local', 'produccion', 'bodega', 'compras', 'contabilidad', 'atencion']
const OF: UserRole[] = ['admin', 'gerencia', 'contabilidad']
const NAV: NavSection[] = [
  { label: 'Dirección', items: [
    { to: '/panel', label: 'Panel', icon: 'fa-gauge-high', roles: ALL, desc: 'Ventas, pedidos y reservas de hoy' },
    { to: '/alertas', label: 'Alertas', icon: 'fa-bell', roles: ALL, desc: 'Lo que necesita atención' },
    { to: '/asistente', label: 'Asistente', icon: 'fa-wand-magic-sparkles', roles: ALL, desc: 'Pregúntale al negocio' },
  ] },
  { label: 'Tienda en línea', items: [
    { to: '/pedidos-tienda', label: 'Pedidos de la tienda', icon: 'fa-bell-concierge', roles: ['local', 'atencion', 'produccion', ...OF], desc: 'Pantalla de pedidos: suena al llegar uno' },
    { to: '/', label: 'Ver la tienda', icon: 'fa-bag-shopping', roles: ALL, desc: 'Como la ve el cliente' },
  ] },
  { label: 'Mi local', items: [
    { to: '/mi-local', label: 'Mi local', icon: 'fa-store', roles: ['local', ...OF, 'produccion'], desc: 'Resumen y tareas del día' },
    { to: '/ventas', label: 'Ventas del día', icon: 'fa-cash-register', roles: ['local', ...OF], desc: 'Cierre diario por plato' },
    { to: '/inventario', label: 'Inventario', icon: 'fa-boxes-stacked', roles: ['local', 'produccion', 'bodega', 'compras', ...OF], desc: 'Existencias, conteo y kardex' },
    { to: '/pedidos', label: 'Pedidos a producción', icon: 'fa-clipboard-list', roles: ['local', 'produccion', 'bodega', ...OF], desc: 'Sugerencia automática y envío' },
  ] },
  { label: 'Producción', items: [
    { to: '/produccion', label: 'Plan de producción', icon: 'fa-fire-burner', roles: ['produccion', 'bodega', 'compras', ...OF], desc: 'Qué preparar para mañana' },
    { to: '/existencias', label: 'Existencias por lugar', icon: 'fa-warehouse', roles: ['produccion', 'bodega', 'compras', ...OF], desc: 'Todos los locales y bodega' },
    { to: '/compras', label: 'Compras', icon: 'fa-cart-shopping', roles: ['compras', 'bodega', 'produccion', ...OF], desc: 'Requerimientos y recepción' },
  ] },
  { label: 'Atención', items: [
    { to: '/whatsapp', label: 'WhatsApp', icon: 'fa-comments', roles: ['atencion', 'local', ...OF], desc: 'Un solo número para toda la cadena' },
    { to: '/reservas', label: 'Reservas', icon: 'fa-calendar-check', roles: ['atencion', 'local', ...OF], desc: 'Cupo por local y hora' },
    { to: '/resenas', label: 'Reseñas', icon: 'fa-star', roles: ['atencion', 'local', ...OF], desc: 'Google y otras fuentes' },
  ] },
  { label: 'Catálogos', items: [
    { to: '/menu', label: 'Menú y recetas', icon: 'fa-utensils', roles: ALL, desc: 'Platos, precios y consumo' },
    { to: '/insumos', label: 'Insumos y preparados', icon: 'fa-shrimp', roles: ['produccion', 'bodega', 'compras', 'local', ...OF], desc: 'Lo que se controla en inventario' },
    { to: '/proveedores', label: 'Proveedores', icon: 'fa-handshake', roles: ['compras', 'bodega', 'produccion', ...OF] },
    { to: '/locales', label: 'Locales', icon: 'fa-map-location-dot', roles: ALL },
  ] },
  { label: 'Sistema', items: [
    { to: '/reportes', label: 'Reportes', icon: 'fa-chart-line', roles: ALL },
    { to: '/equipo', label: 'Equipo', icon: 'fa-users', roles: ['admin', 'gerencia'] },
    { to: '/configuracion', label: 'Configuración', icon: 'fa-sliders', roles: ['admin', 'gerencia'] },
    { to: '/bitacora', label: 'Bitácora', icon: 'fa-clock-rotate-left', roles: ['admin', 'gerencia', 'contabilidad'] },
  ] },
]
const QUICK: Partial<Record<UserRole, { to: string; label: string; icon: string }[]>> = {
  gerencia: [{ to: '/panel', label: 'Cómo van los locales hoy', icon: 'fa-gauge-high' }, { to: '/pedidos?status=enviado', label: 'Pedidos por aprobar', icon: 'fa-clipboard-check' }, { to: '/asistente', label: 'Preguntar al asistente', icon: 'fa-wand-magic-sparkles' }],
  local: [{ to: '/pedidos-tienda', label: 'Pedidos de la tienda', icon: 'fa-bell-concierge' }, { to: '/ventas', label: 'Cerrar ventas de hoy', icon: 'fa-cash-register' }, { to: '/pedidos', label: 'Pedido para mañana', icon: 'fa-clipboard-list' }, { to: '/inventario?tab=conteo', label: 'Contar inventario', icon: 'fa-list-check' }],
  produccion: [{ to: '/pedidos?status=enviado', label: 'Aprobar pedidos', icon: 'fa-clipboard-check' }, { to: '/produccion', label: 'Plan de mañana', icon: 'fa-fire-burner' }, { to: '/existencias', label: 'Existencias', icon: 'fa-warehouse' }],
  bodega: [{ to: '/existencias', label: 'Existencias', icon: 'fa-warehouse' }, { to: '/compras?status=pedida', label: 'Recibir compras', icon: 'fa-truck-ramp-box' }],
  compras: [{ to: '/compras', label: 'Requerimientos', icon: 'fa-cart-shopping' }, { to: '/produccion', label: 'Qué falta para producir', icon: 'fa-fire-burner' }],
  atencion: [{ to: '/pedidos-tienda', label: 'Pedidos de la tienda', icon: 'fa-bell-concierge' }, { to: '/whatsapp', label: 'Mensajes sin responder', icon: 'fa-comments' }, { to: '/reservas', label: 'Reservas de hoy', icon: 'fa-calendar-check' }, { to: '/resenas?status=nueva', label: 'Reseñas por responder', icon: 'fa-star' }],
  contabilidad: [{ to: '/reportes', label: 'Reportes', icon: 'fa-chart-line' }, { to: '/bitacora', label: 'Bitácora', icon: 'fa-clock-rotate-left' }],
}
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
void ALL
const confirmStore = useConfirmStore()
const drawerOpen = shallowRef(false)
const alertCount = ref(0)
let timer: number | undefined
const quick = computed(() => (userStore.role ? QUICK[userStore.role] ?? [] : []))
const sections = computed(() => NAV.map((s) => ({ ...s, items: s.items.filter((i) => userStore.role && (userStore.is('admin', 'gerencia') || i.roles.includes(userStore.role))) })).filter((s) => s.items.length))
const pageTitle = computed(() => (route.meta.title as string) ?? '')
const initials = computed(() => (userStore.user?.name ?? '').split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase())
const VIEW_AS = (Object.keys(ROLE_LABELS) as UserRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))
const viewAsModel = computed({ get: () => userStore.viewAs ?? userStore.realRole ?? 'admin', set: (v: string) => { userStore.setViewAs(v as UserRole); router.push(ROLE_HOME[(userStore.role ?? 'admin') as UserRole]) } })
async function loadAlerts() { try { alertCount.value = (await api.alerts({ limit: 1 })).total } catch { /* sin sesión */ } }
watch(() => route.fullPath, () => { drawerOpen.value = false; loadAlerts() })
onMounted(() => { loadAlerts(); timer = window.setInterval(loadAlerts, 60000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
async function logout() {
  const ok = await confirmStore.ask({ title: '¿Cerrar sesión?', message: 'Volverás a la pantalla de ingreso.', confirmLabel: 'Salir', icon: 'fa-arrow-right-from-bracket' })
  if (!ok) return
  userStore.clear(); router.replace({ name: 'Login' })
}
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-left">
        <button class="menu-btn" type="button" :aria-label="drawerOpen ? 'Cerrar menú' : 'Abrir menú'" @click="drawerOpen = !drawerOpen"><i class="fa-solid" :class="drawerOpen ? 'fa-xmark' : 'fa-bars'" /></button>
        <RouterLink to="/panel" class="brand"><span class="brand-mark"><img src="/brand/favicon.svg" alt="La Pata Gorda" /></span><span class="brand-text"><span class="brand-name">LA PATA GORDA</span><span class="brand-page">{{ pageTitle }}</span></span></RouterLink>
      </div>
      <div class="session">
        <RouterLink to="/alertas" class="icon-btn" title="Alertas"><i class="fa-solid fa-bell" /><span v-if="alertCount" class="pill">{{ alertCount > 99 ? '99+' : alertCount }}</span></RouterLink>
        <RouterLink to="/mi-cuenta" class="avatar" :title="userStore.user?.name">{{ initials }}</RouterLink>
        <button class="icon-btn" type="button" title="Salir" @click="logout"><i class="fa-solid fa-arrow-right-from-bracket" /></button>
      </div>
    </header>
    <div class="body">
      <Transition name="fade"><div v-if="drawerOpen" class="scrim" @click="drawerOpen = false" /></Transition>
      <nav class="sidenav" :class="{ 'sidenav--open': drawerOpen }">
        <div class="sidenav-sections">
          <div v-if="quick.length" class="quick"><p class="nav-section-label"><i class="fa-solid fa-bolt" /> Tu día</p><RouterLink v-for="q in quick" :key="q.label" :to="q.to" class="quick-item"><i class="fa-solid" :class="q.icon" /> {{ q.label }}</RouterLink></div>
          <div v-for="section in sections" :key="section.label" class="nav-section">
            <p class="nav-section-label">{{ section.label }}</p>
            <RouterLink v-for="item in section.items" :key="item.to" :to="item.to" class="nav-item" :title="item.desc"><i class="fa-solid nav-icon" :class="item.icon" /><span class="nav-text"><span>{{ item.label }}</span><span v-if="item.desc" class="nav-desc">{{ item.desc }}</span></span></RouterLink>
          </div>
        </div>
        <div class="sidenav-bottom">
          <div v-if="userStore.canViewAs" class="view-as"><p class="nav-section-label"><i class="fa-solid fa-eye" /> Ver la app como</p><BaseSelect v-model="viewAsModel" :options="VIEW_AS" size="sm" :searchable="false" /></div>
          <div class="sidenav-user"><span class="user-avatar">{{ initials }}</span><span class="user-info"><span class="user-name">{{ userStore.user?.name }}</span><span class="user-role">{{ userStore.realRole ? ROLE_LABELS[userStore.realRole] : '' }}</span></span></div>
        </div>
      </nav>
      <main class="content">
        <Transition name="fade"><div v-if="userStore.canViewAs && userStore.viewAs" class="viewing-as"><i class="fa-solid fa-eye" /><span>Estás viendo la app como <strong>{{ ROLE_LABELS[userStore.viewAs] }}</strong></span><button type="button" class="btn sm" @click="viewAsModel = userStore.realRole ?? 'admin'">Volver a mi vista</button></div></Transition>
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/mixins' as *;
.shell { display: flex; flex-direction: column; min-height: 100dvh; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; background: var(--navy-800); color: #fff; height: calc(var(--header-h) + env(safe-area-inset-top)); padding: env(safe-area-inset-top) 0.75rem 0; position: sticky; top: 0; z-index: 30; border-bottom: 3px solid var(--amber-500); }
.topbar-left { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
.menu-btn { background: none; border: none; color: #fff; font-size: 1.25rem; width: 40px; height: 40px; border-radius: 8px; @include md { display: none; } }
.brand { display: flex; align-items: center; gap: 0.6rem; color: #fff; min-width: 0; }
.brand-mark { width: 36px; height: 36px; border-radius: 9px; overflow: hidden; flex: none; img { width: 100%; height: 100%; display: block; } }
.brand-text { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
.brand-name { font-weight: 800; letter-spacing: 0.12em; font-size: 0.68rem; opacity: 0.85; }
.brand-page { font-weight: 700; font-size: 1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.session { display: flex; align-items: center; gap: 0.35rem; }
.icon-btn { position: relative; background: none; border: none; color: #fff; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; &:hover { background: rgba(255,255,255,0.12); } }
.pill { position: absolute; top: 4px; right: 2px; background: var(--amber-500); color: var(--navy-900); font-size: 0.62rem; font-weight: 800; border-radius: 999px; padding: 0 5px; min-width: 17px; height: 17px; display: flex; align-items: center; justify-content: center; }
.avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--amber-500); color: var(--navy-900); font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; }
.body { display: flex; flex: 1; min-height: 0; }
.scrim { position: fixed; inset: 0; background: rgba(79, 25, 20, 0.45); z-index: 20; @include md { display: none; } }
.sidenav { position: fixed; top: calc(var(--header-h) + env(safe-area-inset-top)); bottom: 0; left: 0; width: var(--sidenav-w); background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; z-index: 25; transform: translateX(-100%); transition: transform 0.2s ease; overflow-y: auto; &.sidenav--open { transform: none; } @include md { position: sticky; transform: none; height: calc(100dvh - var(--header-h)); } }
.sidenav-sections { padding: 0.75rem 0.6rem; flex: 1; }
.nav-section { margin-bottom: 0.9rem; }
.nav-section-label { font-size: 0.68rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); font-weight: 700; padding: 0 0.6rem; margin: 0 0 0.3rem; }
.nav-item { display: flex; align-items: center; gap: 0.65rem; padding: 0.45rem 0.7rem; border-radius: 8px; color: var(--gray-700); font-weight: 600; font-size: 0.92rem; &:hover { background: var(--gray-100); } &.router-link-active { background: var(--amber-100); color: var(--navy-800); .nav-desc { color: var(--amber-600); } } }
.nav-text { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.nav-desc { font-size: 0.7rem; font-weight: 500; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.quick { margin-bottom: 0.9rem; background: var(--blue-100); border-radius: 10px; padding: 0.5rem 0.4rem; display: flex; flex-direction: column; gap: 0.2rem; }
.quick-item { display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.5rem; border-radius: 6px; color: var(--blue-500); font-weight: 700; font-size: 0.85rem; &:hover { background: rgba(31,111,139,0.12); } i { width: 16px; text-align: center; } }
.nav-icon { width: 18px; text-align: center; color: var(--gray-500); .router-link-active & { color: var(--navy-800); } }
.sidenav-bottom { border-top: 1px solid var(--border); padding: 0.75rem 0.8rem; display: flex; flex-direction: column; gap: 0.75rem; }
.view-as { display: flex; flex-direction: column; gap: 0.3rem; }
.sidenav-user { display: flex; align-items: center; gap: 0.6rem; }
.user-avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--navy-800); color: #fff; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; flex: none; }
.user-info { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.user-name { font-weight: 700; font-size: 0.88rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 0.75rem; color: var(--text-muted); }
.content { flex: 1; min-width: 0; }
.viewing-as { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; background: var(--amber-100); color: var(--amber-600); padding: 0.5rem 1rem; font-size: 0.9rem; border-bottom: 1px solid #f3d58a; }
</style>
