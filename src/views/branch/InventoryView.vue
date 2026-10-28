<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useConfirmStore } from '@/stores/confirm'
import { money, qty, GROUP_LABELS, MOVEMENT_LABELS, dateTime, todayStr } from '@/utils/format'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import Pager from '@/components/ui/Pager.vue'

const route = useRoute()
const userStore = useUserStore()
const catalog = useCatalogStore()
const confirm = useConfirmStore()
const branch = ref<string>(userStore.branchId ?? '')
const tab = ref<'existencias' | 'conteo' | 'kardex'>((route.query.tab as 'conteo') === 'conteo' ? 'conteo' : 'existencias')
const page = ref(1)
const { data: stock, loading, run: loadStock } = useAsync(() => api.stock(branch.value || undefined))
const { data: moves, run: loadMoves } = useAsync(() => api.movements({ branch: branch.value || undefined, page: page.value, limit: 60 }))
const { busy, run: act } = useAction()
onMounted(async () => { await catalog.loadBranches(); if (!branch.value) branch.value = catalog.locals[0]?._id ?? ''; reload() })
function reload() { if (!branch.value) return; loadStock(); loadMoves() }
watch(branch, reload)
watch(page, loadMoves)
const BRANCH_OPTIONS = computed(() => catalog.branches.filter((b) => b.active).map((b) => ({ value: b._id, label: `${b.name}${b.type !== 'local' ? ` (${b.type})` : ''}` })))
const groups = computed(() => { const m = new Map<string, typeof stock.value extends { items: infer I } ? I : never>(); for (const i of stock.value?.items ?? []) { const arr = (m.get(i.group) ?? []) as never[]; (arr as unknown[]).push(i); m.set(i.group, arr as never) } return [...m.entries()] })
// Conteo
const counted = ref<Record<string, number | null>>({})
const countNote = ref('')
const countLines = computed(() => Object.entries(counted.value).filter(([, v]) => v !== null && v !== undefined && !Number.isNaN(v)))
async function saveCount() {
  const ok = await confirm.ask({ title: 'Guardar conteo físico', message: `${countLines.value.length} insumo(s). Las existencias quedarán en lo contado y la diferencia se registra como ajuste.`, confirmLabel: 'Guardar conteo', icon: 'fa-list-check' })
  if (!ok) return
  const r = await act(() => api.dailyCount({ branch: branch.value, date: todayStr(), items: countLines.value.map(([ingredient, c]) => ({ ingredient, counted: c })), note: countNote.value }), 'Conteo guardado')
  if (r) { counted.value = {}; countNote.value = ''; tab.value = 'existencias'; reload() }
}
// Ajuste manual
const adjOpen = ref(false)
const adj = ref({ ingredient: '', type: 'merma', qty: 0, note: '' })
const ING_OPTIONS = computed(() => (stock.value?.items ?? []).map((i) => ({ value: i.ingredient, label: `${i.name} (${qty(i.qty, i.unit)})` })))
const TYPE_OPTIONS = [{ value: 'ingreso', label: 'Ingreso (entra)' }, { value: 'egreso', label: 'Egreso (sale)' }, { value: 'merma', label: 'Merma / desperdicio' }]
async function saveAdj() { const r = await act(() => api.adjustStock({ branch: branch.value, ...adj.value }), 'Movimiento registrado'); if (r) { adjOpen.value = false; adj.value = { ingredient: '', type: 'merma', qty: 0, note: '' }; reload() } }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">{{ catalog.branchName(branch) }}</span><h1>Inventario</h1></div><div class="actions"><BaseSelect v-if="!userStore.is('local')" v-model="branch" :options="BRANCH_OPTIONS" :searchable="false" style="min-width:240px" /><button class="btn" @click="adjOpen = true"><i class="fa-solid fa-right-left" /> Ajuste</button><button class="btn primary" @click="tab = 'conteo'"><i class="fa-solid fa-list-check" /> Contar</button></div></div>
    <PageIntro id="inventario" icon="fa-boxes-stacked"><p>Lo que el sistema cree que hay (entradas de producción menos lo vendido por receta). Al final del día <strong>cuenta lo real</strong>: la diferencia queda registrada y, si es grande, gerencia recibe una alerta. Así se ve si un local pide de más o pierde producto.</p></PageIntro>
    <div class="tabs"><button :class="{ active: tab === 'existencias' }" @click="tab = 'existencias'">Existencias</button><button :class="{ active: tab === 'conteo' }" @click="tab = 'conteo'">Conteo físico</button><button :class="{ active: tab === 'kardex' }" @click="tab = 'kardex'">Movimientos</button></div>
    <SkeletonTable v-if="loading && !stock" :cols="5" />
    <template v-else-if="tab === 'existencias' && stock">
      <p class="hint" style="margin-bottom:0.5rem">Valor del inventario: <strong>{{ money(stock.totalValue) }}</strong></p>
      <div class="table-wrap"><table class="table"><thead><tr><th>Insumo</th><th>Grupo</th><th class="num">Existencia</th><th class="num">Mínimo</th><th class="num">Valor</th><th>Actualizado</th></tr></thead><tbody>
        <template v-for="[g, items] in groups" :key="g"><tr v-for="i in (items as any[])" :key="i.ingredient" :class="{ 'row-rojo': i.low }"><td><strong>{{ i.name }}</strong><span v-if="i.producedInHouse" class="badge sky" style="margin-left:0.3rem">producción</span></td><td class="muted">{{ GROUP_LABELS[g] ?? g }}</td><td class="num"><strong>{{ qty(i.qty, i.unit) }}</strong></td><td class="num">{{ i.minStock ? qty(i.minStock) : '—' }}</td><td class="num">{{ money(i.value) }}</td><td class="muted small">{{ i.updatedAt ? dateTime(i.updatedAt) : '—' }}</td></tr></template>
      </tbody></table></div>
    </template>
    <template v-else-if="tab === 'conteo' && stock">
      <div class="card">
        <p class="hint" style="margin-bottom:0.75rem">Escribe solo lo que contaste; lo que dejes vacío no cambia. Cantidades en la unidad del insumo.</p>
        <div class="table-wrap" style="box-shadow:none"><table class="table"><thead><tr><th>Insumo</th><th class="num">Sistema</th><th class="num" style="width:160px">Contado</th><th class="num">Diferencia</th></tr></thead><tbody>
          <tr v-for="i in stock.items.filter((x) => x.producedInHouse || x.group === 'mariscos' || x.group === 'bebidas' || x.qty > 0)" :key="i.ingredient"><td>{{ i.name }} <span class="hint">{{ i.unit }}</span></td><td class="num">{{ qty(i.qty) }}</td><td class="num"><input v-model.number="counted[i.ingredient]" class="input" type="number" min="0" step="any" inputmode="decimal" style="text-align:right" /></td><td class="num" :class="{ 'muted': counted[i.ingredient] == null }"><span v-if="counted[i.ingredient] != null" :style="{ color: (counted[i.ingredient] ?? 0) - i.qty < 0 ? 'var(--red-600)' : 'var(--green-600)' }">{{ qty((counted[i.ingredient] ?? 0) - i.qty) }}</span><span v-else>—</span></td></tr>
        </tbody></table></div>
        <div class="row" style="margin-top:0.75rem"><input v-model="countNote" class="input" placeholder="Nota del conteo (opcional)" style="flex:1" /><button class="btn primary" :disabled="busy || !countLines.length" @click="saveCount"><i class="fa-solid fa-check" /> Guardar conteo ({{ countLines.length }})</button></div>
      </div>
    </template>
    <template v-else-if="tab === 'kardex'">
      <div class="table-wrap"><table class="table"><thead><tr><th>Cuándo</th><th>Insumo</th><th>Movimiento</th><th class="num">Cantidad</th><th class="num">Saldo</th><th>Detalle</th><th>Quién</th></tr></thead><tbody>
        <tr v-for="m in moves?.items" :key="m._id"><td class="muted small">{{ dateTime(m.at) }}</td><td>{{ m.ingredient?.name }}</td><td><span class="badge" :class="m.qty > 0 ? 'ok' : m.type === 'venta' ? 'info' : 'warn'">{{ MOVEMENT_LABELS[m.type] ?? m.type }}</span></td><td class="num" :style="{ color: m.qty < 0 ? 'var(--red-600)' : 'var(--green-600)' }">{{ m.qty > 0 ? '+' : '' }}{{ qty(m.qty, m.ingredient?.unit) }}</td><td class="num">{{ qty(m.balance) }}</td><td class="wrap small">{{ m.note }}</td><td class="muted small">{{ m.userName }}</td></tr>
      </tbody></table></div>
      <Pager v-if="moves" :page="moves.page" :pages="moves.pages" :total="moves.total" @change="page = $event" />
    </template>
    <BaseModal :open="adjOpen" title="Ajuste de inventario" @close="adjOpen = false">
      <div class="stack"><div class="field"><label>Insumo</label><BaseSelect v-model="adj.ingredient" :options="ING_OPTIONS" /></div><div class="form-row form-row-2"><div class="field"><label>Tipo</label><BaseSelect v-model="adj.type" :options="TYPE_OPTIONS" :searchable="false" /></div><div class="field"><label>Cantidad</label><input v-model.number="adj.qty" class="input" type="number" min="0" step="any" /></div></div><div class="field"><label>Motivo (obligatorio)</label><input v-model="adj.note" class="input" placeholder="Ej. se dañó por falta de refrigeración" /></div></div>
      <template #footer><button class="btn" @click="adjOpen = false">Cancelar</button><button class="btn primary" :disabled="busy || !adj.ingredient || !adj.qty || !adj.note" @click="saveAdj">Registrar</button></template>
    </BaseModal>
  </div>
</template>
