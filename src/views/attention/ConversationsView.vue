<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import { useCatalogStore } from '@/stores/catalog'
import type { Conversation } from '@/types'
import { CONVERSATION_STATUS, TOPIC_LABELS, timeAgo, dateTime } from '@/utils/format'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import PageIntro from '@/components/ui/PageIntro.vue'
import SearchBox from '@/components/ui/SearchBox.vue'

const catalog = useCatalogStore()
const status = ref('abierta,esperando')
const q = ref('')
const { data, run } = useAsync(() => api.conversations({ status: status.value || undefined, q: q.value || undefined, limit: 100 }))
const { busy, run: act } = useAction()
const current = ref<Conversation | null>(null)
const reply = ref('')
const box = ref<HTMLElement | null>(null)
let timer: number | undefined
onMounted(() => { run(); catalog.loadBranches(); timer = window.setInterval(run, 20000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
watch([status, q], run)
async function openConv(c: Conversation) { current.value = (await api.conversation(c._id)).conversation; await nextTick(); box.value?.scrollTo({ top: box.value.scrollHeight }); run() }
async function send(close = false) { if (!current.value || !reply.value.trim()) return; const r = await act(() => api.reply(current.value!._id, reply.value.trim(), close ? 'cerrada' : undefined)); if (r) { current.value = r.conversation; reply.value = ''; await nextTick(); box.value?.scrollTo({ top: box.value.scrollHeight }); run() } }
async function setTopic(topic: string) { if (!current.value) return; const r = await act(() => api.updateConversation(current.value!._id, { topic })); if (r) current.value = r.conversation }
async function setBranch(branch: string) { if (!current.value) return; const r = await act(() => api.updateConversation(current.value!._id, { branch: branch || null })); if (r) current.value = r.conversation }
const TOPIC_OPTIONS = Object.entries(TOPIC_LABELS).map(([value, label]) => ({ value, label }))
const BRANCH_OPTIONS = computed(() => [{ value: '', label: 'Sin local' }, ...catalog.locals.map((b) => ({ value: b._id, label: b.name }))])
const open = ref(false)
const form = ref({ phone: '', name: '', text: '', topic: 'consulta' })
async function logInbound() { const r = await act(() => api.inbound(form.value), 'Mensaje registrado'); if (r) { open.value = false; form.value = { phone: '', name: '', text: '', topic: 'consulta' }; run(); openConv(r.conversation) } }
const QUICK = ['¡Hola! Gracias por escribir a La Pata Gorda 🦀 ¿En qué local te gustaría reservar y para cuántas personas?', 'Puedes hacer tu pedido en línea aquí: /tienda (retiro o domicilio).', 'Tu reserva quedó confirmada. ¡Te esperamos!', 'Lamentamos lo ocurrido. Nos encargamos de resolverlo con el local y te escribimos en breve.']
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Atención</span><h1>WhatsApp</h1></div><div class="actions"><SearchBox v-model="q" placeholder="Nombre o teléfono…" /><button class="btn" @click="open = true"><i class="fa-solid fa-inbox" /> Registrar mensaje</button></div></div>
    <PageIntro id="whatsapp" icon="fa-comments"><p>Un solo número para toda la cadena. Lo que el agente de IA no resuelve (reservas dentro de la hora, privados, quejas, eventos) llega aquí para que una persona responda. Cada conversación se asigna a un local y a un tema; si pasa más de dos horas sin respuesta, se levanta una alerta.</p></PageIntro>
    <div class="tabs"><button :class="{ active: status === 'abierta,esperando' }" @click="status = 'abierta,esperando'">Activas</button><button :class="{ active: status === 'abierta' }" @click="status = 'abierta'">Sin responder</button><button :class="{ active: status === 'cerrada' }" @click="status = 'cerrada'">Cerradas</button></div>
    <div class="cols chat-layout">
      <div class="card list" style="flex:1 1 300px;padding:0"><p v-if="!data?.items.length" class="muted" style="padding:1rem">Nada por aquí.</p><button v-for="c in data?.items" :key="c._id" type="button" class="conv" :class="{ on: current?._id === c._id, unread: c.unread }" @click="openConv(c)"><div class="row" style="justify-content:space-between"><strong>{{ c.name || c.phone }}</strong><span class="hint">{{ timeAgo(c.lastMessageAt) }}</span></div><p class="small clamp">{{ c.lastText }}</p><div class="row" style="gap:0.3rem"><StatusBadge :map="CONVERSATION_STATUS" :value="c.status" /><span class="badge">{{ TOPIC_LABELS[c.topic] }}</span><span v-if="c.unread" class="badge danger">{{ c.unread }}</span></div></button></div>
      <div class="card thread" style="flex:2 1 460px"><template v-if="current"><div class="card-head"><div><h3>{{ current.name || current.phone }}</h3><span class="hint">{{ current.phone }} · {{ current.assignedTo || 'sin asignar' }}</span></div><div class="row"><BaseSelect :model-value="current.topic" :options="TOPIC_OPTIONS" size="sm" :searchable="false" @update:model-value="setTopic(String($event))" /><BaseSelect :model-value="current.branch ?? ''" :options="BRANCH_OPTIONS" size="sm" :searchable="false" @update:model-value="setBranch(String($event))" /></div></div>
        <div ref="box" class="msgs"><div v-for="m in current.messages" :key="m._id ?? m.at" class="msg" :class="m.direction"><div class="bubble">{{ m.text }}<span class="hint">{{ m.by }} · {{ dateTime(m.at) }}</span></div></div></div>
        <div class="chips" style="margin:0.5rem 0"><button v-for="(t, i) in QUICK" :key="i" type="button" class="chip" @click="reply = t">{{ t.slice(0, 38) }}…</button></div>
        <div class="row"><textarea v-model="reply" class="input" rows="2" placeholder="Escribe la respuesta…" style="flex:1" @keydown.enter.exact.prevent="send()" /><div class="stack" style="gap:0.3rem"><button class="btn primary" :disabled="busy || !reply.trim()" @click="send()"><i class="fa-solid fa-paper-plane" /> Enviar</button><button class="btn sm" :disabled="busy || !reply.trim()" @click="send(true)">Enviar y cerrar</button></div></div>
        <p class="hint" style="margin-top:0.4rem">Por ahora la respuesta se registra aquí y se envía desde WhatsApp Web; cuando el agente esté conectado saldrá sola.</p></template>
        <p v-else class="muted" style="padding:2rem;text-align:center">Elige una conversación.</p></div>
    </div>
    <BaseModal :open="open" title="Registrar mensaje entrante" @close="open = false"><div class="form-row form-row-2"><div class="field"><label>Teléfono</label><input v-model="form.phone" class="input" /></div><div class="field"><label>Nombre</label><input v-model="form.name" class="input" /></div><div class="field"><label>Tema</label><BaseSelect v-model="form.topic" :options="TOPIC_OPTIONS" :searchable="false" /></div><div class="field full"><label>Mensaje</label><textarea v-model="form.text" class="input" /></div></div><template #footer><button class="btn" @click="open = false">Cancelar</button><button class="btn primary" :disabled="busy || !form.phone || !form.text" @click="logInbound">Registrar</button></template></BaseModal>
  </div>
</template>
<style scoped lang="scss">
.conv { display: block; width: 100%; text-align: left; background: none; border: none; border-bottom: 1px solid var(--border); padding: 0.7rem 0.9rem; cursor: pointer; font: inherit; color: inherit; &.on { background: var(--amber-100); } &.unread strong { color: var(--navy-800); } .clamp { margin: 0.2rem 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-muted); } }
.list { max-height: 70vh; overflow-y: auto; }
.msgs { max-height: 44vh; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; padding: 0.5rem 0; }
.msg { display: flex; &.saliente { justify-content: flex-end; } .bubble { max-width: 80%; padding: 0.55rem 0.8rem; border-radius: 12px; background: var(--gray-100); font-size: 0.92rem; white-space: pre-wrap; .hint { display: block; margin-top: 0.2rem; } } &.saliente .bubble { background: var(--green-100); } }
</style>
