<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shopApi, shopErrorMessage, type Storefront } from '@/services/shopApi'
import { useCartStore } from '@/stores/cart'
import { money } from '@/utils/format'
import DeliveryMap from '@/components/shop/DeliveryMap.vue'

const router = useRouter()
const cart = useCartStore()
const data = ref<Storefront | null>(null)
const step = ref(1)
const form = ref({ name: '', phone: '', email: '', reference: '', notes: '', scheduledFor: '', payment: '' })
const address = ref<{ text: string; lat: number | null; lng: number | null }>({ text: '', lat: null, lng: null })
const busy = ref(false)
const error = ref('')
onMounted(async () => {
  if (!cart.lines.length) { router.replace('/'); return }
  try {
    data.value = await shopApi.storefront()
    try { const saved = JSON.parse(localStorage.getItem('lpg.customer') ?? 'null'); if (saved) { Object.assign(form.value, { name: saved.name ?? '', phone: saved.phone ?? '', email: saved.email ?? '', reference: saved.reference ?? '' }); if (saved.address) address.value = { text: saved.address, lat: saved.lat ?? null, lng: saved.lng ?? null } } } catch { /* privado */ }
    form.value.payment = defaultPayment()
  } catch (err) { error.value = shopErrorMessage(err) }
})
const branch = computed(() => data.value?.branches.find((b) => b.id === cart.branch) ?? null)
const deliveryFee = computed(() => (cart.type === 'domicilio' ? branch.value?.deliveryFee ?? 0 : 0))
const total = computed(() => Math.round((cart.subtotal + deliveryFee.value) * 100) / 100)
const payOptions = computed(() => { const p = data.value?.payments; const out: { value: string; label: string; sub: string; icon: string }[] = []; if (p?.payphone) out.push({ value: 'payphone', label: 'Tarjeta de crédito o débito', sub: 'Pago seguro con Payphone', icon: 'fa-credit-card' }); if (cart.type === 'retiro') out.push({ value: 'local', label: 'Pago en el local al retirar', sub: 'Efectivo, tarjeta o transferencia en caja', icon: 'fa-store' }); if (cart.type === 'domicilio') out.push({ value: 'efectivo', label: 'Efectivo al recibir', sub: 'Ten el valor exacto si es posible', icon: 'fa-money-bill-wave' }); return out })
function defaultPayment() { return payOptions.value[0]?.value ?? '' }
watch(() => cart.type, () => { form.value.payment = defaultPayment() })
const step1Ok = computed(() => Boolean(branch.value) && (cart.type === 'retiro' || address.value.text.trim().length > 4))
const step2Ok = computed(() => form.value.name.trim().length > 1 && form.value.phone.replace(/\D/g, '').length >= 9)
const valid = computed(() => step1Ok.value && step2Ok.value && Boolean(form.value.payment))
function go(n: number) { step.value = n; window.scrollTo({ top: 0, behavior: 'smooth' }) }
async function submit() {
  if (!valid.value || !branch.value) return
  busy.value = true; error.value = ''
  try {
    try { localStorage.setItem('lpg.customer', JSON.stringify({ name: form.value.name, phone: form.value.phone, email: form.value.email, address: address.value.text, lat: address.value.lat, lng: address.value.lng, reference: form.value.reference })) } catch { /* privado */ }
    const r = await shopApi.checkout({ branch: branch.value.id, type: cart.type, customer: { name: form.value.name, phone: form.value.phone, email: form.value.email }, address: cart.type === 'domicilio' ? { text: address.value.text, reference: form.value.reference, lat: address.value.lat, lng: address.value.lng } : undefined, items: cart.lines.map((l) => ({ product: l.product.id, qty: l.qty, options: l.options.map((o) => ({ name: o.name, choice: o.choice })), notes: l.notes })), payment: form.value.payment, notes: form.value.notes, scheduledFor: form.value.scheduledFor })
    cart.clear()
    if (r.paymentUrl) { window.location.href = r.paymentUrl; return }
    router.replace(`/tienda/pedido/${r.trackingCode}`)
  } catch (err) { error.value = shopErrorMessage(err); window.scrollTo({ top: 0, behavior: 'smooth' }) } finally { busy.value = false }
}
</script>
<template>
  <div class="store"><div class="checkout">
    <header class="co-top"><RouterLink to="/" class="link-btn"><i class="fa-solid fa-arrow-left" /> Volver al menú</RouterLink><img src="/brand/logo.svg" alt="La Pata Gorda" class="co-logo" /><span class="co-secure"><i class="fa-solid fa-lock" /> Pedido seguro</span></header>
    <h1>Confirma tu pedido</h1>
    <ol class="co-steps"><li :class="{ on: step === 1, done: step > 1 }" @click="go(1)"><span>1</span> Entrega</li><li :class="{ on: step === 2, done: step > 2 }" @click="step1Ok && go(2)"><span>2</span> Tus datos</li><li :class="{ on: step === 3 }" @click="step1Ok && step2Ok && go(3)"><span>3</span> Pago</li></ol>
    <p v-if="error" class="err"><i class="fa-solid fa-triangle-exclamation" /> {{ error }}</p>

    <div class="co-layout">
      <div class="co-main">
        <Transition name="step" mode="out-in">
          <!-- Paso 1: entrega -->
          <div v-if="step === 1" key="s1" class="card-s">
            <h3><i class="fa-solid fa-location-dot" /> ¿Cómo lo quieres?</h3>
            <div class="mode co-mode"><button type="button" :class="{ on: cart.type === 'retiro' }" :disabled="branch ? !branch.pickupEnabled : false" @click="cart.type = 'retiro'"><i class="fa-solid fa-store" /> Retiro en local</button><button type="button" :class="{ on: cart.type === 'domicilio' }" :disabled="branch ? !branch.deliveryEnabled : false" @click="cart.type = 'domicilio'"><i class="fa-solid fa-motorcycle" /> A domicilio</button></div>
            <div class="f"><label>Local</label><select :value="cart.branch" @change="cart.branch = ($event.target as HTMLSelectElement).value"><option v-for="b in data?.branches" :key="b.id" :value="b.id">{{ b.name }} · {{ b.city }}</option></select><span v-if="branch" class="hint-s">{{ branch.address }} · {{ branch.hours }}{{ cart.type === 'retiro' ? ` · listo en ~${branch.prepMinutes} min` : ` · envío ${money(branch.deliveryFee)}` }}</span></div>
            <template v-if="cart.type === 'domicilio'">
              <div class="f"><label>Dirección de entrega</label><DeliveryMap v-if="data?.mapsKey" v-model="address" :api-key="data.mapsKey" :branch="branch" /><input v-else v-model="address.text" placeholder="Calle, número, sector" /></div>
              <div class="f"><label>Referencia (edificio, piso, cómo llegar)</label><input v-model="form.reference" placeholder="Ej. Casa de portón azul, frente al parque" /></div>
            </template>
            <div v-else class="pickup-box"><i class="fa-solid fa-store"></i><div><strong>Retiras en {{ branch?.name }}</strong><br /><small>{{ branch?.address }}. Te avisamos cuando esté listo.</small></div></div>
            <div class="f"><label>¿Para qué hora? (vacío = lo antes posible)</label><input v-model="form.scheduledFor" type="time" style="max-width:180px" /></div>
            <button type="button" class="btn-s primary block" :disabled="!step1Ok" @click="go(2)">Continuar <i class="fa-solid fa-arrow-right" /></button>
          </div>
          <!-- Paso 2: datos -->
          <div v-else-if="step === 2" key="s2" class="card-s">
            <h3><i class="fa-solid fa-user"></i> Tus datos</h3>
            <div class="f-row"><div class="f"><label>Nombre</label><input v-model="form.name" required autocomplete="name" placeholder="¿A nombre de quién?" /></div><div class="f"><label>WhatsApp</label><input v-model="form.phone" required inputmode="tel" autocomplete="tel" placeholder="09…" /><span class="hint-s">Te escribimos por aquí si hay dudas.</span></div></div>
            <div class="f"><label>Correo (opcional)</label><input v-model="form.email" type="email" autocomplete="email" /></div>
            <div class="f"><label>Nota para el local (opcional)</label><textarea v-model="form.notes" placeholder="Alergias, cumpleaños, sin picante…" /></div>
            <div class="co-nav"><button type="button" class="btn-s" @click="go(1)"><i class="fa-solid fa-arrow-left" /> Atrás</button><button type="button" class="btn-s primary" :disabled="!step2Ok" @click="go(3)">Continuar <i class="fa-solid fa-arrow-right" /></button></div>
          </div>
          <!-- Paso 3: pago -->
          <form v-else key="s3" class="card-s" @submit.prevent="submit">
            <h3><i class="fa-solid fa-wallet"></i> Forma de pago</h3>
            <div class="pay-opts"><label v-for="p in payOptions" :key="p.value" class="pay" :class="{ on: form.payment === p.value }"><input v-model="form.payment" type="radio" :value="p.value" /><i class="fa-solid pay-ico" :class="p.icon" /><span>{{ p.label }}<small>{{ p.sub }}</small></span></label></div>
            <div class="co-review"><p><i class="fa-solid fa-location-dot" /> {{ cart.type === 'retiro' ? `Retiro en ${branch?.name}` : `Envío a ${address.text}` }} <button type="button" class="link-btn" @click="go(1)">cambiar</button></p><p><i class="fa-solid fa-user" /> {{ form.name }} · {{ form.phone }} <button type="button" class="link-btn" @click="go(2)">cambiar</button></p></div>
            <div class="co-nav"><button type="button" class="btn-s" @click="go(2)"><i class="fa-solid fa-arrow-left" /> Atrás</button><button class="btn-s primary" type="submit" :disabled="!valid || busy"><i v-if="busy" class="fa-solid fa-circle-notch fa-spin" /> {{ form.payment === 'payphone' ? `Pagar ${money(total)}` : `Confirmar pedido · ${money(total)}` }}</button></div>
          </form>
        </Transition>
      </div>

      <aside class="co-side">
        <div class="card-s co-summary">
          <h3><i class="fa-solid fa-basket-shopping" /> Tu pedido <span class="chip">{{ cart.count }}</span></h3>
          <ul class="items-s"><li v-for="l in cart.lines" :key="l.key"><span><strong>{{ l.qty }} ×</strong> {{ l.product.name }}<small v-if="l.options.length">{{ l.options.map((o) => o.choice).join(', ') }}</small><small v-if="l.notes">“{{ l.notes }}”</small></span><span>{{ money(cart.unit(l) * l.qty) }}</span></li></ul>
          <div class="totals"><div><span>Subtotal</span><span>{{ money(cart.subtotal) }}</span></div><div v-if="cart.type === 'domicilio'"><span>Envío</span><span>{{ money(deliveryFee) }}</span></div><div class="grand"><span>Total</span><span>{{ money(total) }}</span></div></div>
          <p class="hint-s" style="margin-top:0.6rem"><i class="fa-solid fa-clock" /> {{ cart.type === 'retiro' ? `Listo en ~${branch?.prepMinutes ?? 25} min` : 'Llega en 35 a 50 min aprox.' }}</p>
          <RouterLink to="/" class="link-btn" style="display:block;margin-top:0.4rem">+ Agregar más platos</RouterLink>
        </div>
      </aside>
    </div>
  </div></div>
</template>
<style scoped lang="scss">
.checkout { max-width: 1100px; margin: 0 auto; padding: 1rem 1.25rem 4rem; color: #f6efd6; h1 { font-family: 'Fraunces', Georgia, serif; font-weight: 400; font-size: clamp(2rem, 5vw, 3rem); margin: 0.4rem 0 0.8rem; color: #f6efd6; } }
.co-top { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.4rem 0; .co-logo { width: 56px; height: 56px; border-radius: 50%; box-shadow: 0 6px 18px rgba(0,0,0,0.25); } .co-secure { font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; opacity: 0.85; } }
.co-steps { display: flex; gap: 0.4rem; list-style: none; padding: 0; margin: 0 0 1.2rem; li { flex: 1; display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.8rem; border-radius: 999px; background: rgba(246,239,214,0.12); font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: background 0.2s; span { width: 26px; height: 26px; border-radius: 50%; background: rgba(246,239,214,0.25); display: inline-flex; align-items: center; justify-content: center; font-size: 0.78rem; } &.on { background: #f6efd6; color: #1f5fd6; span { background: #1f5fd6; color: #f6efd6; } } &.done span { background: #2aa876; color: #fff; } } @media (max-width: 719px) { li { padding: 0.5rem; font-size: 0; span { font-size: 0.78rem; } &.on { font-size: 0.8rem; } } } }
.co-layout { display: grid; grid-template-columns: 1fr; gap: 1rem; @media (min-width: 900px) { grid-template-columns: minmax(0, 1fr) 340px; align-items: start; } }
.co-side { @media (min-width: 900px) { position: sticky; top: 1rem; } }
.co-summary { h3 { display: flex; align-items: center; gap: 0.5rem; i { color: #e8572b; } .chip { margin-left: auto; font-family: 'Nunito', sans-serif; font-size: 0.75rem; font-weight: 800; background: #e8572b; color: #fff; border-radius: 999px; padding: 0.15rem 0.6rem; } } }
.card-s h3 { display: flex; align-items: center; gap: 0.5rem; i { color: #e8572b; font-size: 1rem; } }
.co-mode { margin-bottom: 1rem; width: 100%; button { flex: 1; justify-content: center; } }
.pickup-box { display: flex; gap: 0.8rem; align-items: center; background: #f6efd6; border-radius: 14px; padding: 0.9rem 1rem; margin-bottom: 0.9rem; i { color: #1f5fd6; font-size: 1.4rem; } }
.co-nav { display: flex; justify-content: space-between; gap: 0.6rem; margin-top: 0.4rem; .primary { flex: 1; } }
.pay-ico { width: 28px; text-align: center; color: #1f5fd6; font-size: 1.1rem; }
.co-review { background: #f6efd6; border-radius: 12px; padding: 0.7rem 0.9rem; margin: 1rem 0; p { margin: 0.25rem 0; font-size: 0.92rem; i { color: #e8572b; width: 18px; } .link-btn { font-size: 0.72rem; padding: 0 0.3rem; color: #1f5fd6; } } }
.step-enter-active { transition: opacity 0.3s ease, transform 0.3s cubic-bezier(.2,.8,.2,1); }
.step-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.step-enter-from { opacity: 0; transform: translateX(24px); }
.step-leave-to { opacity: 0; transform: translateX(-16px); }
</style>
