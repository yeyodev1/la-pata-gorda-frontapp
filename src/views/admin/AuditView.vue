<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { dateTime, ROLE_LABELS } from '@/utils/format'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import SearchBox from '@/components/ui/SearchBox.vue'
import Pager from '@/components/ui/Pager.vue'

const page = ref(1)
const user = ref('')
const { data, loading, run } = useAsync(() => api.audit({ page: page.value, user: user.value || undefined, limit: 100 }))
onMounted(run)
watch([page, user], run)
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Sistema</span><h1>Bitácora</h1></div><SearchBox v-model="user" placeholder="Filtrar por persona…" /></div>
    <SkeletonTable v-if="loading && !data" :cols="5" />
    <div v-else class="table-wrap"><table class="table"><thead><tr><th>Cuándo</th><th>Quién</th><th>Acción</th><th>Sobre</th><th>Detalle</th></tr></thead><tbody><tr v-for="a in data?.items" :key="a._id"><td class="muted small">{{ dateTime(a.at) }}</td><td><strong>{{ a.userName }}</strong><span class="hint" style="display:block">{{ ROLE_LABELS[a.role] ?? a.role }}</span></td><td><span class="badge info">{{ a.action.replace(/_/g, ' ') }}</span></td><td>{{ a.entityType }} {{ a.entityLabel }}</td><td class="wrap small muted">{{ a.detail ? JSON.stringify(a.detail).slice(0, 160) : '' }}</td></tr></tbody></table></div>
    <Pager v-if="data" :page="data.page" :pages="data.pages" :total="data.total" @change="page = $event" />
  </div>
</template>
