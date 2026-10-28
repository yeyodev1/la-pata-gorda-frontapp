<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { money, todayStr, addDaysStr, dateFull, ORDER_STATUS, WEEKDAYS, weekdayOf, qty } from '@/utils/format'
import StatCard from '@/components/ui/StatCard.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import PageIntro from '@/components/ui/PageIntro.vue'

const userStore = useUserStore()
const catalog = useCatalogStore()
const branch = ref<string>(userStore.branchId ?? '')
const today = todayStr()
const tomorrow = addDaysStr(today, 1)
const { data: sales, run: loadSales } = useAsync(() => api.salesDay(branch.value || undefined, today))
const { data: orders, run: loadOrders } = useAsync(() => api.orders({ branch: branch.value || undefined, from: today, to: tomorrow }))
const { data: stock, run: loadStock } = useAsync(() => api.stock(branch.value || undefined))
const { data: reservations, run: loadRes } = useAsync(() => api.reservations({ branch: branch.value || undefined, date: today, status: 'pendiente,confirmada,sentada' }))
const { data: suggestion, loading, run: loadSug } = useAsync(() => api.suggestion(branch.value || undefined, tomorrow))
function loadAll() { if (!branch.value) return; loadSales(); loadOrders(); loadStock(); loadRes(); loadSug() }
onMounted(async () => { await catalog.loadBranches(); if (!branch.value) branch.value = catalog.locals[0]?._id ?? ''; loadAll() })
watch(branch, loadAll)
const BRANCH_OPTIONS = computed(() => catalog.locals.map((b) => ({ value: b._id, label: b.name })))
const orderToday = computed(() => orders.value?.items.find((o) => o.deliveryDate === today && o.status !== 'anulado'))
const orderTomorrow = computed(() => orders.value?.items.find((o) => o.deliveryDate === tomorrow && o.status !== 'anulado'))
const low = computed(() => stock.value?.items.filter((i) => i.low) ?? [])
const needed = computed(() => suggestion.value?.lines.filter((l) => l.suggested > 0).slice(0, 8) ?? [])
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">{{ dateFull(today) }}</span><h1>{{ catalog.branchName(branch) }}</h1></div><div v-if="!userStore.is('local')" class="actions" style="min-width:260px"><BaseSelect v-model="branch" :options="BRANCH_OPTIONS" :searchable="false" /></div></div>
    <PageIntro id="mi-local" icon="fa-store"><p>Tu rutina diaria: <strong>1)</strong> cerrar las ventas del día (descarga el inventario por receta), <strong>2)</strong> contar lo que queda, <strong>3)</strong> enviar el pedido de mañana. El sistema calcula cuánto necesitas con el promedio de ventas de ese día de la semana más un margen de seguridad; si pides más, justifícalo.</p></PageIntro>
    <div class="cols cols-4">
      <StatCard label="Ventas de hoy" :value="sales?.sales ? money(sales.sales.totalAmount) : 'Sin cerrar'" :sub="sales?.sales ? `${sales.sales.totalQty} ítems · ${sales.sales.tickets} tickets` : 'cierra al final del día'" :tone="sales?.sales ? 'good' : 'warn'" icon="fa-cash-register" />
      <StatCard label="Pedido de hoy" :value="orderToday ? ORDER_STATUS[orderToday.status]?.label ?? orderToday.status : 'Sin pedido'" :sub="orderToday ? orderToday.number : 'producción no recibió nada'" :tone="orderToday && ['despachado', 'aprobado'].includes(orderToday.status) ? 'warn' : orderToday ? 'good' : 'bad'" icon="fa-truck" />
      <StatCard label="Pedido de mañana" :value="orderTomorrow ? ORDER_STATUS[orderTomorrow.status]?.label ?? orderTomorrow.status : 'Pendiente'" :sub="orderTomorrow ? `${orderTomorrow.items.length} insumos${orderTomorrow.inflatedCount ? ` · ${orderTomorrow.inflatedCount} sobre lo sugerido` : ''}` : `${WEEKDAYS[weekdayOf(tomorrow)]}: arma tu pedido`" :tone="orderTomorrow && orderTomorrow.status !== 'borrador' ? 'good' : 'warn'" icon="fa-clipboard-list" />
      <StatCard label="Reservas de hoy" :value="reservations?.items.reduce((a, r) => a + r.people, 0) ?? 0" :sub="`${reservations?.total ?? 0} reservas`" icon="fa-calendar-check" />
    </div>
    <div class="cols cols-2" style="margin-top:1rem">
      <div class="card">
        <div class="card-head"><h2><i class="fa-solid fa-clipboard-list" /> Sugerencia para mañana ({{ WEEKDAYS[weekdayOf(tomorrow)] }})</h2><RouterLink to="/pedidos" class="small">Armar pedido</RouterLink></div>
        <BaseSpinner v-if="loading && !suggestion" />
        <template v-else-if="suggestion">
          <p class="hint" style="margin-bottom:0.5rem">Basado en {{ suggestion.basedOnDays }} {{ WEEKDAYS[suggestion.weekday] }}s anteriores + {{ suggestion.safetyPct }} % de seguridad.</p>
          <p v-if="!needed.length" class="muted">Con lo que tienes alcanza para mañana.</p>
          <table v-else class="table"><thead><tr><th>Insumo</th><th class="num">Tienes</th><th class="num">Necesitas</th><th class="num">Pedir</th></tr></thead><tbody><tr v-for="l in needed" :key="l.ingredient"><td>{{ l.ingredientName }}</td><td class="num">{{ qty(l.stock, l.unit) }}</td><td class="num">{{ qty(l.expected) }}</td><td class="num"><strong>{{ qty(l.suggested) }}</strong></td></tr></tbody></table>
        </template>
      </div>
      <div class="card">
        <div class="card-head"><h2><i class="fa-solid fa-triangle-exclamation" /> Bajo mínimo</h2><RouterLink to="/inventario" class="small">Inventario</RouterLink></div>
        <p v-if="!low.length" class="muted">Nada bajo mínimo.</p>
        <table v-else class="table"><thead><tr><th>Insumo</th><th class="num">Tienes</th><th class="num">Mínimo</th></tr></thead><tbody><tr v-for="i in low" :key="i.ingredient" class="row-rojo"><td>{{ i.name }}</td><td class="num">{{ qty(i.qty, i.unit) }}</td><td class="num">{{ qty(i.minStock) }}</td></tr></tbody></table>
        <div class="card-head" style="margin-top:1rem"><h2><i class="fa-solid fa-calendar-check" /> Reservas de hoy</h2></div>
        <p v-if="!reservations?.items.length" class="muted">Sin reservas.</p>
        <ul v-else class="res-list"><li v-for="r in reservations.items" :key="r._id"><strong>{{ r.time }}</strong> {{ r.name }} · {{ r.people }} pers. <StatusBadge :map="{ pendiente: { label: 'por confirmar', cls: 'warn' }, confirmada: { label: 'confirmada', cls: 'ok' }, sentada: { label: 'en mesa', cls: 'info' } }" :value="r.status" /></li></ul>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.res-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.92rem; }
</style>
