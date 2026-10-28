<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useConfirmStore } from '@/stores/confirm'
import { PLAN_STATUS, dateFull, qty } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseSpinner from '@/components/ui/BaseSpinner.vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const route = useRoute()
const userStore = useUserStore()
const confirm = useConfirmStore()
const id = route.params.id as string
const { data, loading, run } = useAsync(() => api.plan(id))
const { busy, run: act } = useAction()
onMounted(run)
const plan = computed(() => data.value?.plan)
const canProd = computed(() => userStore.can('produccion') && plan.value?.status !== 'cerrado')
const open = ref(false)
const prod = ref({ ingredient: '', name: '', qty: 0, note: '' })
function startProduce(ingredient: string, name: string, pending: number) { prod.value = { ingredient, name, qty: Math.max(0, pending), note: '' }; open.value = true }
async function produce() { const r = await act(() => api.produce(id, prod.value), 'Producción registrada'); if (r) { open.value = false; run() } }
async function rebuild() { const r = await act(() => api.buildPlan(plan.value!.date), 'Plan actualizado'); if (r) run() }
async function close() { const ok = await confirm.ask({ title: 'Cerrar plan', message: 'Ya no se registrará más producción para este día.', confirmLabel: 'Cerrar' }); if (!ok) return; const r = await act(() => api.closePlan(id, ''), 'Plan cerrado'); if (r) run() }
const pct = (i: { toProduce: number; produced: number }) => (i.toProduce ? Math.min(100, (i.produced / i.toProduce) * 100) : i.produced ? 100 : 0)
</script>
<template>
  <div class="page">
    <BaseSpinner v-if="loading && !plan" />
    <template v-else-if="plan">
      <div class="page-head"><div class="title"><span class="eyebrow"><RouterLink to="/produccion">Planes</RouterLink></span><h1>{{ plan.number }} <StatusBadge :map="PLAN_STATUS" :value="plan.status" /></h1><span class="hint">Para el {{ dateFull(plan.date) }} · {{ plan.orders.length }} pedidos de locales</span></div><div v-if="canProd" class="actions"><button v-if="plan.status === 'borrador'" class="btn" :disabled="busy" @click="rebuild"><i class="fa-solid fa-rotate" /> Rearmar con pedidos nuevos</button><button class="btn danger" :disabled="busy" @click="close">Cerrar plan</button></div></div>
      <div class="cols">
        <div class="card" style="flex:2 1 520px"><div class="card-head"><h2><i class="fa-solid fa-fire-burner" /> Qué producir</h2></div>
          <div class="table-wrap" style="box-shadow:none;border:none"><table class="table"><thead><tr><th>Preparado</th><th class="num">Piden</th><th class="num">Hay</th><th class="num">Producir</th><th style="min-width:140px">Avance</th><th></th></tr></thead><tbody>
            <tr v-for="i in plan.items" :key="i.ingredient" :class="{ 'row-verde': i.toProduce > 0 && i.produced >= i.toProduce }"><td><strong>{{ i.ingredientName }}</strong> <span class="hint">{{ i.unit }}</span></td><td class="num">{{ qty(i.required) }}</td><td class="num">{{ qty(i.stock) }}</td><td class="num"><strong>{{ qty(i.toProduce) }}</strong></td><td><div class="progress" :class="{ warn: pct(i) < 100 && pct(i) > 0 }"><span :style="{ width: `${pct(i)}%` }" /></div><span class="hint">{{ qty(i.produced) }} / {{ qty(i.toProduce) }}</span></td><td><button v-if="canProd && i.toProduce > 0" class="btn sm accent" @click="startProduce(i.ingredient, i.ingredientName, i.toProduce - i.produced)"><i class="fa-solid fa-plus" /> Producido</button><span v-else-if="!i.toProduce" class="hint">solo se reparte</span></td></tr>
          </tbody></table></div></div>
        <div class="card" style="flex:1 1 300px"><div class="card-head"><h2><i class="fa-solid fa-boxes-stacked" /> Materia prima (bodega)</h2></div>
          <p v-if="!plan.rawNeeds.length" class="muted">Nada que descontar.</p>
          <table v-else class="table"><thead><tr><th>Insumo</th><th class="num">Necesita</th><th class="num">Hay</th></tr></thead><tbody><tr v-for="r in plan.rawNeeds" :key="r.ingredient" :class="{ 'row-rojo': r.shortage > 0 }"><td>{{ r.ingredientName }} <span class="hint">{{ r.unit }}</span></td><td class="num">{{ qty(r.needed) }}</td><td class="num">{{ qty(r.stock) }}<span v-if="r.shortage > 0" class="badge danger" style="margin-left:0.3rem">faltan {{ qty(r.shortage) }}</span></td></tr></tbody></table>
          <RouterLink v-if="plan.rawNeeds.some((r) => r.shortage > 0) && userStore.can('compras')" to="/compras" class="btn sm" style="margin-top:0.75rem"><i class="fa-solid fa-cart-shopping" /> Ir a compras</RouterLink></div>
      </div>
      <BaseModal :open="open" :title="`Registrar producción · ${prod.name}`" @close="open = false"><div class="stack"><div class="field"><label>Cantidad producida</label><input v-model.number="prod.qty" class="input big" type="number" step="any" min="0" /></div><div class="field"><label>Nota</label><input v-model="prod.note" class="input" placeholder="Lote, hora, observación" /></div><p class="hint">Entra al inventario del centro de producción y descuenta la materia prima de su receta desde bodega.</p></div><template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !prod.qty" @click="produce">Registrar</button></template></BaseModal>
    </template>
  </div>
</template>
