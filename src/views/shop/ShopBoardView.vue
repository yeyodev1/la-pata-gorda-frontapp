<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { useConfirmStore } from '@/stores/confirm'
import { useToastStore } from '@/stores/toast'
import { apiErrorMessage } from '@/services/httpBase'
import { money, timeAgo, dateTime } from '@/utils/format'
import type { CustomerOrder, CustomerOrderStatus } from '@/types'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PageIntro from '@/components/ui/PageIntro.vue'

const userStore = useUserStore()
const catalog = useCatalogStore()
const confirm = useConfirmStore()
const toast = useToastStore()
const branch = ref<string>(userStore.branchId ?? '')
const { data, run } = useAsync(() => api.shopBoard(branch.value || undefined))
const selected = ref<CustomerOrder | null>(null)
const soundOn = ref((() => { try { return localStorage.getItem('lpg.board.sound') !== 'off' } catch { return true } })())
let timer: number | undefined
let known = new Set<string>()
let first = true
let audioCtx: AudioContext | null = null
function beep() { if (!soundOn.value) return; try { audioCtx ??= new AudioContext(); const o = audioCtx.createOscillator(); const g = audioCtx.createGain(); o.connect(g); g.connect(audioCtx.destination); o.type = 'sine'; o.frequency.setValueAtTime(880, audioCtx.currentTime); o.frequency.setValueAtTime(1175, audioCtx.currentTime + 0.15); g.gain.setValueAtTime(0.3, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6); o.start(); o.stop(audioCtx.currentTime + 0.6) } catch { /* sin audio */ } }
async function poll() { await run(); const d = data.value; if (!d) return; const ids = new Set(d.active.map((o) => o._id)); const fresh = d.active.filter((o) => o.status === 'nuevo' && !known.has(o._id)); if (!first && fresh.length) { beep(); toast.push(`${fresh.length} pedido(s) nuevo(s): ${fresh.map((o) => o.customer.name).join(', ')}`, 'warn', 8000); document.title = `(${d.newCount}) Pedidos · La Pata Gorda` } known = ids; first = false }
onMounted(() => { catalog.loadBranches(); poll(); timer = window.setInterval(poll, 10000); window.addEventListener('pointerdown', () => { audioCtx ??= new AudioContext() }, { once: true }) })
onUnmounted(() => { if (timer) clearInterval(timer) })
watch(branch, () => { first = true; known = new Set(); poll() })
watch(soundOn, (v) => { try { localStorage.setItem('lpg.board.sound', v ? 'on' : 'off') } catch { /* privado */ } })
const BRANCH_OPTIONS = computed(() => [{ value: '', label: 'Todos los locales' }, ...catalog.locals.map((b) => ({ value: b._id, label: b.name }))])
const COLS: { key: CustomerOrderStatus[]; label: string; icon: string }[] = [{ key: ['nuevo'], label: 'Nuevos', icon: 'fa-bell' }, { key: ['aceptado', 'en_preparacion'], label: 'En preparación', icon: 'fa-fire-burner' }, { key: ['listo', 'en_camino'], label: 'Listos / en camino', icon: 'fa-bag-shopping' }]
const col = (keys: CustomerOrderStatus[]) => (data.value?.active ?? []).filter((o) => keys.includes(o.status))
const LABEL: Record<string, string> = { nuevo: 'Nuevo', aceptado: 'Aceptado', en_preparacion: 'En preparación', listo: 'Listo', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' }
const PAY: Record<string, string> = { payphone: 'Tarjeta', local: 'Paga en local', efectivo: 'Efectivo al recibir', transferencia: 'Transferencia' }
const CH: Record<string, string> = { web: 'Web', whatsapp: 'WhatsApp', agente: 'Agente', telefono: 'Teléfono' }
function nextActions(o: CustomerOrder): { status: CustomerOrderStatus; label: string; cls: string; icon: string }[] {
  switch (o.status) {
    case 'nuevo': return [{ status: 'aceptado', label: 'Aceptar', cls: 'accent', icon: 'fa-check' }]
    case 'aceptado': return [{ status: 'en_preparacion', label: 'En cocina', cls: 'primary', icon: 'fa-fire-burner' }, { status: 'listo', label: 'Listo', cls: 'accent', icon: 'fa-bag-shopping' }]
    case 'en_preparacion': return [{ status: 'listo', label: 'Listo', cls: 'accent', icon: 'fa-bag-shopping' }]
    case 'listo': return o.type === 'domicilio' ? [{ status: 'en_camino', label: 'Salió', cls: 'primary', icon: 'fa-motorcycle' }, { status: 'entregado', label: 'Entregado', cls: 'accent', icon: 'fa-check-double' }] : [{ status: 'entregado', label: 'Entregado', cls: 'accent', icon: 'fa-check-double' }]
    case 'en_camino': return [{ status: 'entregado', label: 'Entregado', cls: 'accent', icon: 'fa-check-double' }]
    default: return []
  }
}
async function move(o: CustomerOrder, status: CustomerOrderStatus) { try { const r = await api.updateShopOrder(o._id, { status, paid: status === 'entregado' && o.payment.status !== 'pagado' && o.payment.method !== 'payphone' }); Object.assign(o, r.order); if (selected.value?._id === o._id) selected.value = r.order; poll() } catch (err) { toast.error(apiErrorMessage(err)) } }
async function cancel(o: CustomerOrder) { const note = await confirm.ask({ title: `Cancelar ${o.number}`, message: 'El cliente lo verá en su link de seguimiento.', requireNote: true, notePlaceholder: 'Motivo (obligatorio)', confirmLabel: 'Cancelar pedido', danger: true }); if (!note) return; try { await api.updateShopOrder(o._id, { status: 'cancelado', note }); selected.value = null; poll() } catch (err) { toast.error(apiErrorMessage(err)) } }
async function togglePos(o: CustomerOrder) { try { const r = await api.updateShopOrder(o._id, { enteredInPos: !o.enteredInPos }); Object.assign(o, r.order) } catch (err) { toast.error(apiErrorMessage(err)) } }
async function markPaid(o: CustomerOrder) { try { const r = await api.updateShopOrder(o._id, { paid: true }); Object.assign(o, r.order); if (selected.value?._id === o._id) selected.value = r.order } catch (err) { toast.error(apiErrorMessage(err)) } }
function print(o: CustomerOrder) { const w = window.open('', '_blank', 'width=400,height=600'); if (!w) return; w.document.write(`<pre style="font:13px/1.4 monospace;padding:12px">LA PATA GORDA · ${o.branchName}\n${o.number} · ${CH[o.channel] ?? o.channel}\n${o.type === 'retiro' ? 'RETIRO EN LOCAL' : 'DOMICILIO'}\n${new Date(o.createdAt).toLocaleString('es-EC')}\n--------------------------------\n${o.customer.name} · ${o.customer.phone}\n${o.type === 'domicilio' ? `${o.address.text}\n${o.address.reference}\n` : ''}${o.scheduledFor ? `Para las ${o.scheduledFor}\n` : ''}--------------------------------\n${o.items.map((i) => `${i.qty} x ${i.name}${i.options.length ? ` (${i.options.map((x) => x.choice).join(', ')})` : ''}${i.notes ? `\n   * ${i.notes}` : ''}  $${i.lineTotal.toFixed(2)}`).join('\n')}\n--------------------------------\nSubtotal $${o.subtotal.toFixed(2)}${o.deliveryFee ? `\nEnvío    $${o.deliveryFee.toFixed(2)}` : ''}\nTOTAL    $${o.total.toFixed(2)}\nPago: ${PAY[o.payment.method] ?? o.payment.method} (${o.payment.status})\n${o.notes ? `\nNota: ${o.notes}` : ''}</pre>`); w.document.close(); w.print() }
</script>
<template>
  <div class="page board">
    <div class="page-head"><div class="title"><span class="eyebrow">Tienda en línea</span><h1>Pedidos <span v-if="data?.newCount" class="badge danger" style="font-size:0.9rem;vertical-align:middle">{{ data.newCount }} nuevo(s)</span></h1></div><div class="actions"><BaseSelect v-if="!userStore.is('local')" v-model="branch" :options="BRANCH_OPTIONS" :searchable="false" style="min-width:220px" /><button class="btn" :class="{ accent: soundOn }" type="button" @click="soundOn = !soundOn"><i class="fa-solid" :class="soundOn ? 'fa-volume-high' : 'fa-volume-xmark'" /> {{ soundOn ? 'Sonido' : 'Silencio' }}</button><button class="btn sm" type="button" @click="beep(); poll()"><i class="fa-solid fa-rotate" /></button></div></div>
    <PageIntro id="board" icon="fa-bell-concierge"><p>Deja esta pantalla abierta en la caja, como un Uber más. Cuando entra un pedido <strong>suena y aparece en "Nuevos"</strong>: acéptalo, ingrésalo en el POS (marca la casilla), pásalo a cocina y márcalo listo o entregado. El cliente ve cada paso en su link de seguimiento. Se actualiza sola cada 10 segundos.</p></PageIntro>
    <div class="cols cols-3 board-cols">
      <div v-for="c in COLS" :key="c.label" class="bcol"><p class="section-label"><i class="fa-solid" :class="c.icon" /> {{ c.label }} ({{ col(c.key).length }})</p>
        <div v-for="o in col(c.key)" :key="o._id" class="card ocard" :class="[o.status, { pos: o.enteredInPos }]" @click="selected = o">
          <div class="ohead"><strong>{{ o.number }}</strong><span class="badge" :class="o.type === 'domicilio' ? 'sky' : 'info'"><i class="fa-solid" :class="o.type === 'domicilio' ? 'fa-motorcycle' : 'fa-store'" /> {{ o.type === 'domicilio' ? 'Domicilio' : 'Retiro' }}</span><span class="muted small">{{ timeAgo(o.createdAt) }}</span></div>
          <p class="oname">{{ o.customer.name }} <span class="muted small">· {{ o.customer.phone }}</span><span v-if="!userStore.is('local')" class="muted small"> · {{ o.branchName }}</span></p>
          <ul class="oitems"><li v-for="(it, i) in o.items" :key="i">{{ it.qty }} × {{ it.name }}<span v-if="it.options.length" class="muted"> ({{ it.options.map((x) => x.choice).join(', ') }})</span></li></ul>
          <p v-if="o.scheduledFor" class="small"><i class="fa-solid fa-clock" /> Para las {{ o.scheduledFor }}</p>
          <div class="ofoot"><strong>{{ money(o.total) }}</strong><span class="badge" :class="o.payment.status === 'pagado' ? 'ok' : 'warn'">{{ PAY[o.payment.method] }}{{ o.payment.status === 'pagado' ? ' ✓' : '' }}</span><label class="check small" @click.stop><input type="checkbox" :checked="o.enteredInPos" @change="togglePos(o)" /> En POS</label></div>
          <div class="oactions" @click.stop><button v-for="a in nextActions(o)" :key="a.status" class="btn sm" :class="a.cls" @click="move(o, a.status)"><i class="fa-solid" :class="a.icon" /> {{ a.label }}</button><button class="btn sm ghost" title="Imprimir" @click="print(o)"><i class="fa-solid fa-print" /></button></div>
        </div>
        <p v-if="!col(c.key).length" class="muted small" style="padding:0.5rem">—</p>
      </div>
    </div>
    <div v-if="data?.done.length" class="card" style="margin-top:1rem"><div class="card-head"><h3>Cerrados hoy ({{ data.done.length }})</h3></div><div class="table-wrap" style="box-shadow:none;border:none"><table class="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Local</th><th>Tipo</th><th class="num">Total</th><th>Estado</th><th>Cuándo</th></tr></thead><tbody><tr v-for="o in data.done" :key="o._id" class="clickable" @click="selected = o"><td>{{ o.number }}</td><td>{{ o.customer.name }}</td><td>{{ o.branchName }}</td><td>{{ o.type }}</td><td class="num">{{ money(o.total) }}</td><td><span class="badge" :class="o.status === 'entregado' ? 'ok' : 'danger'">{{ LABEL[o.status] }}</span></td><td class="muted small">{{ dateTime(o.updatedAt) }}</td></tr></tbody></table></div></div>
    <BaseModal :open="Boolean(selected)" :title="selected ? `${selected.number} · ${LABEL[selected.status]}` : ''" @close="selected = null">
      <template v-if="selected">
        <dl class="kv"><dt>Cliente</dt><dd>{{ selected.customer.name }} · {{ selected.customer.phone }}</dd><dt>Canal</dt><dd>{{ CH[selected.channel] ?? selected.channel }}</dd><dt>Entrega</dt><dd>{{ selected.type === 'retiro' ? `Retiro en ${selected.branchName}` : `${selected.address.text} ${selected.address.reference ? `(${selected.address.reference})` : ''}` }}</dd><dt v-if="selected.scheduledFor">Para</dt><dd v-if="selected.scheduledFor">{{ selected.scheduledFor }}</dd><dt>Pago</dt><dd>{{ PAY[selected.payment.method] }} · {{ selected.payment.status }}{{ selected.payment.reference ? ` · ${selected.payment.reference}` : '' }}</dd><dt>Seguimiento</dt><dd><a :href="`/tienda/pedido/${selected.trackingCode}`" target="_blank">/tienda/pedido/{{ selected.trackingCode }}</a></dd></dl>
        <ul class="oitems" style="margin:0.75rem 0"><li v-for="(it, i) in selected.items" :key="i"><strong>{{ it.qty }} × {{ it.name }}</strong> <span class="muted">{{ it.options.map((x) => x.choice).join(', ') }}</span><span v-if="it.notes" class="muted"> · “{{ it.notes }}”</span><span style="float:right">{{ money(it.lineTotal) }}</span></li></ul>
        <p v-if="selected.notes" class="alert-box warn"><i class="fa-solid fa-note-sticky" /> {{ selected.notes }}</p>
        <p class="small muted" style="margin-top:0.5rem">{{ selected.timeline.map((t) => `${LABEL[t.status] ?? t.status} ${dateTime(t.at)}${t.by ? ` (${t.by})` : ''}`).join(' → ') }}</p>
      </template>
      <template #footer><button v-if="selected && selected.payment.status !== 'pagado' && selected.payment.method !== 'payphone' && !['cancelado'].includes(selected.status)" class="btn" @click="markPaid(selected)"><i class="fa-solid fa-dollar-sign" /> Marcar cobrado</button><button v-if="selected && !['entregado', 'cancelado'].includes(selected.status)" class="btn danger" @click="cancel(selected)">Cancelar pedido</button><button v-if="selected" class="btn" @click="print(selected)"><i class="fa-solid fa-print" /> Imprimir</button><button class="btn primary" @click="selected = null">Cerrar</button></template>
    </BaseModal>
  </div>
</template>
<style scoped lang="scss">
.board-cols > .bcol { background: var(--gray-100); border-radius: 12px; padding: 0.6rem; min-height: 200px; }
.ocard { padding: 0.75rem; margin-bottom: 0.6rem; cursor: pointer; border-left: 5px solid var(--gray-300); &.nuevo { border-left-color: var(--red-500); animation: pulse 1.6s infinite; } &.aceptado, &.en_preparacion { border-left-color: var(--amber-500); } &.listo, &.en_camino { border-left-color: var(--green-500); } &.pos { background: var(--green-100); } }
@keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(217,45,32,0.35); } 50% { box-shadow: 0 0 0 6px rgba(217,45,32,0); } }
.ohead { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; .muted { margin-left: auto; } }
.oname { margin: 0.25rem 0; font-weight: 600; font-size: 0.92rem; }
.oitems { list-style: none; margin: 0.3rem 0; padding: 0; font-size: 0.88rem; li { padding: 0.1rem 0; } }
.ofoot { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem; .check { min-height: 0; margin-left: auto; } }
.oactions { display: flex; gap: 0.35rem; flex-wrap: wrap; margin-top: 0.5rem; }
</style>
