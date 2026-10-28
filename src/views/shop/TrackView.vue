<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { shopApi, shopErrorMessage, type TrackedOrder } from '@/services/shopApi'
import { money, dateTime } from '@/utils/format'

const route = useRoute()
const order = ref<TrackedOrder | null>(null)
const error = ref('')
let timer: number | undefined
async function load() { try { order.value = await shopApi.track(String(route.params.code)) } catch (err) { error.value = shopErrorMessage(err) } }
onMounted(() => { load(); timer = window.setInterval(load, 15000) })
onUnmounted(() => { if (timer) clearInterval(timer) })
const STEPS = computed(() => order.value?.type === 'domicilio' ? ['nuevo', 'aceptado', 'en_preparacion', 'en_camino', 'entregado'] : ['nuevo', 'aceptado', 'en_preparacion', 'listo', 'entregado'])
const LABEL: Record<string, string> = { nuevo: 'Recibido', aceptado: 'Aceptado por el local', en_preparacion: 'En preparación', listo: 'Listo para retirar', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' }
const idx = computed(() => { const s = order.value?.status ?? ''; const i = STEPS.value.indexOf(s === 'listo' && order.value?.type === 'domicilio' ? 'en_preparacion' : s); return i })
const PAY: Record<string, string> = { payphone: 'Tarjeta (Payphone)', local: 'Pago en el local', efectivo: 'Efectivo al recibir', transferencia: 'Transferencia' }
</script>
<template>
  <div class="store"><div class="store-page">
    <RouterLink to="/tienda" class="link-btn"><i class="fa-solid fa-arrow-left" /> Volver a la tienda</RouterLink>
    <p v-if="error" class="err">{{ error }}</p>
    <template v-else-if="order">
      <h1>Pedido {{ order.number }}</h1>
      <div class="card-s">
        <p v-if="order.status === 'cancelado'" class="err">Pedido cancelado{{ order.cancelReason ? `: ${order.cancelReason}` : '' }}</p>
        <template v-else><p class="hint-s">{{ order.type === 'retiro' ? `Retiro en ${order.branchName}` : `Envío a ${order.address.text}` }}</p><p class="status-big">{{ LABEL[order.status] ?? order.status }}</p><p class="hint-s">Tiempo estimado: ~{{ order.estimatedMinutes }} min{{ order.scheduledFor ? ` · pediste para las ${order.scheduledFor}` : '' }}</p>
          <div class="steps"><div v-for="(s, i) in STEPS" :key="s" class="step" :class="{ done: i < idx, now: i === idx }"><span class="dot"><i v-if="i < idx" class="fa-solid fa-check" /><span v-else>{{ i + 1 }}</span></span><span>{{ LABEL[s] }}</span></div></div></template>
        <p v-if="order.payment.method === 'payphone'" :class="order.payment.status === 'pagado' ? 'ok-box' : 'err'">{{ order.payment.status === 'pagado' ? 'Pago con tarjeta aprobado' : order.payment.status === 'fallido' ? 'El pago no fue aprobado' : 'Pago pendiente' }}</p>
        <p v-else class="hint-s">Pago: {{ PAY[order.payment.method] ?? order.payment.method }}{{ order.payment.status === 'pagado' ? ' · cobrado' : '' }}</p>
      </div>
      <div class="card-s"><h3>Lo que pediste</h3><ul class="items-s"><li v-for="(it, i) in order.items" :key="i"><span>{{ it.qty }} × {{ it.name }}<small v-if="it.options.length">{{ it.options.map((o) => o.choice).join(', ') }}</small><small v-if="it.notes">“{{ it.notes }}”</small></span><span>{{ money(it.lineTotal) }}</span></li></ul><div class="totals"><div><span>Subtotal</span><span>{{ money(order.subtotal) }}</span></div><div v-if="order.deliveryFee"><span>Envío</span><span>{{ money(order.deliveryFee) }}</span></div><div class="grand"><span>Total</span><span>{{ money(order.total) }}</span></div></div></div>
      <div class="card-s"><h3>Historial</h3><ul class="items-s"><li v-for="(t, i) in order.timeline" :key="i"><span>{{ LABEL[t.status] ?? t.status }}<small v-if="t.note">{{ t.note }}</small></span><span class="hint-s">{{ dateTime(t.at) }}</span></li></ul><p class="hint-s" style="margin-top:0.6rem">Guarda este enlace para ver cómo va tu pedido. Se actualiza solo.</p></div>
    </template>
    <p v-else class="loading"><i class="fa-solid fa-circle-notch fa-spin" /> Buscando tu pedido…</p>
  </div></div>
</template>
