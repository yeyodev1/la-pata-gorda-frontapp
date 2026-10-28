<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import type { Reservation } from '@/types'
import { RESERVATION_STATUS, CHANNEL_LABELS, todayStr, dateFull, addDaysStr } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const userStore = useUserStore()
const catalog = useCatalogStore()
const date = ref(todayStr())
const branch = ref<string>(userStore.branchId ?? '')
const { data, loading, run } = useAsync(() => api.reservations({ date: date.value, branch: branch.value || undefined, limit: 200 }))
const { data: avail, run: loadAvail } = useAsync(() => api.availability(branch.value, date.value))
const { busy, run: act } = useAction()
onMounted(async () => { await catalog.loadBranches(); run(); if (branch.value) loadAvail() })
watch([date, branch], () => { run(); if (branch.value) loadAvail() })
const BRANCH_OPTIONS = computed(() => [{ value: '', label: 'Todos los locales' }, ...catalog.locals.map((b) => ({ value: b._id, label: b.name }))])
const CH_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }))
const pending = computed(() => data.value?.items.filter((r) => r.status === 'pendiente') ?? [])
const open = ref(false)
const form = ref<Partial<Reservation>>({})
function edit(r?: Reservation) { form.value = r ? { ...r } : { branch: branch.value || catalog.locals[0]?._id, date: date.value, time: '19:00', people: 2, channel: 'telefono', status: 'confirmada' }; open.value = true }
async function save() { const r = await act(() => (form.value._id ? api.updateReservation(form.value._id, form.value) : api.createReservation(form.value)), 'Reserva guardada'); if (r) { open.value = false; run(); if (branch.value) loadAvail() } }
async function setStatus(r: Reservation, status: string) { const x = await act(() => api.updateReservation(r._id, { status }), 'Reserva actualizada'); if (x) { run(); if (branch.value) loadAvail() } }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Atención</span><h1>Reservas · {{ dateFull(date) }}</h1></div><div class="actions"><button class="btn sm" @click="date = addDaysStr(date, -1)"><i class="fa-solid fa-chevron-left" /></button><BaseDatePicker v-model="date" :clearable="false" /><button class="btn sm" @click="date = addDaysStr(date, 1)"><i class="fa-solid fa-chevron-right" /></button><BaseSelect v-if="!userStore.is('local')" v-model="branch" :options="BRANCH_OPTIONS" :searchable="false" style="min-width:200px" /><button class="btn primary" @click="edit()"><i class="fa-solid fa-plus" /> Nueva reserva</button></div></div>
    <PageIntro id="reservas" icon="fa-calendar-check"><p>Las reservas entran por WhatsApp (agente o persona), por la tienda en línea o por teléfono. Con más de una hora de anticipación se confirman solas si hay cupo; las <strong>mesas privadas</strong> y las reservas dentro de la hora quedan <strong>por confirmar</strong> para que el administrador del local decida.</p></PageIntro>
    <div v-if="pending.length" class="alert-box warn" style="margin-bottom:1rem"><i class="fa-solid fa-hourglass-half" /> {{ pending.length }} reserva(s) esperan confirmación del local.</div>
    <div class="cols">
      <div style="flex:2 1 520px">
        <SkeletonTable v-if="loading && !data" :cols="6" />
        <EmptyState v-else-if="!data?.items.length" icon="fa-calendar-xmark" text="Sin reservas para este día." />
        <div v-else class="table-wrap"><table class="table"><thead><tr><th>Hora</th><th>Nombre</th><th>Local</th><th class="num">Pers.</th><th>Canal</th><th>Estado</th><th></th></tr></thead><tbody>
          <tr v-for="r in data.items" :key="r._id" :class="{ 'row-amarillo': r.status === 'pendiente' }"><td><strong>{{ r.time }}</strong></td><td>{{ r.name }}<span class="hint" style="display:block">{{ r.phone }} {{ r.notes ? `· ${r.notes}` : '' }}</span></td><td>{{ r.branchName }}</td><td class="num">{{ r.people }}</td><td class="small">{{ CHANNEL_LABELS[r.channel] ?? r.channel }}</td><td><StatusBadge :map="RESERVATION_STATUS" :value="r.status" /></td><td class="actions"><button v-if="r.status === 'pendiente'" class="btn sm accent" :disabled="busy" @click="setStatus(r, 'confirmada')"><i class="fa-solid fa-check" /> Confirmar</button><button v-if="r.status === 'confirmada'" class="btn sm" :disabled="busy" @click="setStatus(r, 'sentada')">Llegó</button><button v-if="r.status === 'confirmada'" class="btn sm ghost" :disabled="busy" @click="setStatus(r, 'no_show')">No llegó</button><button v-if="['pendiente', 'confirmada'].includes(r.status)" class="btn sm ghost" :disabled="busy" @click="setStatus(r, 'cancelada')">Cancelar</button><button class="btn sm" @click="edit(r)"><i class="fa-solid fa-pen" /></button></td></tr>
        </tbody></table></div>
      </div>
      <div v-if="avail && branch" class="card" style="flex:1 1 260px"><div class="card-head"><h3>Cupo por hora · {{ avail.branch.name }}</h3></div><p class="hint">Capacidad {{ avail.branch.capacity }} personas · {{ avail.branch.hours }}</p><table class="table" style="margin-top:0.5rem"><tbody><tr v-for="s in avail.slots" :key="s.time"><td>{{ s.time }}</td><td><div class="progress" :class="{ warn: s.free < avail.branch.capacity * 0.3, danger: !s.free }"><span :style="{ width: `${avail.branch.capacity ? (s.used / avail.branch.capacity) * 100 : 0}%` }" /></div></td><td class="num small">{{ s.free }} libres</td></tr></tbody></table></div>
    </div>
    <BaseModal :open="open" :title="form._id ? `Reserva ${form.number}` : 'Nueva reserva'" @close="open = false">
      <div class="form-row form-row-2"><div class="field"><label>Local</label><BaseSelect v-model="form.branch" :options="BRANCH_OPTIONS.slice(1)" :searchable="false" /></div><div class="field"><label>Fecha</label><BaseDatePicker v-model="form.date" :clearable="false" /></div><div class="field"><label>Hora</label><input v-model="form.time" class="input" type="time" /></div><div class="field"><label>Personas</label><input v-model.number="form.people" class="input" type="number" min="1" /></div><div class="field"><label>Nombre</label><input v-model="form.name" class="input" /></div><div class="field"><label>Teléfono</label><input v-model="form.phone" class="input" /></div><div class="field"><label>Canal</label><BaseSelect v-model="form.channel" :options="CH_OPTIONS" :searchable="false" /></div><div class="field"><label>Estado</label><BaseSelect v-model="form.status" :options="Object.entries(RESERVATION_STATUS).map(([value, v]) => ({ value, label: v.label }))" :searchable="false" /></div><div class="field full"><label>Notas (privado, cumpleaños, etc.)</label><input v-model="form.notes" class="input" /></div></div>
      <template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !form.name || !form.branch || !form.time" @click="save">Guardar</button></template>
    </BaseModal>
  </div>
</template>
