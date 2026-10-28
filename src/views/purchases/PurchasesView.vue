<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useConfirmStore } from '@/stores/confirm'
import type { Purchase } from '@/types'
import { PURCHASE_STATUS, money, qty, dateShort, dateTime } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const route = useRoute()
const userStore = useUserStore()
const catalog = useCatalogStore()
const confirm = useConfirmStore()
const status = ref<string>((route.query.status as string) ?? '')
const { data, loading, run } = useAsync(() => api.purchases({ status: status.value || undefined, limit: 100 }))
const { busy, run: act } = useAction()
onMounted(() => { run(); catalog.loadSuppliers(); catalog.loadIngredients() })
watch(status, run)
const STATUS_OPTIONS = [{ value: '', label: 'Todas' }, ...Object.entries(PURCHASE_STATUS).map(([value, v]) => ({ value, label: v.label }))]
const SUP_OPTIONS = computed(() => [{ value: '', label: 'Sin proveedor' }, ...catalog.suppliers.map((s) => ({ value: s._id, label: s.name }))])
const ING_OPTIONS = computed(() => catalog.ingredients.filter((i) => !i.producedInHouse).map((i) => ({ value: i._id, label: `${i.name} (${i.unit}) · ${money(i.cost)}` })))
const open = ref(false)
const form = ref<{ _id?: string; supplier: string; expectedAt: string; notes: string; items: { ingredient: string; qty: number; unitCost: number }[] }>({ supplier: '', expectedAt: '', notes: '', items: [] })
function edit(p?: Purchase) { form.value = p ? { _id: p._id, supplier: p.supplier ? (typeof p.supplier === 'string' ? p.supplier : p.supplier._id) : '', expectedAt: p.expectedAt, notes: p.notes, items: p.items.map((i) => ({ ingredient: i.ingredient, qty: i.qty, unitCost: i.unitCost })) } : { supplier: '', expectedAt: '', notes: '', items: [{ ingredient: '', qty: 0, unitCost: 0 }] }; open.value = true }
function onIng(line: { ingredient: string; unitCost: number }) { const i = catalog.ingredientById(line.ingredient); if (i && !line.unitCost) line.unitCost = i.cost }
async function save(status?: 'pedida') { const body = { ...form.value, status }; const r = await act(() => (form.value._id ? api.updatePurchase(form.value._id, body) : api.createPurchase(body)), status ? 'Compra pedida al proveedor' : 'Compra guardada'); if (r) { open.value = false; run() } }
const recv = ref<Purchase | null>(null)
const recvQty = ref<Record<string, number>>({})
const invoice = ref('')
function startReceive(p: Purchase) { recv.value = p; recvQty.value = Object.fromEntries(p.items.map((i) => [i.ingredient, i.qty])); invoice.value = ''; }
async function receive() { if (!recv.value) return; const r = await act(() => api.receivePurchase(recv.value!._id, { items: Object.entries(recvQty.value).map(([ingredient, receivedQty]) => ({ ingredient, receivedQty })), invoiceNumber: invoice.value }), 'Compra recibida: entró a bodega'); if (r) { recv.value = null; run() } }
async function cancel(p: Purchase) { const ok = await confirm.ask({ title: `Anular ${p.number}`, confirmLabel: 'Anular', danger: true }); if (!ok) return; const r = await act(() => api.updatePurchase(p._id, { status: 'anulada' }), 'Compra anulada'); if (r) run() }
const total = computed(() => form.value.items.reduce((a, i) => a + i.qty * i.unitCost, 0))
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Compras</span><h1>Compras de materia prima</h1></div><div class="actions"><BaseSelect v-model="status" :options="STATUS_OPTIONS" :searchable="false" style="min-width:180px" /><button v-if="userStore.can('compras', 'bodega')" class="btn primary" @click="edit()"><i class="fa-solid fa-plus" /> Nueva compra</button></div></div>
    <PageIntro id="compras" icon="fa-cart-shopping"><p>Requerimiento → pedida al proveedor → <strong>recibida</strong> (bodega la ingresa y actualiza el costo del insumo). Lo que falte para el plan de producción aparece como alerta.</p></PageIntro>
    <SkeletonTable v-if="loading && !data" :cols="6" />
    <div v-else class="table-wrap"><table class="table"><thead><tr><th>Compra</th><th>Proveedor</th><th>Estado</th><th>Insumos</th><th class="num">Total</th><th>Llega</th><th></th></tr></thead><tbody>
      <tr v-for="p in data?.items" :key="p._id"><td><strong>{{ p.number }}</strong><span class="hint" style="display:block">{{ dateTime(p.createdAt) }} · {{ p.createdBy }}</span></td><td>{{ p.supplierName || '—' }}</td><td><StatusBadge :map="PURCHASE_STATUS" :value="p.status" /></td><td class="wrap small">{{ p.items.map((i) => `${i.ingredientName} ${qty(i.qty, i.unit)}`).join(', ') }}</td><td class="num">{{ money(p.total) }}</td><td>{{ p.expectedAt ? dateShort(p.expectedAt) : '—' }}</td><td class="actions"><template v-if="['requerimiento', 'pedida'].includes(p.status)"><button v-if="userStore.can('compras', 'bodega')" class="btn sm" @click="edit(p)"><i class="fa-solid fa-pen" /></button><button v-if="userStore.can('bodega', 'compras')" class="btn sm accent" @click="startReceive(p)"><i class="fa-solid fa-truck-ramp-box" /> Recibir</button><button v-if="userStore.can('compras')" class="btn sm ghost" @click="cancel(p)">Anular</button></template></td></tr>
    </tbody></table></div>
    <BaseModal :open="open" :title="form._id ? 'Editar compra' : 'Nueva compra'" wide @close="open = false">
      <div class="form-row form-row-2"><div class="field"><label>Proveedor</label><BaseSelect v-model="form.supplier" :options="SUP_OPTIONS" /></div><div class="field"><label>Fecha estimada de llegada</label><BaseDatePicker v-model="form.expectedAt" /></div></div>
      <p class="section-label" style="margin-top:0.75rem">Insumos</p>
      <div v-for="(l, i) in form.items" :key="i" class="row" style="margin-bottom:0.35rem"><BaseSelect v-model="l.ingredient" :options="ING_OPTIONS" style="flex:2;min-width:240px" @change="onIng(l)" /><input v-model.number="l.qty" class="input" type="number" step="any" min="0" placeholder="Cant." style="width:100px" /><input v-model.number="l.unitCost" class="input" type="number" step="0.01" min="0" placeholder="$ unit." style="width:110px" /><span class="num" style="min-width:80px">{{ money(l.qty * l.unitCost) }}</span><button class="btn sm ghost" @click="form.items.splice(i, 1)"><i class="fa-solid fa-xmark" /></button></div>
      <div class="row"><button class="btn sm" @click="form.items.push({ ingredient: '', qty: 0, unitCost: 0 })"><i class="fa-solid fa-plus" /> Insumo</button><span class="spacer" /><strong>Total {{ money(total) }}</strong></div>
      <div class="field" style="margin-top:0.75rem"><label>Notas</label><input v-model="form.notes" class="input" /></div>
      <template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn" :disabled="busy || !form.items.some((i) => i.ingredient && i.qty > 0)" @click="save()">Guardar requerimiento</button><button class="btn primary" :disabled="busy || !form.items.some((i) => i.ingredient && i.qty > 0)" @click="save('pedida')"><i class="fa-solid fa-paper-plane" /> Pedir al proveedor</button></template>
    </BaseModal>
    <BaseModal :open="Boolean(recv)" :title="`Recibir ${recv?.number ?? ''}`" @close="recv = null">
      <template v-if="recv"><table class="table"><thead><tr><th>Insumo</th><th class="num">Pedido</th><th class="num" style="width:130px">Recibido</th></tr></thead><tbody><tr v-for="i in recv.items" :key="i.ingredient"><td>{{ i.ingredientName }} <span class="hint">{{ i.unit }}</span></td><td class="num">{{ qty(i.qty) }}</td><td class="num"><input v-model.number="recvQty[i.ingredient]" class="input" type="number" step="any" min="0" style="text-align:right" /></td></tr></tbody></table><div class="field" style="margin-top:0.75rem"><label>Número de factura del proveedor</label><input v-model="invoice" class="input" /></div></template>
      <template #footer><button class="btn" @click="recv = null">Cancelar</button><button class="btn primary" :disabled="busy" @click="receive"><i class="fa-solid fa-check" /> Ingresar a bodega</button></template>
    </BaseModal>
  </div>
</template>
