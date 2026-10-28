<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import type { Ingredient } from '@/types'
import { money, GROUP_LABELS, UNIT_LABELS, qty } from '@/utils/format'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseCheck from '@/components/ui/BaseCheck.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const userStore = useUserStore()
const catalog = useCatalogStore()
const { data, loading, run } = useAsync(() => api.ingredients({ active: 'all' }))
const { busy, run: act } = useAction()
onMounted(() => { run(); catalog.loadSuppliers(); catalog.loadIngredients() })
const canEdit = computed(() => userStore.can('produccion', 'bodega', 'compras', 'contabilidad'))
const GROUP_OPTIONS = Object.entries(GROUP_LABELS).map(([value, label]) => ({ value, label }))
const UNIT_OPTIONS = Object.entries(UNIT_LABELS).map(([value, label]) => ({ value, label }))
const SUP_OPTIONS = computed(() => [{ value: '', label: 'Sin proveedor' }, ...catalog.suppliers.map((s) => ({ value: s._id, label: s.name }))])
const ING_OPTIONS = computed(() => catalog.ingredients.filter((i) => i._id !== form.value._id).map((i) => ({ value: i._id, label: `${i.name} (${i.unit})` })))
const groups = computed(() => { const m = new Map<string, Ingredient[]>(); for (const i of data.value?.items ?? []) m.set(i.group, [...(m.get(i.group) ?? []), i]); return [...m.entries()] })
const open = ref(false)
const form = ref<{ _id?: string; code: string; name: string; group: string; unit: string; cost: number; producedInHouse: boolean; minStock: number; shelfLifeDays: number; supplier: string; active: boolean; recipe: { ingredient: string; qty: number }[] }>({ code: '', name: '', group: 'otros', unit: 'un', cost: 0, producedInHouse: false, minStock: 0, shelfLifeDays: 0, supplier: '', active: true, recipe: [] })
function edit(i?: Ingredient) { form.value = i ? { _id: i._id, code: i.code, name: i.name, group: i.group, unit: i.unit, cost: i.cost, producedInHouse: i.producedInHouse, minStock: i.minStock, shelfLifeDays: i.shelfLifeDays, supplier: i.supplier ? (typeof i.supplier === 'string' ? i.supplier : i.supplier._id) : '', active: i.active, recipe: i.recipe.map((l) => ({ ingredient: typeof l.ingredient === 'string' ? l.ingredient : l.ingredient._id, qty: l.qty })) } : { code: '', name: '', group: 'otros', unit: 'un', cost: 0, producedInHouse: false, minStock: 0, shelfLifeDays: 0, supplier: '', active: true, recipe: [] }; open.value = true }
async function save() { const r = await act(() => (form.value._id ? api.updateIngredient(form.value._id, form.value) : api.createIngredient(form.value)), 'Insumo guardado'); if (r) { open.value = false; run(); catalog.loadIngredients(true) } }
const supName = (i: Ingredient) => (i.supplier && typeof i.supplier !== 'string' ? i.supplier.name : '—')
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Catálogos</span><h1>Insumos y preparados</h1></div><button v-if="canEdit" class="btn primary" @click="edit()"><i class="fa-solid fa-plus" /> Nuevo insumo</button></div>
    <PageIntro id="insumos" icon="fa-shrimp"><p>Todo lo que se controla en inventario. Los <strong>preparados</strong> (cangrejo cocinado, salsas, cocolón…) los hace el centro de producción y tienen su propia receta de materia prima; el resto se compra a proveedores. El <strong>mínimo</strong> dispara la alerta de stock bajo.</p></PageIntro>
    <SkeletonTable v-if="loading && !data" :cols="6" />
    <template v-else>
      <div v-for="[g, items] in groups" :key="g" class="table-wrap" style="margin-bottom:1rem"><table class="table"><thead><tr><th>{{ GROUP_LABELS[g] ?? g }}</th><th>Unidad</th><th class="num">Costo</th><th class="num">Mínimo</th><th>Proveedor / receta</th><th>Estado</th><th></th></tr></thead><tbody>
        <tr v-for="i in items" :key="i._id" :class="{ muted: !i.active }"><td><strong>{{ i.name }}</strong> <span class="hint">{{ i.code }}</span></td><td>{{ UNIT_LABELS[i.unit] ?? i.unit }}</td><td class="num">{{ money(i.cost) }}</td><td class="num">{{ i.minStock ? qty(i.minStock) : '—' }}</td><td class="wrap small">{{ i.producedInHouse ? `Producción: ${i.recipe.map((l) => `${typeof l.ingredient === 'string' ? catalog.ingredientById(l.ingredient)?.name : l.ingredient.name} ${qty(l.qty)}`).join(', ') || 'sin receta'}` : supName(i) }}</td><td><span v-if="i.producedInHouse" class="badge sky">preparado</span><span v-else class="badge">compra</span></td><td><button v-if="canEdit" class="btn sm" @click="edit(i)"><i class="fa-solid fa-pen" /></button></td></tr>
      </tbody></table></div>
    </template>
    <BaseModal :open="open" :title="form._id ? form.name : 'Nuevo insumo'" wide @close="open = false">
      <div class="form-row form-row-3"><div class="field" style="flex-basis:calc(66% - 0.5rem)"><label>Nombre</label><input v-model="form.name" class="input" /></div><div class="field"><label>Código</label><input v-model="form.code" class="input" /></div><div class="field"><label>Grupo</label><BaseSelect v-model="form.group" :options="GROUP_OPTIONS" :searchable="false" /></div><div class="field"><label>Unidad</label><BaseSelect v-model="form.unit" :options="UNIT_OPTIONS" :searchable="false" /></div><div class="field"><label>Costo por unidad ($)</label><input v-model.number="form.cost" class="input" type="number" step="0.01" min="0" /></div><div class="field"><label>Mínimo por local</label><input v-model.number="form.minStock" class="input" type="number" step="any" min="0" /></div><div class="field"><label>Vida útil (días)</label><input v-model.number="form.shelfLifeDays" class="input" type="number" min="0" /></div><div class="field"><label>Proveedor</label><BaseSelect v-model="form.supplier" :options="SUP_OPTIONS" /></div></div>
      <div class="row" style="margin:0.5rem 0"><BaseCheck v-model="form.producedInHouse" label="Lo produce el centro de producción" toggle /><BaseCheck v-model="form.active" label="Activo" toggle /></div>
      <template v-if="form.producedInHouse"><p class="section-label" style="margin-top:0.75rem">Receta por 1 {{ UNIT_LABELS[form.unit] }}</p><div v-for="(l, i) in form.recipe" :key="i" class="row" style="margin-bottom:0.35rem"><BaseSelect v-model="l.ingredient" :options="ING_OPTIONS" style="flex:2;min-width:220px" /><input v-model.number="l.qty" class="input" type="number" step="any" min="0" style="width:110px" /><button class="btn sm ghost" @click="form.recipe.splice(i, 1)"><i class="fa-solid fa-xmark" /></button></div><button class="btn sm" @click="form.recipe.push({ ingredient: '', qty: 0 })"><i class="fa-solid fa-plus" /> Materia prima</button></template>
      <template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !form.name" @click="save">Guardar</button></template>
    </BaseModal>
  </div>
</template>
