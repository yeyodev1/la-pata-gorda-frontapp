<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import type { Supplier } from '@/types'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseCheck from '@/components/ui/BaseCheck.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const userStore = useUserStore()
const { data, loading, run } = useAsync(() => api.suppliers({ active: 'all' }))
const { busy, run: act } = useAction()
onMounted(run)
const open = ref(false)
const form = ref<Partial<Supplier> & { categoriesText?: string }>({})
function edit(s?: Supplier) { form.value = s ? { ...s, categoriesText: s.categories.join(', ') } : { active: true, creditDays: 0, categoriesText: '' }; open.value = true }
async function save() { const body = { ...form.value, categories: (form.value.categoriesText ?? '').split(',').map((x) => x.trim()).filter(Boolean) }; const r = await act(() => (form.value._id ? api.updateSupplier(form.value._id, body) : api.createSupplier(body)), 'Proveedor guardado'); if (r) { open.value = false; run() } }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Catálogos</span><h1>Proveedores</h1></div><button v-if="userStore.can('compras', 'bodega')" class="btn primary" @click="edit()"><i class="fa-solid fa-plus" /> Nuevo proveedor</button></div>
    <SkeletonTable v-if="loading && !data" :cols="5" />
    <div v-else class="table-wrap"><table class="table"><thead><tr><th>Proveedor</th><th>Contacto</th><th>Provee</th><th class="num">Crédito</th><th>Estado</th><th></th></tr></thead><tbody><tr v-for="s in data?.items" :key="s._id" :class="{ muted: !s.active }"><td><strong>{{ s.name }}</strong></td><td>{{ s.contact }} {{ s.phone }} {{ s.email }}</td><td><span v-for="c in s.categories" :key="c" class="badge" style="margin-right:0.2rem">{{ c }}</span></td><td class="num">{{ s.creditDays }} días</td><td><span class="badge" :class="s.active ? 'ok' : 'danger'">{{ s.active ? 'activo' : 'inactivo' }}</span></td><td><button v-if="userStore.can('compras', 'bodega')" class="btn sm" @click="edit(s)"><i class="fa-solid fa-pen" /></button></td></tr></tbody></table></div>
    <BaseModal :open="open" :title="form._id ? form.name ?? '' : 'Nuevo proveedor'" @close="open = false">
      <div class="form-row form-row-2"><div class="field full"><label>Nombre</label><input v-model="form.name" class="input" /></div><div class="field"><label>Contacto</label><input v-model="form.contact" class="input" /></div><div class="field"><label>Teléfono</label><input v-model="form.phone" class="input" /></div><div class="field"><label>Correo</label><input v-model="form.email" class="input" type="email" /></div><div class="field"><label>Días de crédito</label><input v-model.number="form.creditDays" class="input" type="number" min="0" /></div><div class="field full"><label>Qué provee (separado por coma)</label><input v-model="form.categoriesText" class="input" placeholder="mariscos, granos" /></div><div class="field full"><label>Notas</label><textarea v-model="form.notes" class="input" /></div><BaseCheck v-model="form.active" label="Activo" toggle /></div>
      <template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !form.name" @click="save">Guardar</button></template>
    </BaseModal>
  </div>
</template>
