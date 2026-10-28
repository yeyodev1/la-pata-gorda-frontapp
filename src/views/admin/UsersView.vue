<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import type { SessionUser } from '@/types'
import { ROLE_LABELS } from '@/utils/format'
import { useCatalogStore } from '@/stores/catalog'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseCheck from '@/components/ui/BaseCheck.vue'
import HelpTip from '@/components/ui/HelpTip.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const catalog = useCatalogStore()
const { data, loading, run } = useAsync(() => api.users())
const { busy, run: act } = useAction()
onMounted(() => { run(); catalog.loadBranches() })
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))
const BRANCH_OPTIONS = computed(() => [{ value: '', label: 'Sin local' }, ...catalog.branches.map((b) => ({ value: b._id, label: b.name }))])
const open = ref(false)
const form = ref<Partial<SessionUser> & { password?: string }>({})
function edit(u?: SessionUser) { form.value = u ? { ...u, branch: u.branch ?? '' } : { role: 'local', branch: '', active: true }; open.value = true }
async function save() { const r = await act(() => (form.value.id ? api.updateUser(form.value.id, form.value) : api.createUser(form.value)), 'Usuario guardado'); if (r) { open.value = false; run() } }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Sistema</span><h1>Equipo y accesos</h1></div><button class="btn primary" @click="edit()"><i class="fa-solid fa-user-plus" /> Nuevo usuario</button></div>
    <PageIntro id="equipo" icon="fa-users"><p>Cada persona entra con su propio usuario y todo queda a su nombre. El <strong>rol</strong> define qué pantallas ve y qué puede hacer; gerencia y administración ven todo. Los administradores de local solo ven su local.</p></PageIntro>
    <SkeletonTable v-if="loading && !data" :cols="5" />
    <div v-else class="table-wrap"><table class="table"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Local</th><th>Estado</th><th></th></tr></thead><tbody><tr v-for="u in data?.items" :key="u.id" :class="{ muted: !u.active }"><td><strong>{{ u.name }}</strong></td><td>{{ u.email }}</td><td><span class="badge info">{{ ROLE_LABELS[u.role] }}</span></td><td>{{ u.branch ? catalog.branchName(u.branch) : '—' }}</td><td><span class="badge" :class="u.active ? 'ok' : 'danger'">{{ u.active ? 'activo' : 'inactivo' }}</span></td><td><button class="btn sm" @click="edit(u)"><i class="fa-solid fa-pen" /></button></td></tr></tbody></table></div>
    <BaseModal :open="open" :title="form.id ? form.name ?? '' : 'Nuevo usuario'" @close="open = false">
      <div class="form-row form-row-2"><div class="field"><label>Nombre</label><input v-model="form.name" class="input" /></div><div class="field"><label>Correo</label><input v-model="form.email" class="input" type="email" /></div><div class="field"><label>Rol <HelpTip text="Local: administrador de un restaurante (inventario y pedido diario). Producción: centro de producción. Bodega: materia prima. Compras, Contabilidad y Atención según su área. Gerencia ve todo." /></label><BaseSelect v-model="form.role" :options="ROLE_OPTIONS" /></div><div class="field"><label>Local (administradores)</label><BaseSelect v-model="form.branch" :options="BRANCH_OPTIONS" :searchable="false" /></div><div class="field"><label>Teléfono</label><input v-model="form.phone" class="input" /></div><div class="field"><label>{{ form.id ? 'Nueva contraseña (opcional)' : 'Contraseña' }}</label><input v-model="form.password" class="input" type="password" autocomplete="new-password" /></div><BaseCheck v-model="form.active" label="Usuario activo" toggle /></div>
      <template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !form.name || !form.email || (!form.id && !form.password)" @click="save">Guardar</button></template>
    </BaseModal>
  </div>
</template>
