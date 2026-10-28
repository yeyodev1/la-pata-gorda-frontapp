<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { apiErrorDetails, apiErrorMessage } from '@/services/httpBase'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import { ORDER_STATUS, dateFull, dateTime, qty, WEEKDAYS, weekdayOf } from '@/utils/format'
import type { OrderLine } from '@/types'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import HelpTip from '@/components/ui/HelpTip.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const catalog = useCatalogStore()
const confirm = useConfirmStore()
const toast = useToastStore()
const id = route.params.id as string
const { data, loading, run } = useAsync(() => api.order(id))
const { busy } = useAction()
const edit = ref<Record<string, { requested: number; justification: string }>>({})
const approved = ref<Record<string, number>>({})
const dispatched = ref<Record<string, number>>({})
const received = ref<Record<string, number>>({})
const notes = ref('')
const productionNote = ref('')
const addIng = ref('')
onMounted(async () => { await catalog.loadIngredients(); await run(); sync() })
function sync() {
  const o = data.value?.order; if (!o) return
  notes.value = o.notes; productionNote.value = o.productionNote
  for (const it of o.items) { edit.value[it.ingredient] = { requested: it.requested, justification: it.justification }; approved.value[it.ingredient] = it.approved || it.requested; dispatched.value[it.ingredient] = it.dispatched || it.approved; received.value[it.ingredient] = it.received || it.dispatched }
}
const order = computed(() => data.value?.order)
const canEdit = computed(() => Boolean(order.value && ['borrador', 'enviado'].includes(order.value.status) && userStore.can('local')))
const isProd = computed(() => userStore.can('produccion'))
const ING_OPTIONS = computed(() => catalog.ingredients.filter((i) => !order.value?.items.some((it) => it.ingredient === i._id)).map((i) => ({ value: i._id, label: `${i.name} (${i.unit})` })))
const over = (it: OrderLine) => { const r = edit.value[it.ingredient]?.requested ?? it.requested; return it.suggested > 0 ? r > it.suggested * 1.25 : r > it.expected * 1.25 && r > 0 }
function items() { return Object.entries(edit.value).map(([ingredient, v]) => ({ ingredient, requested: v.requested, justification: v.justification })) }
async function save(send: boolean) {
  if (send) { const ok = await confirm.ask({ title: 'Enviar pedido a producción', message: 'Producción lo revisará y aprobará. Después de enviarlo solo producción puede ajustarlo.', confirmLabel: 'Enviar', icon: 'fa-paper-plane' }); if (!ok) return }
  try { await api.updateOrder(id, { items: items(), notes: notes.value, send }); toast.success(send ? 'Pedido enviado' : 'Borrador guardado'); await run(); sync() } catch (err) { const d = apiErrorDetails<{ ingredients?: string[] }>(err); toast.error(d?.ingredients?.length ? `Falta justificar: ${d.ingredients.join(', ')}` : apiErrorMessage(err)) }
}
function addLine() { const ing = catalog.ingredientById(addIng.value); if (!ing || !order.value) return; order.value.items.push({ ingredient: ing._id, ingredientName: ing.name, unit: ing.unit, stock: 0, expected: 0, suggested: 0, requested: 0, approved: 0, dispatched: 0, received: 0, inflated: true, justification: '' }); edit.value[ing._id] = { requested: 0, justification: '' }; addIng.value = '' }
async function doApprove() { const ok = await confirm.ask({ title: 'Aprobar pedido', message: 'Las cantidades aprobadas entran al plan de producción.', confirmLabel: 'Aprobar', icon: 'fa-check' }); if (!ok) return; try { await api.approveOrder(id, { items: Object.entries(approved.value).map(([ingredient, a]) => ({ ingredient, approved: a })), productionNote: productionNote.value }); toast.success('Pedido aprobado'); await run(); sync() } catch (err) { toast.error(apiErrorMessage(err)) } }
async function doDispatch() { const ok = await confirm.ask({ title: 'Despachar pedido', message: 'Sale del inventario del centro de producción hacia el local.', confirmLabel: 'Despachar', icon: 'fa-truck' }); if (!ok) return; try { await api.dispatchOrder(id, { items: Object.entries(dispatched.value).map(([ingredient, d]) => ({ ingredient, dispatched: d })) }); toast.success('Pedido despachado'); await run(); sync() } catch (err) { toast.error(apiErrorMessage(err)) } }
async function doReceive() { const note = await confirm.ask({ title: 'Confirmar recepción', message: 'Lo recibido entra al inventario del local. Si falta algo, anótalo.', confirmLabel: 'Recibido', icon: 'fa-box-open', requireNote: false }); if (!note) return; try { await api.receiveOrder(id, { items: Object.entries(received.value).map(([ingredient, r]) => ({ ingredient, received: r })) }); toast.success('Pedido recibido'); await run(); sync() } catch (err) { toast.error(apiErrorMessage(err)) } }
async function doCancel() { const note = await confirm.ask({ title: 'Anular pedido', message: order.value?.number ?? '', requireNote: true, notePlaceholder: 'Motivo (obligatorio)', confirmLabel: 'Anular', danger: true }); if (!note) return; try { await api.cancelOrder(id, note); toast.success('Pedido anulado'); router.push('/pedidos') } catch (err) { toast.error(apiErrorMessage(err)) } }
</script>
<template>
  <div class="page">
    <BaseSpinner v-if="loading && !order" />
    <template v-else-if="order">
      <div class="page-head"><div class="title"><span class="eyebrow"><RouterLink to="/pedidos">Pedidos</RouterLink> · {{ order.branchName }}</span><h1>{{ order.number }} <StatusBadge :map="ORDER_STATUS" :value="order.status" /></h1><span class="hint">Para el {{ dateFull(order.deliveryDate) }} ({{ WEEKDAYS[weekdayOf(order.deliveryDate)] }})</span></div>
        <div class="actions no-print">
          <template v-if="canEdit"><button class="btn" :disabled="busy" @click="save(false)"><i class="fa-solid fa-floppy-disk" /> Guardar</button><button class="btn primary" :disabled="busy" @click="save(true)"><i class="fa-solid fa-paper-plane" /> {{ order.status === 'enviado' ? 'Reenviar' : 'Enviar a producción' }}</button></template>
          <button v-if="isProd && order.status === 'enviado'" class="btn accent" @click="doApprove"><i class="fa-solid fa-check" /> Aprobar</button>
          <button v-if="isProd && order.status === 'aprobado'" class="btn accent" @click="doDispatch"><i class="fa-solid fa-truck" /> Despachar</button>
          <button v-if="userStore.can('local') && order.status === 'despachado'" class="btn accent" @click="doReceive"><i class="fa-solid fa-box-open" /> Confirmar recepción</button>
          <button v-if="['borrador', 'enviado', 'aprobado'].includes(order.status) && userStore.can('local', 'produccion')" class="btn danger" @click="doCancel">Anular</button>
        </div>
      </div>
      <div v-if="order.inflatedCount" class="alert-box warn" style="margin-bottom:1rem"><i class="fa-solid fa-arrow-trend-up" /> {{ order.inflatedCount }} línea(s) por encima de lo sugerido. Revisa las justificaciones antes de aprobar.</div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Insumo</th><th class="num">Tiene <HelpTip text="Existencia del local al momento de armar el pedido." /></th><th class="num">Necesita <HelpTip text="Consumo esperado para ese día de la semana (promedio de las últimas semanas × receta) más el % de seguridad." /></th><th class="num">Sugerido</th><th class="num">Pide</th><th v-if="order.status !== 'borrador'" class="num">Aprobado</th><th v-if="['aprobado', 'despachado', 'recibido'].includes(order.status)" class="num">Despachado</th><th v-if="['despachado', 'recibido'].includes(order.status)" class="num">Recibido</th><th>Justificación</th></tr></thead><tbody>
        <tr v-for="it in order.items" :key="it.ingredient" :class="{ 'row-amarillo': canEdit ? over(it) : it.inflated }">
          <td><strong>{{ it.ingredientName }}</strong> <span class="hint">{{ it.unit }}</span></td><td class="num">{{ qty(it.stock) }}</td><td class="num">{{ qty(it.expected) }}</td><td class="num">{{ qty(it.suggested) }}</td>
          <td class="num"><input v-if="canEdit" v-model.number="edit[it.ingredient]!.requested" class="input" type="number" min="0" step="any" style="width:90px;text-align:right" /><strong v-else>{{ qty(it.requested) }}</strong></td>
          <td v-if="order.status !== 'borrador'" class="num"><input v-if="isProd && order.status === 'enviado'" v-model.number="approved[it.ingredient]" class="input" type="number" min="0" step="any" style="width:90px;text-align:right" /><span v-else>{{ qty(it.approved) }}</span></td>
          <td v-if="['aprobado', 'despachado', 'recibido'].includes(order.status)" class="num"><input v-if="isProd && order.status === 'aprobado'" v-model.number="dispatched[it.ingredient]" class="input" type="number" min="0" step="any" style="width:90px;text-align:right" /><span v-else>{{ qty(it.dispatched) }}</span></td>
          <td v-if="['despachado', 'recibido'].includes(order.status)" class="num"><input v-if="userStore.can('local') && order.status === 'despachado'" v-model.number="received[it.ingredient]" class="input" type="number" min="0" step="any" style="width:90px;text-align:right" /><span v-else :style="{ color: it.received < it.dispatched ? 'var(--red-600)' : '' }">{{ qty(it.received) }}</span></td>
          <td class="wrap"><input v-if="canEdit && over(it)" v-model="edit[it.ingredient]!.justification" class="input" placeholder="¿Por qué más de lo sugerido?" style="min-width:220px" /><span v-else class="small">{{ it.justification || (it.inflated ? '⚠ sin justificar' : '') }}</span></td>
        </tr>
      </tbody></table></div>
      <div v-if="canEdit" class="row" style="margin-top:0.75rem"><BaseSelect v-model="addIng" :options="ING_OPTIONS" placeholder="Agregar insumo que no está en la sugerencia…" style="min-width:320px" /><button class="btn sm" :disabled="!addIng" @click="addLine"><i class="fa-solid fa-plus" /> Agregar</button></div>
      <div class="cols cols-2" style="margin-top:1rem">
        <div class="card"><h3>Notas del local</h3><textarea v-if="canEdit" v-model="notes" class="input" style="margin-top:0.5rem" /><p v-else class="small" style="white-space:pre-wrap;margin-top:0.5rem">{{ order.notes || '—' }}</p></div>
        <div class="card"><h3>Producción</h3><textarea v-if="isProd && order.status === 'enviado'" v-model="productionNote" class="input" placeholder="Nota de producción" style="margin-top:0.5rem" /><p v-else class="small" style="white-space:pre-wrap;margin-top:0.5rem">{{ order.productionNote || '—' }}</p><dl class="kv" style="margin-top:0.75rem"><dt>Creado por</dt><dd>{{ order.createdBy }}</dd><dt>Enviado</dt><dd>{{ dateTime(order.sentAt) }}</dd><dt>Aprobado</dt><dd>{{ order.approvedBy ? `${order.approvedBy} · ${dateTime(order.approvedAt)}` : '—' }}</dd><dt>Despachado</dt><dd>{{ dateTime(order.dispatchedAt) }}</dd><dt>Recibido</dt><dd>{{ order.receivedBy ? `${order.receivedBy} · ${dateTime(order.receivedAt)}` : '—' }}</dd></dl></div>
      </div>
    </template>
  </div>
</template>
