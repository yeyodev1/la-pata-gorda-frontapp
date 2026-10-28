<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useUserStore } from '@/stores/user'
import type { Review } from '@/types'
import { REVIEW_STATUS, dateTime } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonTable from '@/components/ui/SkeletonTable.vue'

const route = useRoute()
const userStore = useUserStore()
const status = ref<string>((route.query.status as string) ?? '')
const { data, loading, run } = useAsync(() => api.reviews({ status: status.value || undefined, limit: 100 }))
const { busy, run: act } = useAction()
const replies = ref<Record<string, string>>({})
onMounted(run)
watch(status, run)
async function reply(r: Review) { const x = await act(() => api.replyReview(r._id, { reply: replies.value[r._id] }), 'Respuesta guardada'); if (x) run() }
async function escalate(r: Review) { const x = await act(() => api.replyReview(r._id, { status: 'escalada' }), 'Escalada a gerencia'); if (x) run() }
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Atención</span><h1>Reseñas</h1></div><div class="tabs" style="margin:0;border:none"><button :class="{ active: status === '' }" @click="status = ''">Todas</button><button :class="{ active: status === 'nueva' }" @click="status = 'nueva'">Sin responder</button><button :class="{ active: status === 'escalada' }" @click="status = 'escalada'">Escaladas</button></div></div>
    <PageIntro id="resenas" icon="fa-star"><p>Reseñas de Google por local. Las de 4 y 5 estrellas las responde el agente automáticamente; las bajas llegan aquí para responderlas con criterio o escalarlas a gerencia.</p></PageIntro>
    <div v-if="data?.stats.length" class="cols cols-4" style="margin-bottom:1rem"><div v-for="s in data.stats" :key="s._id" class="stat" :class="s.avg >= 4.5 ? 'good' : s.avg < 3.5 ? 'bad' : ''"><span class="stat-label">{{ s._id || 'Sin local' }}</span><span class="stat-value">{{ s.avg.toFixed(1) }} ★</span><span class="stat-sub">{{ s.count }} reseñas · {{ s.pending }} sin responder</span></div></div>
    <SkeletonTable v-if="loading && !data" :cols="3" />
    <EmptyState v-else-if="!data?.items.length" icon="fa-star" text="Sin reseñas con ese filtro." />
    <div v-else class="stack">
      <div v-for="r in data.items" :key="r._id" class="card" :class="{ 'row-rojo': r.rating <= 2 && r.status === 'nueva' }"><div class="row" style="justify-content:space-between"><div><strong :style="{ color: r.rating >= 4 ? 'var(--green-600)' : r.rating <= 2 ? 'var(--red-600)' : 'var(--amber-600)' }">{{ stars(r.rating) }}</strong> <strong>{{ r.author }}</strong> <span class="muted small">· {{ r.branchName }} · {{ r.source }} · {{ dateTime(r.reviewedAt) }}</span></div><StatusBadge :map="REVIEW_STATUS" :value="r.status" /></div><p style="margin:0.5rem 0">{{ r.text }}</p>
        <div v-if="r.reply" class="alert-box ok"><i class="fa-solid fa-reply" /> <span><strong>{{ r.repliedBy }}:</strong> {{ r.reply }}</span></div>
        <div v-else-if="userStore.can('atencion')" class="row" style="margin-top:0.5rem"><input v-model="replies[r._id]" class="input" placeholder="Escribe la respuesta pública…" style="flex:1" /><button class="btn primary sm" :disabled="busy || !replies[r._id]" @click="reply(r)"><i class="fa-solid fa-paper-plane" /> Responder</button><button v-if="r.status !== 'escalada'" class="btn sm ghost" :disabled="busy" @click="escalate(r)">Escalar</button></div></div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.alert-box.ok { background: var(--green-100); color: var(--green-600); }
</style>
