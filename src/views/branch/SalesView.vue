<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useConfirmStore } from '@/stores/confirm'
import { money, todayStr, dateFull, dateShort } from '@/utils/format'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SearchBox from '@/components/ui/SearchBox.vue'

const userStore = useUserStore()
const catalog = useCatalogStore()
const confirm = useConfirmStore()
const branch = ref<string>(userStore.branchId ?? '')
const date = ref(todayStr())
const search = ref('')
const tickets = ref(0)
const qtys = ref<Record<string, number>>({})
const { data: existing, run: loadDay } = useAsync(() => api.salesDay(branch.value || undefined, date.value))
const { data: history, run: loadHistory } = useAsync(() => api.sales({ branch: branch.value || undefined, limit: 14 }))
const { busy, run: act } = useAction()
onMounted(async () => { await Promise.all([catalog.loadBranches(), catalog.loadProducts()]); if (!branch.value) branch.value = catalog.locals[0]?._id ?? ''; reload() })
function reload() { if (!branch.value) return; qtys.value = {}; loadDay().then(() => { if (existing.value?.sales) { for (const it of existing.value.sales.items) qtys.value[it.product] = it.qty; tickets.value = existing.value.sales.tickets } }); loadHistory() }
watch([branch, date], reload)
const BRANCH_OPTIONS = computed(() => catalog.locals.map((b) => ({ value: b._id, label: b.name })))
const closed = computed(() => Boolean(existing.value?.sales?.consumed))
const byCategory = computed(() => {
  const q = search.value.toLowerCase()
  return catalog.categories.map((c) => ({ ...c, products: catalog.products.filter((p) => (typeof p.category === 'string' ? p.category : p.category._id) === c._id && !p.excludedBranches.includes(branch.value) && (!q || p.name.toLowerCase().includes(q))) })).filter((c) => c.products.length)
})
const total = computed(() => catalog.products.reduce((a, p) => a + (qtys.value[p._id] ?? 0) * p.price, 0))
const count = computed(() => Object.values(qtys.value).reduce((a, b) => a + (b || 0), 0))
async function close() {
  const ok = await confirm.ask({ title: `Cerrar ventas del ${dateShort(date.value)}`, message: `${count.value} ítems por ${money(total.value)}. Al cerrar se descarga el inventario por receta y ya no se puede editar.`, confirmLabel: 'Cerrar día', icon: 'fa-lock' })
  if (!ok) return
  const items = Object.entries(qtys.value).filter(([, q]) => q > 0).map(([product, q]) => ({ product, qty: q }))
  const r = await act(() => api.closeSales({ branch: branch.value, date: date.value, items, tickets: tickets.value }), 'Ventas cerradas e inventario actualizado')
  if (r) reload()
}
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">{{ catalog.branchName(branch) }}</span><h1>Ventas del {{ dateFull(date) }}</h1></div><div class="actions"><BaseSelect v-if="!userStore.is('local')" v-model="branch" :options="BRANCH_OPTIONS" :searchable="false" style="min-width:220px" /><BaseDatePicker v-model="date" :max="todayStr()" :clearable="false" /></div></div>
    <PageIntro id="ventas" icon="fa-cash-register"><p>Registra cuántos platos se vendieron hoy (lo que marca el software del local). Al <strong>cerrar el día</strong>, el sistema descuenta del inventario los insumos de cada receta y guarda el promedio por día de semana para sugerir el pedido de mañana. Cuando el POS esté conectado, esto se llenará solo.</p></PageIntro>
    <div v-if="closed" class="alert-box ok" style="margin-bottom:1rem"><i class="fa-solid fa-lock" /> Día cerrado por {{ existing?.sales?.closedBy }} · {{ money(existing?.sales?.totalAmount) }} · {{ existing?.sales?.totalQty }} ítems · fuente: {{ existing?.sales?.source }}</div>
    <div class="cols">
      <div class="card" style="flex:2 1 520px">
        <div class="card-head"><SearchBox v-model="search" placeholder="Buscar plato…" /><div class="row"><div class="field" style="flex-direction:row;align-items:center;gap:0.5rem"><label style="margin:0">Tickets</label><input v-model.number="tickets" class="input" type="number" min="0" style="width:90px" :disabled="closed" /></div></div></div>
        <div v-for="c in byCategory" :key="c._id" class="cat">
          <p class="section-label">{{ c.name }}</p>
          <div class="grid">
            <div v-for="p in c.products" :key="p._id" class="item" :class="{ has: qtys[p._id] }"><img v-if="p.image" :src="p.image" alt="" loading="lazy" /><div class="item-info"><strong>{{ p.name }}</strong><span class="hint">{{ money(p.price) }}</span></div><div class="counter"><button type="button" class="btn sm icon" :disabled="closed || !qtys[p._id]" @click="qtys[p._id] = Math.max(0, (qtys[p._id] ?? 0) - 1)"><i class="fa-solid fa-minus" /></button><input v-model.number="qtys[p._id]" class="input" type="number" min="0" inputmode="numeric" :disabled="closed" /><button type="button" class="btn sm icon" :disabled="closed" @click="qtys[p._id] = (qtys[p._id] ?? 0) + 1"><i class="fa-solid fa-plus" /></button></div></div>
          </div>
        </div>
      </div>
      <div style="flex:1 1 260px" class="stack">
        <div class="card sticky"><p class="section-label">Resumen</p><p class="big">{{ money(total) }}</p><p class="muted">{{ count }} ítems · {{ tickets }} tickets</p><button v-if="!closed" class="btn primary lg block" style="margin-top:0.75rem" :disabled="busy || !count" @click="close"><i class="fa-solid fa-lock" /> Cerrar día</button><p v-else class="hint" style="margin-top:0.5rem">Para corregir un día cerrado, haz un ajuste de inventario con motivo.</p></div>
        <div class="card"><p class="section-label">Últimos cierres</p><table class="table"><tbody><tr v-for="s in history?.items" :key="s._id"><td>{{ dateShort(s.date) }}</td><td class="num">{{ money(s.totalAmount) }}</td><td><span class="badge" :class="s.consumed ? 'ok' : 'warn'">{{ s.source }}</span></td></tr></tbody></table></div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.cat { margin-top: 0.75rem; }
.grid { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.item { flex: 1 1 260px; display: flex; align-items: center; gap: 0.6rem; border: 1px solid var(--border); border-radius: 10px; padding: 0.45rem 0.6rem; &.has { border-color: var(--amber-500); background: var(--amber-100); } img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex: none; } }
.item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.15; strong { font-size: 0.88rem; } }
.counter { display: flex; align-items: center; gap: 0.25rem; .input { width: 58px; text-align: center; min-height: 36px; padding: 0.2rem; } .btn.icon { width: 34px; } }
.sticky { position: sticky; top: calc(var(--header-h) + 1rem); }
.big { font-size: 1.8rem; font-weight: 800; color: var(--navy-900); }
.alert-box.ok { background: var(--green-100); color: var(--green-600); }
</style>
