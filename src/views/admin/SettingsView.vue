<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '@/services/api'
import { useAsync, useAction } from '@/composables/useAsync'
import type { Settings } from '@/types'
import HelpTip from '@/components/ui/HelpTip.vue'
import PageIntro from '@/components/ui/PageIntro.vue'

const { data, run } = useAsync(() => api.settings())
const { data: health, run: loadHealth } = useAsync(() => api.health())
const { busy, run: act } = useAction()
const form = ref<Partial<Settings>>({})
onMounted(async () => { await run(); form.value = { ...data.value?.settings }; loadHealth() })
async function save() { const r = await act(() => api.updateSettings(form.value), 'Configuración guardada'); if (r) form.value = { ...r.settings } }
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Sistema</span><h1>Configuración</h1></div><button class="btn primary" :disabled="busy" @click="save"><i class="fa-solid fa-floppy-disk" /> Guardar</button></div>
    <PageIntro id="config" icon="fa-sliders"><p>Parámetros del negocio. Cambiarlos afecta las sugerencias de pedido, las alertas y las reservas desde el siguiente cálculo.</p></PageIntro>
    <div class="cols cols-2">
      <div class="card stack"><h3>Pedidos y producción</h3>
        <div class="field"><label>Stock de seguridad (%) <HelpTip text="Se suma al consumo esperado del día. 20 % = pedir un quinto más de lo que se espera vender." /></label><input v-model.number="form.safetyStockPct" class="input" type="number" min="0" max="100" /></div>
        <div class="field"><label>Semanas para el promedio <HelpTip text="Cuántas semanas hacia atrás se miran para calcular el promedio de ventas de cada día de la semana." /></label><input v-model.number="form.weeksForAverage" class="input" type="number" min="1" max="12" /></div>
        <div class="field"><label>Umbral de pedido inflado (%) <HelpTip text="Si un local pide más de este porcentaje sobre lo sugerido, la línea se marca y necesita justificación." /></label><input v-model.number="form.inflatedThresholdPct" class="input" type="number" min="0" max="200" /></div>
        <div class="field"><label>Diferencia de inventario que alerta (%)</label><input v-model.number="form.countDiffAlertPct" class="input" type="number" min="0" max="100" /></div>
        <div class="field"><label>Hora límite para enviar el pedido (HH:MM)</label><input v-model="form.orderCutoff" class="input" placeholder="15:00" /></div>
      </div>
      <div class="card stack"><h3>Tienda, reservas y asistente</h3>
        <div class="field"><label>Número de WhatsApp de la cadena</label><input v-model="form.whatsappNumber" class="input" placeholder="+593 99 …" /></div>
        <div class="field"><label>Duración de una mesa (min) <HelpTip text="Para calcular el cupo de reservas por franja horaria." /></label><input v-model.number="form.reservationSlotMin" class="input" type="number" min="30" max="240" /></div>
        <div class="field"><label>Nombre del asistente</label><input v-model="form.assistantName" class="input" /></div>
        <h3 style="margin-top:0.5rem">Conexiones</h3>
        <dl class="kv"><dt>Base de datos</dt><dd><span class="badge" :class="health?.db ? 'ok' : 'danger'">{{ health?.db ? 'conectada' : 'sin conexión' }}</span></dd><dt>Asistente (Claude)</dt><dd><span class="badge" :class="health?.assistant ? 'ok' : 'warn'">{{ health?.assistant ? 'conectado' : 'sin clave' }}</span></dd><dt>Fotos (Cloudinary)</dt><dd><span class="badge" :class="(health as any)?.media ? 'ok' : 'warn'">{{ (health as any)?.media ? 'conectado' : 'sin configurar' }}</span></dd></dl>
        <p class="hint">Las claves (Atlas, Payphone, Cloudinary, Claude) viven en el servidor, no aquí.</p>
      </div>
    </div>
  </div>
</template>
