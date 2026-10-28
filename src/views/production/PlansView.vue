<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { PLAN_STATUS, dateShort, todayStr, addDaysStr } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseDatePicker from '@/components/ui/BaseDatePicker.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const router = useRouter()
const userStore = useUserStore()
const date = ref(addDaysStr(todayStr(), 1))
const { data, loading, run } = useAsync(() => api.plans({ limit: 30 }))
const { busy, run: act } = useAction()
onMounted(run)
async function build() { const r = await act(() => api.buildPlan(date.value), 'Plan armado con los pedidos de los locales'); if (r) router.push(`/produccion/${r.plan._id}`) }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Centro de producción</span><h1>Plan de producción</h1></div><div v-if="userStore.can('produccion')" class="actions"><BaseDatePicker v-model="date" :clearable="false" /><button class="btn primary" :disabled="busy" @click="build"><i class="fa-solid fa-wand-magic-sparkles" /> Armar plan del día</button></div></div>
    <PageIntro id="planes" icon="fa-fire-burner"><p>El plan consolida los <strong>pedidos de todos los locales</strong> para una fecha, los compara con lo que ya hay en el centro de producción y dice cuánto preparar de cada cosa y qué materia prima hace falta en bodega. Si falta materia prima, compras recibe una alerta.</p></PageIntro>
    <SkeletonTable v-if="loading && !data" :cols="5" />
    <div v-else class="table-wrap"><table class="table"><thead><tr><th>Plan</th><th>Fecha</th><th>Estado</th><th class="num">Pedidos</th><th class="num">Preparados</th><th class="num">Faltantes</th><th>Creado por</th></tr></thead><tbody><tr v-for="p in data?.items" :key="p._id" class="clickable" @click="router.push(`/produccion/${p._id}`)"><td><strong>{{ p.number }}</strong></td><td>{{ dateShort(p.date) }}</td><td><StatusBadge :map="PLAN_STATUS" :value="p.status" /></td><td class="num">{{ p.orders.length }}</td><td class="num">{{ p.items.filter((i) => i.toProduce > 0).length }}</td><td class="num"><span v-if="p.rawNeeds.some((r) => r.shortage > 0)" class="badge danger">{{ p.rawNeeds.filter((r) => r.shortage > 0).length }}</span><span v-else class="muted">0</span></td><td class="muted small">{{ p.createdBy }}</td></tr></tbody></table></div>
  </div>
</template>
