<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import type { Branch } from '@/types'
import { BRANCH_TYPE_LABELS, money } from '@/utils/format'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseCheck from '@/components/ui/BaseCheck.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const userStore = useUserStore()
const { data, loading, run } = useAsync(() => api.branches({ active: 'all' }))
const { busy, run: act } = useAction()
onMounted(run)
const TYPE_OPTIONS = Object.entries(BRANCH_TYPE_LABELS).map(([value, label]) => ({ value, label }))
const open = ref(false)
const form = ref<Partial<Branch>>({})
const privateText = ref('')
function edit(b?: Branch) { form.value = b ? { ...b } : { type: 'local', hours: '12:00-22:00', capacity: 80, pickupEnabled: true, deliveryEnabled: true, deliveryFee: 2.5, minOrder: 0, prepMinutes: 25, active: true, order: (data.value?.items.length ?? 0) + 1 }; privateText.value = (form.value.privateTables ?? []).map((t) => `${t.name}:${t.capacity}`).join(', '); open.value = true }
async function save() {
  const privateTables = privateText.value.split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [name, cap] = s.split(':'); return { name: name!.trim(), capacity: Number(cap) || 10 } })
  const body = { ...form.value, privateTables }
  const r = await act(() => (form.value._id ? api.updateBranch(form.value._id, body) : api.createBranch(body)), 'Local guardado')
  if (r) { open.value = false; run() }
}
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Catálogos</span><h1>Locales</h1></div><button v-if="userStore.is('admin', 'gerencia')" class="btn primary" @click="edit()"><i class="fa-solid fa-plus" /> Nuevo local</button></div>
    <PageIntro id="locales" icon="fa-map-location-dot"><p>Cada restaurante es un local; además hay un <strong>centro de producción</strong> y una <strong>bodega central</strong>. Aquí defines lo que la tienda en línea muestra de cada local: si hace retiro o domicilio, el costo de envío, los minutos de preparación, el horario y las mesas privadas que requieren confirmación.</p></PageIntro>
    <SkeletonTable v-if="loading && !data" :cols="6" />
    <div v-else class="table-wrap"><table class="table"><thead><tr><th>Local</th><th>Tipo</th><th>Ciudad</th><th>Horario</th><th>Tienda</th><th class="num">Envío</th><th class="num">Capacidad</th><th>Estado</th><th></th></tr></thead><tbody>
      <tr v-for="b in data?.items" :key="b._id" :class="{ muted: !b.active }"><td><strong>{{ b.name }}</strong><span class="hint" style="display:block">{{ b.code }} · {{ b.address }}</span></td><td><span class="badge" :class="b.type === 'local' ? 'info' : ''">{{ BRANCH_TYPE_LABELS[b.type] }}</span>{{ b.franchise ? ' 🏷️' : '' }}</td><td>{{ b.city }}</td><td>{{ b.hours }}</td><td><template v-if="b.type === 'local'"><span v-if="b.pickupEnabled" class="badge ok">retiro</span> <span v-if="b.deliveryEnabled" class="badge sky">domicilio</span><span v-if="!b.pickupEnabled && !b.deliveryEnabled" class="badge danger">fuera de la tienda</span></template></td><td class="num">{{ b.type === 'local' ? money(b.deliveryFee) : '—' }}</td><td class="num">{{ b.capacity || '—' }}</td><td><span class="badge" :class="b.active ? 'ok' : 'danger'">{{ b.active ? 'activo' : 'inactivo' }}</span></td><td><button v-if="userStore.is('admin', 'gerencia')" class="btn sm" @click="edit(b)"><i class="fa-solid fa-pen" /></button></td></tr>
    </tbody></table></div>
    <BaseModal :open="open" :title="form._id ? form.name ?? '' : 'Nuevo local'" wide @close="open = false">
      <div class="form-row form-row-3"><div class="field"><label>Código</label><input v-model="form.code" class="input" placeholder="GYE-URD" /></div><div class="field" style="flex-basis:calc(66% - 0.5rem)"><label>Nombre</label><input v-model="form.name" class="input" /></div><div class="field"><label>Tipo</label><BaseSelect v-model="form.type" :options="TYPE_OPTIONS" :searchable="false" /></div><div class="field"><label>Ciudad</label><input v-model="form.city" class="input" /></div><div class="field"><label>Orden</label><input v-model.number="form.order" class="input" type="number" /></div><div class="field full"><label>Dirección</label><input v-model="form.address" class="input" /></div><div class="field"><label>Teléfono</label><input v-model="form.phone" class="input" /></div><div class="field"><label>WhatsApp (tienda)</label><input v-model="form.whatsapp" class="input" placeholder="+5939…" /></div><div class="field"><label>Horario</label><input v-model="form.hours" class="input" placeholder="12:00-22:00" /></div><div class="field full"><label>Link de Google Maps</label><input v-model="form.mapsUrl" class="input" /></div></div>
      <template v-if="form.type === 'local'">
        <p class="section-label" style="margin-top:1rem">Tienda en línea</p>
        <div class="form-row form-row-3"><BaseCheck v-model="form.pickupEnabled" label="Retiro en local" toggle /><BaseCheck v-model="form.deliveryEnabled" label="Envío a domicilio" toggle /><BaseCheck v-model="form.franchise" label="Franquicia" toggle /><div class="field"><label>Costo de envío ($)</label><input v-model.number="form.deliveryFee" class="input" type="number" step="0.25" min="0" /></div><div class="field"><label>Pedido mínimo ($)</label><input v-model.number="form.minOrder" class="input" type="number" step="1" min="0" /></div><div class="field"><label>Minutos de preparación</label><input v-model.number="form.prepMinutes" class="input" type="number" min="5" /></div></div>
        <p class="section-label" style="margin-top:1rem">Reservas</p>
        <div class="form-row form-row-2"><div class="field"><label>Capacidad (personas)</label><input v-model.number="form.capacity" class="input" type="number" min="0" /></div><div class="field"><label>Mesas privadas (nombre:capacidad, separadas por coma)</label><input v-model="privateText" class="input" placeholder="Privado terraza:14, Salón:20" /></div></div>
      </template>
      <div style="margin-top:0.75rem"><BaseCheck v-model="form.active" label="Local activo" toggle /></div>
      <template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !form.code || !form.name" @click="save">Guardar</button></template>
    </BaseModal>
  </div>
</template>
