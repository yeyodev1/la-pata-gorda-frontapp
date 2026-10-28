<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { apiErrorMessage } from '@/services/httpBase'
import { useUserStore } from '@/stores/user'
import PageIntro from '@/components/ui/PageIntro.vue'

const userStore = useUserStore()
const configured = ref<boolean | null>(null)
const messages = ref<{ role: 'user' | 'assistant'; text: string; engine?: string }[]>([])
const question = ref('')
const busy = ref(false)
const box = ref<HTMLElement | null>(null)
const SUGGESTIONS = ['¿Cuánto debo producir para mañana?', '¿Qué local pidió más de lo sugerido esta semana?', '¿Qué insumos están bajo mínimo?', '¿Cuánto vendimos ayer por local?', '¿Qué reservas hay hoy?', '¿Qué reseñas faltan por responder?']
onMounted(async () => { try { configured.value = (await api.assistantStatus()).configured } catch { configured.value = false } })
async function send(q?: string) {
  const text = (q ?? question.value).trim()
  if (!text || busy.value) return
  question.value = ''
  messages.value.push({ role: 'user', text })
  busy.value = true
  try {
    const history = messages.value.slice(0, -1).map((m) => ({ role: m.role, text: m.text }))
    const r = await api.ask(text, history)
    messages.value.push({ role: 'assistant', text: r.answer, engine: r.engine })
  } catch (err) { messages.value.push({ role: 'assistant', text: apiErrorMessage(err) }) } finally { busy.value = false; await nextTick(); box.value?.scrollTo({ top: box.value.scrollHeight, behavior: 'smooth' }) }
}
</script>
<template>
  <div class="page assistant">
    <div class="page-head"><div class="title"><span class="eyebrow">Inteligencia</span><h1>Asistente</h1></div><span v-if="configured === false" class="badge warn"><i class="fa-solid fa-plug-circle-xmark" /> IA sin conectar: responde con el estado del negocio</span><span v-else-if="configured" class="badge ok"><i class="fa-solid fa-circle-check" /> Claude conectado</span></div>
    <PageIntro id="asistente" icon="fa-wand-magic-sparkles"><p>Pregunta en lenguaje normal sobre ventas, pedidos, producción, inventario, reservas y reseñas. El asistente lee los datos reales del sistema (promedios por día de semana, existencias, recetas) y explica el cálculo. {{ userStore.is('local') ? 'Solo ve tu local.' : 'Ve todos los locales.' }}</p></PageIntro>
    <div class="card chat">
      <div ref="box" class="messages">
        <div v-if="!messages.length" class="empty-chat"><i class="fa-solid fa-wand-magic-sparkles" /><p>Prueba con una de estas:</p><div class="chips"><button v-for="s in SUGGESTIONS" :key="s" class="chip" type="button" @click="send(s)">{{ s }}</button></div></div>
        <div v-for="(m, i) in messages" :key="i" class="msg" :class="m.role"><div class="bubble"><pre>{{ m.text }}</pre><span v-if="m.engine" class="hint">{{ m.engine === 'claude' ? 'Claude' : 'Estado del negocio' }}</span></div></div>
        <div v-if="busy" class="msg assistant"><div class="bubble"><i class="fa-solid fa-circle-notch fa-spin" /> Pensando…</div></div>
      </div>
      <form class="composer" @submit.prevent="send()"><input v-model="question" class="input" placeholder="Escribe tu pregunta…" :disabled="busy" /><button class="btn primary" type="submit" :disabled="busy || !question.trim()"><i class="fa-solid fa-paper-plane" /></button></form>
    </div>
  </div>
</template>
<style scoped lang="scss">
.chat { display: flex; flex-direction: column; height: calc(100dvh - 260px); min-height: 420px; padding: 0; overflow: hidden; }
.messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.empty-chat { margin: auto; text-align: center; color: var(--text-muted); i { font-size: 2rem; display: block; margin-bottom: 0.5rem; color: var(--amber-500); } .chips { justify-content: center; margin-top: 0.75rem; } }
.msg { display: flex; &.user { justify-content: flex-end; } }
.bubble { max-width: min(760px, 92%); padding: 0.7rem 0.9rem; border-radius: 14px; background: var(--gray-100); .user & { background: var(--navy-800); color: #fff; } pre { margin: 0; white-space: pre-wrap; font: inherit; line-height: 1.45; } .hint { display: block; margin-top: 0.3rem; } }
.composer { display: flex; gap: 0.5rem; padding: 0.75rem; border-top: 1px solid var(--border); .input { flex: 1; } }
</style>
