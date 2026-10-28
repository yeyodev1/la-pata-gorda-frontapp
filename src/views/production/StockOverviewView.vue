<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { useAsync } from '@/composables/useAsync'
import { GROUP_LABELS, qty, downloadCsv } from '@/utils/format'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'
import SearchBox from '@/components/ui/SearchBox.vue'
import PageIntro from '@/components/ui/PageIntro.vue'

const { data, loading, run } = useAsync(() => api.stockOverview())
const search = ref('')
onMounted(run)
const rows = computed(() => (data.value?.rows ?? []).filter((r) => !search.value || r.name.toLowerCase().includes(search.value.toLowerCase())))
function exportCsv() { if (!data.value) return; downloadCsv('existencias.csv', rows.value.map((r) => ({ insumo: r.name, unidad: r.unit, ...Object.fromEntries(data.value!.branches.map((b, i) => [b.name, r.byBranch[i]?.qty ?? 0])), total: r.total }))) }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Producción y bodega</span><h1>Existencias por lugar</h1></div><div class="actions"><SearchBox v-model="search" placeholder="Buscar insumo…" /><button class="btn sm" @click="exportCsv"><i class="fa-solid fa-file-csv" /> CSV</button></div></div>
    <PageIntro id="existencias" icon="fa-warehouse"><p>Lo que hay en cada local, en el centro de producción y en bodega, en una sola tabla. Sirve para ver quién tiene de más y quién de menos antes de aprobar pedidos. En rojo lo que está bajo el mínimo del insumo.</p></PageIntro>
    <SkeletonTable v-if="loading && !data" :cols="8" />
    <div v-else-if="data" class="table-wrap"><table class="table"><thead><tr><th>Insumo</th><th v-for="b in data.branches" :key="b.id" class="num">{{ b.name.replace('Pata Gorda ', '') }}</th><th class="num">Total</th></tr></thead><tbody>
      <tr v-for="r in rows" :key="r.ingredient"><td><strong>{{ r.name }}</strong> <span class="hint">{{ r.unit }} · {{ GROUP_LABELS[r.group] ?? r.group }}</span></td><td v-for="(c, i) in r.byBranch" :key="i" class="num" :style="{ color: data.branches[i]?.type === 'local' && r.minStock > 0 && c.qty < r.minStock ? 'var(--red-600)' : '' }">{{ c.qty ? qty(c.qty) : '·' }}</td><td class="num"><strong>{{ qty(r.total) }}</strong></td></tr>
    </tbody></table></div>
  </div>
</template>
