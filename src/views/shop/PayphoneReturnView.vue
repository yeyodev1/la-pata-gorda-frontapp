<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shopApi, shopErrorMessage } from '@/services/shopApi'

const route = useRoute()
const router = useRouter()
const error = ref('')
const msg = ref('Confirmando tu pago…')
onMounted(async () => {
  const code = String(route.query.order ?? '')
  const id = String(route.query.id ?? '')
  const clientTx = String(route.query.clientTransactionId ?? route.query.clientTxId ?? '')
  if (!code) { router.replace('/'); return }
  if (!id) { router.replace(`/tienda/pedido/${code}`); return }
  try { const r = await shopApi.payphoneConfirm(code, id, clientTx); msg.value = r.payment === 'pagado' ? '¡Pago aprobado!' : 'El pago no fue aprobado.'; setTimeout(() => router.replace(`/tienda/pedido/${r.trackingCode}`), 1200) } catch (err) { error.value = shopErrorMessage(err) }
})
</script>
<template><div class="store"><div class="store-page" style="text-align:center;padding-top:4rem"><p v-if="error" class="err">{{ error }}</p><p v-else class="status-big"><i class="fa-solid fa-circle-notch fa-spin" /> {{ msg }}</p></div></div></template>
