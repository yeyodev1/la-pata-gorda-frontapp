<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { api } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { money, dateFull, dateShort, ALERT_TYPE_LABELS, ORDER_STATUS, timeAgo } from '@/utils/format'
import StatCard from '@/components/ui/StatCard.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

const userStore = useUserStore()
const { data, loading, run } = useAsync(() => api.dashboard())
let timer: number | undefined
onMounted(() => { run(); timer = window.setInterval(run, 60000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
const sevCls = (s: string) => (s === 'critical' ? 'danger' : s === 'warning' ? 'warn' : 'info')
const maxDay = computed(() => Math.max(1, ...(data.value?.byDay.map((d) => d.amount) ?? [1])))
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">{{ data ? dateFull(data.today) : '' }}</span><h1>Hola, {{ userStore.user?.name?.split(' ')[0] }}</h1></div><div class="actions"><button class="btn sm" @click="run"><i class="fa-solid fa-rotate" /> Actualizar</button></div></div>
    <BaseSpinner v-if="loading && !data" />
    <template v-else-if="data">
      <p class="section-label">Tienda en línea hoy</p>
      <div class="cols cols-4">
        <StatCard label="Pedidos de la tienda" :value="data.shop.orders" :sub="data.shop.pending ? `${data.shop.pending} nuevo(s) sin aceptar` : 'todos atendidos'" :tone="data.shop.pending ? 'warn' : 'good'" icon="fa-bell-concierge" />
        <StatCard label="Vendido por la tienda" :value="money(data.shop.amount)" sub="pedidos no cancelados de hoy" icon="fa-bag-shopping" />
        <StatCard label="WhatsApp sin responder" :value="data.totals.unreadConversations" :sub="`${data.totals.pendingReviews} reseñas por responder`" :tone="data.totals.unreadConversations ? 'warn' : ''" icon="fa-comments" />
        <StatCard label="Reservas de hoy" :value="`${data.totals.reservationsToday} pers.`" sub="confirmadas y por confirmar" icon="fa-calendar-check" />
      </div>
      <p class="section-label" style="margin-top:1rem">Operación</p>
      <div class="cols cols-4">
        <StatCard label="Ventas de hoy" :value="money(data.totals.today)" :sub="data.totals.today ? 'locales con cierre de hoy' : 'aún sin cierres de hoy'" icon="fa-cash-register" />
        <StatCard label="Ventas últimos 7 días" :value="money(data.totals.week)" :sub="`${data.branches.length} local(es)`" icon="fa-chart-line" />
        <StatCard label="Pedidos por aprobar" :value="data.totals.pendingOrders" :sub="data.plan ? `plan de mañana: ${data.plan.status}${data.plan.shortages ? ` · ${data.plan.shortages} faltante(s)` : ''}` : 'sin plan de producción para mañana'" :tone="data.totals.pendingOrders ? 'warn' : ''" icon="fa-clipboard-check" />
        <StatCard label="Alertas abiertas" :value="data.totals.openAlerts" :sub="data.totals.openPurchases ? `${data.totals.openPurchases} compras en curso` : 'sin compras pendientes'" :tone="data.totals.openAlerts ? 'warn' : 'good'" icon="fa-bell" />
      </div>
      <div class="cols cols-2" style="margin-top:1rem">
        <div class="card">
          <div class="card-head"><h2><i class="fa-solid fa-store" /> Locales hoy</h2><RouterLink to="/reportes" class="small">Reportes</RouterLink></div>
          <div class="table-wrap" style="box-shadow:none;border:none"><table class="table"><thead><tr><th>Local</th><th class="num">Hoy</th><th class="num">7 días</th><th class="num">Tienda</th><th>Pedido hoy</th><th>Pedido mañana</th><th class="num">Reservas</th></tr></thead><tbody>
            <tr v-for="b in data.branches" :key="b.id"><td><strong>{{ b.name }}</strong><span class="hint" style="display:block">{{ b.city }}</span></td><td class="num">{{ b.today === null ? '—' : money(b.today) }}</td><td class="num">{{ money(b.week) }}</td><td class="num">{{ data.shop.byBranch[b.id] ?? 0 }}</td><td><StatusBadge v-if="b.orderToday" :map="ORDER_STATUS" :value="b.orderToday" /><span v-else class="badge danger">sin pedido</span></td><td><StatusBadge v-if="b.orderTomorrow" :map="ORDER_STATUS" :value="b.orderTomorrow" /><span v-else class="badge">—</span><span v-if="b.inflated" class="badge warn" style="margin-left:0.3rem" title="líneas por encima de lo sugerido"><i class="fa-solid fa-arrow-trend-up" /> {{ b.inflated }}</span></td><td class="num">{{ b.reservationsToday }}</td></tr>
          </tbody></table></div>
        </div>
        <div class="card">
          <div class="card-head"><h2><i class="fa-solid fa-chart-column" /> Ventas por día</h2><span class="hint">últimos 7 días</span></div>
          <div class="bars"><div v-for="d in data.byDay" :key="d.date" class="bar" :title="money(d.amount)"><span class="bar-val">{{ d.amount ? money(d.amount) : '' }}</span><div class="bar-fill" :style="{ height: `${(d.amount / maxDay) * 100}%` }" /><span class="bar-label">{{ dateShort(d.date) }}</span></div></div>
        </div>
      </div>
      <div class="cols cols-2" style="margin-top:1rem">
        <div class="card">
          <div class="card-head"><h2><i class="fa-solid fa-bell" /> Alertas abiertas</h2><RouterLink to="/alertas" class="small">Ver todas ({{ data.totals.openAlerts }})</RouterLink></div>
          <p v-if="!data.alerts.length" class="muted">Sin alertas abiertas.</p>
          <ul v-else class="alerts">
            <li v-for="a in data.alerts" :key="a._id"><span class="badge" :class="sevCls(a.severity)">{{ ALERT_TYPE_LABELS[a.type] ?? a.type }}</span><div><strong>{{ a.title }}</strong><p class="small muted">{{ a.body }}</p><span class="hint">{{ timeAgo(a.createdAt) }}</span></div></li>
          </ul>
        </div>
        <div class="card">
          <div class="card-head"><h2><i class="fa-solid fa-bolt" /> Accesos rápidos</h2></div>
          <div class="quick">
            <RouterLink v-if="userStore.can('local', 'atencion')" to="/pedidos-tienda" class="btn primary"><i class="fa-solid fa-bell-concierge" /> Pedidos de la tienda</RouterLink>
            <RouterLink v-if="userStore.can('local')" to="/ventas" class="btn"><i class="fa-solid fa-cash-register" /> Cerrar ventas</RouterLink>
            <RouterLink v-if="userStore.can('local', 'produccion')" to="/pedidos" class="btn"><i class="fa-solid fa-clipboard-list" /> Pedidos</RouterLink>
            <RouterLink v-if="userStore.can('produccion', 'bodega', 'compras')" to="/produccion" class="btn"><i class="fa-solid fa-fire-burner" /> Plan de producción</RouterLink>
            <RouterLink v-if="userStore.can('atencion', 'local')" to="/reservas" class="btn"><i class="fa-solid fa-calendar-check" /> Reservas</RouterLink>
            <RouterLink v-if="userStore.can('atencion', 'local')" to="/whatsapp" class="btn"><i class="fa-solid fa-comments" /> WhatsApp</RouterLink>
            <RouterLink to="/asistente" class="btn"><i class="fa-solid fa-wand-magic-sparkles" /> Asistente</RouterLink>
            <RouterLink to="/menu" class="btn"><i class="fa-solid fa-utensils" /> Menú</RouterLink>
            <RouterLink to="/reportes" class="btn"><i class="fa-solid fa-chart-line" /> Reportes</RouterLink>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
<style scoped lang="scss">
.alerts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; li { display: flex; gap: 0.6rem; align-items: flex-start; .badge { flex: none; margin-top: 0.15rem; } } }
.quick { display: flex; flex-wrap: wrap; gap: 0.5rem; .btn { flex: 1 1 calc(50% - 0.25rem); justify-content: flex-start; } }
.bar { position: relative; }
.bar-val { font-size: 0.6rem; color: var(--text-muted); white-space: nowrap; }
</style>
