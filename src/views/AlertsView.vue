<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useConfirmStore } from '@/stores/confirm'
import type { AlertItem } from '@/types'
import { ALERT_TYPE_LABELS, dateTime } from '@/utils/format'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const router = useRouter()
const confirm = useConfirmStore()
const status = ref<'abierta' | 'atendida,descartada'>('abierta')
const { data, loading, run } = useAsync(() => api.alerts({ status: status.value, limit: 300 }))
const { run: act } = useAction()
onMounted(run)
const ROUTE: Record<string, (id: string) => string> = { InternalOrder: (id) => `/pedidos/${id}`, ProductionPlan: (id) => `/produccion/${id}`, Reservation: () => '/reservas', Conversation: () => '/whatsapp', Review: () => '/resenas' }
function open(a: AlertItem) { const f = ROUTE[a.refType]; if (f) router.push(f(a.refId ?? '')); else if (a.type === 'stock_critico') router.push('/inventario'); else if (a.type === 'ventas_sin_cerrar') router.push('/ventas'); else if (a.type === 'pedido_sin_enviar') router.push('/pedidos') }
async function ack(a: AlertItem, action: 'atender' | 'descartar') {
  const note = await confirm.ask({ title: action === 'atender' ? 'Marcar como atendida' : 'Descartar alerta', message: a.title, requireNote: true, notePlaceholder: '¿Qué se hizo? (obligatorio)', confirmLabel: action === 'atender' ? 'Atendida' : 'Descartar' })
  if (!note) return
  await act(() => api.resolveAlert(a._id, action, note), 'Alerta actualizada'); run()
}
const sevCls = (s: string) => (s === 'critical' ? 'danger' : s === 'warning' ? 'warn' : 'info')
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Seguimiento</span><h1>Alertas</h1></div><div class="tabs" style="margin:0;border:none"><button :class="{ active: status === 'abierta' }" @click="status = 'abierta'; run()">Abiertas</button><button :class="{ active: status !== 'abierta' }" @click="status = 'atendida,descartada'; run()">Historial</button></div></div>
    <BaseSpinner v-if="loading && !data" />
    <EmptyState v-else-if="!data?.items.length" icon="fa-bell-slash" text="Sin alertas. Todo en orden." />
    <div v-else class="stack">
      <div v-for="a in data.items" :key="a._id" class="card alert-card" :class="sevCls(a.severity)">
        <div class="alert-main" @click="open(a)">
          <div class="row" style="gap:0.4rem"><span class="badge" :class="sevCls(a.severity)">{{ ALERT_TYPE_LABELS[a.type] ?? a.type }}</span><span v-if="a.branchName" class="badge">{{ a.branchName }}</span><span class="muted small">{{ dateTime(a.createdAt) }}</span></div>
          <h3>{{ a.title }}</h3>
          <p class="small">{{ a.body }}</p>
          <p v-if="a.status !== 'abierta'" class="hint">{{ a.status === 'atendida' ? 'Atendida' : 'Descartada' }} por {{ a.resolvedBy }}: {{ a.note }}</p>
        </div>
        <div v-if="a.status === 'abierta'" class="actions no-print"><button class="btn sm accent" @click="ack(a, 'atender')"><i class="fa-solid fa-check" /> Atendida</button><button class="btn sm ghost" @click="ack(a, 'descartar')">Descartar</button></div>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.alert-card { display: flex; gap: 1rem; align-items: flex-start; border-left: 5px solid var(--gray-300); flex-wrap: wrap; &.danger { border-left-color: var(--red-500); } &.warn { border-left-color: var(--amber-500); } &.info { border-left-color: var(--blue-500); } }
.alert-main { flex: 1; min-width: 240px; cursor: pointer; display: flex; flex-direction: column; gap: 0.3rem; }
</style>
