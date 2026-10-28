<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import type { SalesReport, CountReport, OrderReport } from '@/types'
import { money, qty, todayStr, addDaysStr, dateShort, downloadCsv, pct } from '@/utils/format'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import PageIntro from '@/components/ui/PageIntro.vue'

const userStore = useUserStore()
const catalog = useCatalogStore()
const kind = ref<'ventas' | 'inventario' | 'pedidos'>('ventas')
const to = ref(todayStr())
const from = ref(addDaysStr(todayStr(), -29))
const branch = ref('')
const { data, loading, run } = useAsync<SalesReport | CountReport | OrderReport>(() => api.report(kind.value, { from: from.value, to: to.value, branch: branch.value || undefined }))
onMounted(() => { run(); catalog.loadBranches() })
watch([kind, from, to, branch], run)
const sales = computed(() => (kind.value === 'ventas' ? (data.value as SalesReport | null) : null))
const counts = computed(() => (kind.value === 'inventario' ? (data.value as CountReport | null) : null))
const orders = computed(() => (kind.value === 'pedidos' ? (data.value as OrderReport | null) : null))
const BRANCH_OPTIONS = computed(() => [{ value: '', label: 'Todos los locales' }, ...catalog.locals.map((b) => ({ value: b._id, label: b.name }))])
const maxDay = computed(() => Math.max(1, ...(sales.value?.byDay.map((d) => d.amount) ?? [1])))
const maxWd = computed(() => Math.max(1, ...(sales.value?.byWeekday.map((d) => d.avg) ?? [1])))
function csv() { if (sales.value) downloadCsv('ventas.csv', sales.value.byDay); else if (counts.value) downloadCsv('inventario.csv', counts.value.byBranch); else if (orders.value) downloadCsv('pedidos.csv', orders.value.byBranch) }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Dirección</span><h1>Reportes</h1></div><div class="actions"><BaseDatePicker v-model="from" :clearable="false" /><BaseDatePicker v-model="to" :clearable="false" /><BaseSelect v-if="!userStore.is('local') && kind === 'ventas'" v-model="branch" :options="BRANCH_OPTIONS" :searchable="false" style="min-width:200px" /><button class="btn sm" @click="csv"><i class="fa-solid fa-file-csv" /> CSV</button></div></div>
    <PageIntro id="reportes" icon="fa-chart-line"><p><strong>Ventas</strong>: por local, por día y por día de la semana (es la base de la sugerencia de pedidos). <strong>Inventario</strong>: diferencias de los conteos físicos por local. <strong>Pedidos</strong>: cuánto pide cada local comparado con lo sugerido (quién infla).</p></PageIntro>
    <div class="tabs"><button :class="{ active: kind === 'ventas' }" @click="kind = 'ventas'">Ventas</button><button :class="{ active: kind === 'inventario' }" @click="kind = 'inventario'">Diferencias de inventario</button><button :class="{ active: kind === 'pedidos' }" @click="kind = 'pedidos'">Pedidos vs sugerido</button></div>
    <BaseSpinner v-if="loading && !data" />
    <template v-else-if="sales">
      <div class="cols cols-3"><div class="stat"><span class="stat-label">Total del período</span><span class="stat-value">{{ money(sales.total) }}</span><span class="stat-sub">{{ dateShort(sales.from) }} – {{ dateShort(sales.to) }}</span></div><div class="stat"><span class="stat-label">Mejor día de la semana</span><span class="stat-value">{{ [...sales.byWeekday].sort((a, b) => b.avg - a.avg)[0]?.label ?? '—' }}</span><span class="stat-sub">promedio {{ money([...sales.byWeekday].sort((a, b) => b.avg - a.avg)[0]?.avg) }}</span></div><div class="stat"><span class="stat-label">Plato más vendido</span><span class="stat-value" style="font-size:1.1rem">{{ sales.topProducts[0]?.name ?? '—' }}</span><span class="stat-sub">{{ qty(sales.topProducts[0]?.qty) }} unidades</span></div></div>
      <div class="cols cols-2" style="margin-top:1rem">
        <div class="card"><div class="card-head"><h3>Por día</h3></div><div class="bars"><div v-for="d in sales.byDay" :key="d.date" class="bar" :title="`${d.date}: ${money(d.amount)}`"><div class="bar-fill" :style="{ height: `${(d.amount / maxDay) * 100}%` }" /><span class="bar-label">{{ d.date.slice(5) }}</span></div></div></div>
        <div class="card"><div class="card-head"><h3>Promedio por día de la semana</h3></div><div class="bars"><div v-for="d in sales.byWeekday" :key="d.weekday" class="bar" :title="`${d.label}: ${money(d.avg)} (${d.days} días)`"><div class="bar-fill" :style="{ height: `${(d.avg / maxWd) * 100}%`, background: 'var(--amber-500)' }" /><span class="bar-label">{{ d.label.slice(0, 3) }}</span></div></div></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Local</th><th class="num">Días</th><th class="num">Ventas</th><th class="num">Promedio/día</th><th class="num">Tickets</th></tr></thead><tbody><tr v-for="b in sales.byBranch" :key="b.branch"><td>{{ b.branch }}</td><td class="num">{{ b.days }}</td><td class="num">{{ money(b.totalAmount) }}</td><td class="num">{{ money(b.days ? b.totalAmount / b.days : 0) }}</td><td class="num">{{ b.tickets }}</td></tr></tbody></table></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Plato</th><th class="num">Unidades</th><th class="num">Ventas</th></tr></thead><tbody><tr v-for="p in sales.topProducts" :key="p.product"><td>{{ p.name }}</td><td class="num">{{ qty(p.qty) }}</td><td class="num">{{ money(p.amount) }}</td></tr></tbody></table></div>
      </div>
    </template>
    <template v-else-if="counts">
      <div class="table-wrap"><table class="table"><thead><tr><th>Local</th><th class="num">Conteos</th><th class="num">Líneas con diferencia</th><th class="num">Valor de la diferencia</th></tr></thead><tbody><tr v-for="b in counts.byBranch" :key="b.branch" :class="{ 'row-rojo': b.diffValue < -20 }"><td>{{ b.branch }}</td><td class="num">{{ b.counts }}</td><td class="num">{{ b.lines }}</td><td class="num" :style="{ color: b.diffValue < 0 ? 'var(--red-600)' : 'var(--green-600)' }">{{ money(b.diffValue) }}</td></tr></tbody></table></div>
      <div class="table-wrap" style="margin-top:1rem"><table class="table"><thead><tr><th>Fecha</th><th>Local</th><th>Diferencias</th><th class="num">Valor</th><th>Quién</th></tr></thead><tbody><tr v-for="c in counts.recent" :key="c._id"><td>{{ dateShort(c.date) }}</td><td>{{ typeof c.branch === 'string' ? c.branch : c.branch.name }}</td><td class="wrap small">{{ c.items.filter((i) => Math.abs(i.diff) > 0.0001).map((i) => `${i.ingredientName} ${i.diff > 0 ? '+' : ''}${qty(i.diff)}`).join(', ') || 'sin diferencias' }}</td><td class="num">{{ money(c.diffValue) }}</td><td class="muted small">{{ c.countedBy }}</td></tr></tbody></table></div>
    </template>
    <template v-else-if="orders">
      <div class="table-wrap"><table class="table"><thead><tr><th>Local</th><th class="num">Pedidos</th><th class="num">Líneas infladas</th><th class="num">Pedido total</th><th class="num">Sugerido total</th><th class="num">Pide vs sugerido</th></tr></thead><tbody><tr v-for="b in orders.byBranch" :key="b.branch" :class="{ 'row-amarillo': b.ratio > 125 }"><td>{{ b.branch }}</td><td class="num">{{ b.orders }}</td><td class="num">{{ b.inflatedLines }}</td><td class="num">{{ qty(b.requested) }}</td><td class="num">{{ qty(b.suggested) }}</td><td class="num"><strong>{{ pct(b.ratio) }}</strong></td></tr></tbody></table></div>
    </template>
  </div>
</template>
