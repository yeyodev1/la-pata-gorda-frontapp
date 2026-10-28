<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import { useCatalogStore } from '@/stores/catalog'
import type { Product, ProductOption } from '@/types'
import { money, qty } from '@/utils/format'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseCheck from '@/components/ui/BaseCheck.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SearchBox from '@/components/ui/SearchBox.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import ImageUpload from '@/components/ui/ImageUpload.vue'

const userStore = useUserStore()
const catalog = useCatalogStore()
const { data, loading, run } = useAsync(() => api.products({ active: 'all' }))
const { busy, run: act } = useAction()
const search = ref('')
const cat = ref('')
onMounted(async () => { await Promise.all([run(), catalog.loadProducts(true), catalog.loadIngredients()]) })
const canEdit = computed(() => userStore.can('produccion', 'contabilidad'))
const CAT_OPTIONS = computed(() => [{ value: '', label: 'Todas las categorías' }, ...catalog.categories.map((c) => ({ value: c._id, label: c.name }))])
const ING_OPTIONS = computed(() => catalog.ingredients.map((i) => ({ value: i._id, label: `${i.name} (${i.unit})` })))
const catName = (p: Product) => (typeof p.category === 'string' ? catalog.categories.find((c) => c._id === p.category)?.name : p.category.name) ?? ''
const catId = (p: Product) => (typeof p.category === 'string' ? p.category : p.category._id)
const filtered = computed(() => (data.value?.items ?? []).filter((p) => (!cat.value || catId(p) === cat.value) && (!search.value || p.name.toLowerCase().includes(search.value.toLowerCase()))))
const ingName = (l: Product['recipe'][number]) => (typeof l.ingredient === 'string' ? catalog.ingredientById(l.ingredient)?.name : l.ingredient.name) ?? '?'
const ingUnit = (l: Product['recipe'][number]) => (typeof l.ingredient === 'string' ? catalog.ingredientById(l.ingredient)?.unit : l.ingredient.unit) ?? ''
const recipeCost = (p: Product) => p.recipe.reduce((a, l) => a + l.qty * ((typeof l.ingredient === 'string' ? catalog.ingredientById(l.ingredient)?.cost : l.ingredient.cost) ?? 0), 0)
const open = ref(false)
const form = ref<{ _id?: string; code: string; name: string; category: string; description: string; price: number; image: string; featured: boolean; online: boolean; active: boolean; recipe: { ingredient: string; qty: number }[]; options: ProductOption[] }>({ code: '', name: '', category: '', description: '', price: 0, image: '', featured: false, online: true, active: true, recipe: [], options: [] })
function edit(p?: Product) { form.value = p ? { _id: p._id, code: p.code, name: p.name, category: catId(p), description: p.description, price: p.price, image: p.image, featured: p.featured, online: p.online, active: p.active, recipe: p.recipe.map((l) => ({ ingredient: typeof l.ingredient === 'string' ? l.ingredient : l.ingredient._id, qty: l.qty })), options: JSON.parse(JSON.stringify(p.options ?? [])) } : { code: '', name: '', category: catalog.categories[0]?._id ?? '', description: '', price: 0, image: '', featured: false, online: true, active: true, recipe: [], options: [] }; open.value = true }
async function save() { const r = await act(() => (form.value._id ? api.updateProduct(form.value._id, form.value) : api.createProduct(form.value)), 'Plato guardado'); if (r) { open.value = false; run(); catalog.loadProducts(true) } }
function addChoice(o: ProductOption) { o.choices.push({ label: '', price: 0 }) }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Catálogos</span><h1>Menú y recetas</h1></div><div class="actions"><SearchBox v-model="search" placeholder="Buscar plato…" /><BaseSelect v-model="cat" :options="CAT_OPTIONS" :searchable="false" style="min-width:200px" /><button v-if="canEdit" class="btn primary" @click="edit()"><i class="fa-solid fa-plus" /> Nuevo plato</button></div></div>
    <PageIntro id="menu" icon="fa-utensils"><p>La carta que ve el cliente en la tienda en línea (nombre, foto, precio, opciones como la base del chopsué) y, por dentro, la <strong>receta</strong>: cuánto insumo consume cada plato vendido. Con la receta el sistema descuenta inventario y calcula qué debe producir el centro de producción.</p></PageIntro>
    <SkeletonTable v-if="loading && !data" :cols="5" />
    <div v-else class="cards">
      <div v-for="p in filtered" :key="p._id" class="card pcard" :class="{ muted: !p.active }">
        <img v-if="p.image" :src="p.image" alt="" loading="lazy" /><div v-else class="noimg"><i class="fa-solid fa-utensils" /></div>
        <div class="pbody"><div class="row" style="gap:0.3rem"><span class="badge">{{ catName(p) }}</span><span v-if="p.featured" class="badge warn">favorito</span><span v-if="!p.online" class="badge danger">fuera de tienda</span><span v-if="!p.active" class="badge danger">inactivo</span></div><h3>{{ p.name }}</h3><p class="small muted clamp">{{ p.description }}</p>
          <div class="row" style="justify-content:space-between;margin-top:auto"><strong>{{ money(p.price) }}</strong><span class="hint" :title="p.recipe.map((l) => `${ingName(l)} ${qty(l.qty, ingUnit(l))}`).join(', ')">{{ p.recipe.length ? `receta: ${p.recipe.length} insumos · costo ${money(recipeCost(p))}` : 'sin receta' }}</span></div>
          <div v-if="p.options.length" class="hint">Opciones: {{ p.options.map((o) => o.name).join(', ') }}</div>
          <button v-if="canEdit" class="btn sm" style="margin-top:0.5rem;align-self:flex-start" @click="edit(p)"><i class="fa-solid fa-pen" /> Editar</button></div>
      </div>
    </div>
    <BaseModal :open="open" :title="form._id ? form.name : 'Nuevo plato'" wide @close="open = false">
      <div class="form-row form-row-3"><div class="field" style="flex-basis:calc(66% - 0.5rem)"><label>Nombre</label><input v-model="form.name" class="input" /></div><div class="field"><label>Precio ($)</label><input v-model.number="form.price" class="input" type="number" step="0.05" min="0" /></div><div class="field"><label>Categoría</label><BaseSelect v-model="form.category" :options="CAT_OPTIONS.slice(1)" /></div><div class="field"><label>Código</label><input v-model="form.code" class="input" /></div><div class="field"><label>Foto</label><ImageUpload v-model="form.image" folder="menu" label="Subir foto del plato" compact /></div><div class="field full"><label>Descripción</label><textarea v-model="form.description" class="input" /></div></div>
      <div class="row" style="margin:0.5rem 0"><BaseCheck v-model="form.online" label="Visible en la tienda en línea" toggle /><BaseCheck v-model="form.featured" label="Favorito (destacado)" toggle /><BaseCheck v-model="form.active" label="Activo" toggle /></div>
      <p class="section-label" style="margin-top:1rem">Opciones que elige el cliente</p>
      <div v-for="(o, i) in form.options" :key="i" class="card" style="padding:0.7rem;margin-bottom:0.5rem"><div class="row"><input v-model="o.name" class="input" placeholder="Nombre (Base, Término…)" style="flex:2" /><label class="check small"><input v-model="o.required" type="checkbox" /> Obligatoria</label><div class="field" style="flex-direction:row;align-items:center;gap:0.3rem"><label style="margin:0">Máx.</label><input v-model.number="o.max" class="input" type="number" min="1" style="width:70px" /></div><button class="btn sm danger" @click="form.options.splice(i, 1)"><i class="fa-solid fa-trash" /></button></div><div v-for="(c, j) in o.choices" :key="j" class="row" style="margin-top:0.35rem"><input v-model="c.label" class="input" placeholder="Opción (Arroz, Cocolón…)" style="flex:2" /><input v-model.number="c.price" class="input" type="number" step="0.05" placeholder="+ $" style="width:110px" /><button class="btn sm ghost" @click="o.choices.splice(j, 1)"><i class="fa-solid fa-xmark" /></button></div><button class="btn sm ghost" style="margin-top:0.35rem" @click="addChoice(o)"><i class="fa-solid fa-plus" /> Opción</button></div>
      <button class="btn sm" @click="form.options.push({ name: '', required: true, max: 1, choices: [{ label: '', price: 0 }] })"><i class="fa-solid fa-plus" /> Agregar grupo de opciones</button>
      <p class="section-label" style="margin-top:1rem">Receta (consumo por plato vendido)</p>
      <div v-for="(l, i) in form.recipe" :key="i" class="row" style="margin-bottom:0.35rem"><BaseSelect v-model="l.ingredient" :options="ING_OPTIONS" style="flex:2;min-width:220px" /><input v-model.number="l.qty" class="input" type="number" step="any" min="0" style="width:110px" /><button class="btn sm ghost" @click="form.recipe.splice(i, 1)"><i class="fa-solid fa-xmark" /></button></div>
      <button class="btn sm" @click="form.recipe.push({ ingredient: '', qty: 0 })"><i class="fa-solid fa-plus" /> Insumo</button>
      <template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !form.name || !form.category" @click="save">Guardar</button></template>
    </BaseModal>
  </div>
</template>
<style scoped lang="scss">
.cards { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.pcard { flex: 1 1 300px; max-width: 420px; padding: 0; overflow: hidden; display: flex; flex-direction: column; img { width: 100%; aspect-ratio: 16/9; object-fit: cover; } .noimg { aspect-ratio: 16/9; background: var(--gray-100); display: flex; align-items: center; justify-content: center; color: var(--gray-300); font-size: 2rem; } }
.pbody { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.3rem; flex: 1; h3 { font-size: 1rem; } }
.clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>
