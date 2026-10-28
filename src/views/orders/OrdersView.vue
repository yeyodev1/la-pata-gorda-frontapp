<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import { ORDER_STATUS, dateShort, todayStr, addDaysStr, dateTime } from '@/utils/format'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const catalog = useCatalogStore()
const status = ref<string>((route.query.status as string) ?? '')
const branch = ref<string>(userStore.branchId ?? '')
const deliveryDate = ref(addDaysStr(todayStr(), 1))
const { data, loading, run } = useAsync(() => api.orders({ status: status.value || undefined, branch: branch.value || undefined, limit: 100 }))
const { busy, run: act } = useAction()
onMounted(() => { catalog.loadBranches(); run() })
watch([status, branch], run)
const STATUS_OPTIONS = [{ value: '', label: 'Todos los estados' }, ...Object.entries(ORDER_STATUS).map(([value, v]) => ({ value, label: v.label }))]
const BRANCH_OPTIONS = computed(() => [{ value: '', label: 'Todos los locales' }, ...catalog.locals.map((b) => ({ value: b._id, label: b.name }))])
const isLocal = computed(() => userStore.is('local'))
async function newOrder() {
  const r = await act(() => api.draftOrder(branch.value || undefined, deliveryDate.value))
  if (r) router.push(`/pedidos/${r.order._id}`)
}
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">{{ isLocal ? 'Mi local' : 'Producción' }}</span><h1>Pedidos a producción</h1></div><div class="actions"><template v-if="userStore.can('local')"><BaseSelect v-if="!isLocal" v-model="branch" :options="BRANCH_OPTIONS.slice(1)" placeholder="Local…" style="min-width:200px" /><BaseDatePicker v-model="deliveryDate" :min="todayStr()" :clearable="false" /><button class="btn primary" :disabled="busy || (!isLocal && !branch)" @click="newOrder"><i class="fa-solid fa-plus" /> Pedido con sugerencia</button></template></div></div>
    <PageIntro id="pedidos" icon="fa-clipboard-list"><p>Cada local pide al centro de producción lo que necesita para el día siguiente. El sistema trae la <strong>sugerencia</strong> (promedio de ventas de ese día de la semana × receta + seguridad − lo que ya tiene). Lo que supere el umbral se marca y necesita justificación; producción lo ve antes de aprobar. Flujo: borrador → enviado → aprobado → despachado → recibido.</p></PageIntro>
    <div class="row" style="margin-bottom:0.75rem"><BaseSelect v-model="status" :options="STATUS_OPTIONS" :searchable="false" style="min-width:200px" /><BaseSelect v-if="!isLocal" v-model="branch" :options="BRANCH_OPTIONS" :searchable="false" style="min-width:220px" /></div>
    <SkeletonTable v-if="loading && !data" :cols="6" />
    <EmptyState v-else-if="!data?.items.length" icon="fa-clipboard" text="No hay pedidos con ese filtro." />
    <div v-else class="table-wrap"><table class="table"><thead><tr><th>Pedido</th><th>Local</th><th>Para</th><th>Estado</th><th class="num">Insumos</th><th>Sobre lo sugerido</th><th>Enviado</th></tr></thead><tbody>
      <tr v-for="o in data.items" :key="o._id" class="clickable" :class="{ 'row-amarillo': o.inflatedCount && o.status === 'enviado' }" @click="router.push(`/pedidos/${o._id}`)"><td><strong>{{ o.number }}</strong></td><td>{{ o.branchName }}</td><td>{{ dateShort(o.deliveryDate) }}</td><td><StatusBadge :map="ORDER_STATUS" :value="o.status" /></td><td class="num">{{ o.items.length }}</td><td><span v-if="o.inflatedCount" class="badge warn"><i class="fa-solid fa-arrow-trend-up" /> {{ o.inflatedCount }} línea(s)</span><span v-else class="muted">—</span></td><td class="muted small">{{ o.sentAt ? dateTime(o.sentAt) : '—' }}</td></tr>
    </tbody></table></div>
  </div>
</template>
