<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { shopApi, shopErrorMessage, type Storefront } from '@/services/shopApi'
import { useCartStore } from '@/stores/cart'
import { money } from '@/utils/format'

const router = useRouter()
const cart = useCartStore()
const data = ref<Storefront | null>(null)
const form = ref({ name: '', phone: '', email: '', address: '', reference: '', notes: '', scheduledFor: '', payment: '' })
const busy = ref(false)
const error = ref('')
onMounted(async () => { if (!cart.lines.length) { router.replace('/tienda'); return } try { data.value = await shopApi.storefront(); try { const saved = JSON.parse(localStorage.getItem('lpg.customer') ?? 'null'); if (saved) Object.assign(form.value, saved) } catch { /* privado */ } form.value.payment = defaultPayment() } catch (err) { error.value = shopErrorMessage(err) } })
const branch = computed(() => data.value?.branches.find((b) => b.id === cart.branch) ?? null)
const deliveryFee = computed(() => (cart.type === 'domicilio' ? branch.value?.deliveryFee ?? 0 : 0))
const total = computed(() => Math.round((cart.subtotal + deliveryFee.value) * 100) / 100)
const payOptions = computed(() => { const p = data.value?.payments; const out: { value: string; label: string; sub: string }[] = []; if (p?.payphone) out.push({ value: 'payphone', label: 'Tarjeta de crédito o débito', sub: 'Pago seguro con Payphone' }); if (cart.type === 'retiro') out.push({ value: 'local', label: 'Pago en el local al retirar', sub: 'Efectivo, tarjeta o transferencia en caja' }); if (cart.type === 'domicilio') out.push({ value: 'efectivo', label: 'Efectivo al recibir', sub: 'Ten el valor exacto si es posible' }); return out })
function defaultPayment() { return payOptions.value[0]?.value ?? '' }
const valid = computed(() => form.value.name.trim().length > 1 && form.value.phone.replace(/\D/g, '').length >= 9 && (cart.type === 'retiro' || form.value.address.trim().length > 4) && form.value.payment)
async function submit() {
  if (!valid.value || !branch.value) return
  busy.value = true; error.value = ''
  try {
    try { localStorage.setItem('lpg.customer', JSON.stringify({ name: form.value.name, phone: form.value.phone, email: form.value.email, address: form.value.address, reference: form.value.reference })) } catch { /* privado */ }
    const r = await shopApi.checkout({ branch: branch.value.id, type: cart.type, customer: { name: form.value.name, phone: form.value.phone, email: form.value.email }, address: cart.type === 'domicilio' ? { text: form.value.address, reference: form.value.reference } : undefined, items: cart.lines.map((l) => ({ product: l.product.id, qty: l.qty, options: l.options.map((o) => ({ name: o.name, choice: o.choice })), notes: l.notes })), payment: form.value.payment, notes: form.value.notes, scheduledFor: form.value.scheduledFor })
    cart.clear()
    if (r.paymentUrl) { window.location.href = r.paymentUrl; return }
    router.replace(`/tienda/pedido/${r.trackingCode}`)
  } catch (err) { error.value = shopErrorMessage(err) } finally { busy.value = false }
}
</script>
<template>
  <div class="store"><div class="store-page">
    <RouterLink to="/tienda" class="link-btn"><i class="fa-solid fa-arrow-left" /> Volver al menú</RouterLink>
    <h1>Confirma tu pedido</h1>
    <p v-if="error" class="err">{{ error }}</p>
    <div class="card-s"><h3><i class="fa-solid fa-location-dot" /> {{ cart.type === 'retiro' ? 'Retiro en' : 'Envío desde' }} {{ branch?.name }}</h3><p class="hint-s">{{ branch?.address }} · {{ branch?.hours }}{{ cart.type === 'retiro' ? ` · listo en ~${branch?.prepMinutes} min` : '' }}</p></div>
    <form @submit.prevent="submit">
      <div class="card-s"><h3>Tus datos</h3><div class="f-row"><div class="f"><label>Nombre</label><input v-model="form.name" required autocomplete="name" /></div><div class="f"><label>WhatsApp</label><input v-model="form.phone" required inputmode="tel" autocomplete="tel" placeholder="09…" /></div></div><div class="f"><label>Correo (opcional)</label><input v-model="form.email" type="email" autocomplete="email" /></div></div>
      <div v-if="cart.type === 'domicilio'" class="card-s"><h3>Dirección de entrega</h3><div class="f"><label>Dirección</label><input v-model="form.address" required placeholder="Calle, número, sector" /></div><div class="f"><label>Referencia</label><input v-model="form.reference" placeholder="Edificio, piso, cómo llegar" /></div></div>
      <div class="card-s"><h3>¿Para cuándo?</h3><div class="f"><label>Hora (vacío = lo antes posible)</label><input v-model="form.scheduledFor" type="time" /></div><div class="f"><label>Nota para el local</label><textarea v-model="form.notes" placeholder="Opcional" /></div></div>
      <div class="card-s"><h3>Forma de pago</h3><div class="pay-opts"><label v-for="p in payOptions" :key="p.value" class="pay" :class="{ on: form.payment === p.value }"><input v-model="form.payment" type="radio" :value="p.value" /><span>{{ p.label }}<small>{{ p.sub }}</small></span></label></div></div>
      <div class="card-s"><h3>Resumen</h3><ul class="items-s"><li v-for="l in cart.lines" :key="l.key"><span>{{ l.qty }} × {{ l.product.name }}<small v-if="l.options.length">{{ l.options.map((o) => o.choice).join(', ') }}</small></span><span>{{ money(cart.unit(l) * l.qty) }}</span></li></ul><div class="totals"><div><span>Subtotal</span><span>{{ money(cart.subtotal) }}</span></div><div v-if="cart.type === 'domicilio'"><span>Envío</span><span>{{ money(deliveryFee) }}</span></div><div class="grand"><span>Total</span><span>{{ money(total) }}</span></div></div>
        <button class="btn-s primary block" type="submit" :disabled="!valid || busy"><i v-if="busy" class="fa-solid fa-circle-notch fa-spin" /> {{ form.payment === 'payphone' ? `Pagar ${money(total)}` : `Confirmar pedido · ${money(total)}` }}</button></div>
    </form>
  </div></div>
</template>
