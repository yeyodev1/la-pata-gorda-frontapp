<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shopApi, shopErrorMessage, type ShopProduct, type Storefront } from '@/services/shopApi'
import { useCartStore } from '@/stores/cart'
import { money } from '@/utils/format'
import CrabLoader from '@/components/ui/CrabLoader.vue'

const router = useRouter()
const cart = useCartStore()
const data = ref<Storefront | null>(null)
const error = ref('')
const search = ref('')
const activeCat = ref('')
const cartOpen = ref(false)
const picking = ref<ShopProduct | null>(null)
const pickQty = ref(1)
const pickNotes = ref('')
const pickChoices = ref<Record<string, string[]>>({})
const branchOpen = ref(false)

onMounted(async () => { try { data.value = await shopApi.storefront(); if (!cart.branch || !data.value.branches.some((b) => b.id === cart.branch)) branchOpen.value = true } catch (err) { error.value = shopErrorMessage(err) } })
const branch = computed(() => data.value?.branches.find((b) => b.id === cart.branch) ?? null)
const cities = computed(() => { const m = new Map<string, Storefront['branches']>(); for (const b of data.value?.branches ?? []) m.set(b.city, [...(m.get(b.city) ?? []), b]); return [...m.entries()] })
const products = computed(() => (data.value?.products ?? []).filter((p) => !branch.value || !p.excludedBranches.includes(branch.value.id)).filter((p) => !search.value || p.name.toLowerCase().includes(search.value.toLowerCase()) || p.description.toLowerCase().includes(search.value.toLowerCase())))
const sections = computed(() => (data.value?.categories ?? []).map((c) => ({ ...c, products: products.value.filter((p) => p.category === c.id) })).filter((c) => c.products.length))
const featured = computed(() => products.value.filter((p) => p.featured).slice(0, 8))
watch(() => cart.type, (t) => { if (t === 'domicilio' && branch.value && !branch.value.deliveryEnabled) cart.type = 'retiro' })
function selectBranch(id: string) { cart.branch = id; branchOpen.value = false; const b = data.value?.branches.find((x) => x.id === id); if (b && cart.type === 'domicilio' && !b.deliveryEnabled) cart.type = 'retiro' }
function open(p: ShopProduct) { picking.value = p; pickQty.value = 1; pickNotes.value = ''; pickChoices.value = Object.fromEntries(p.options.map((o) => [o.name, o.required && o.max === 1 && o.choices[0] ? [o.choices[0].label] : []])) }
function toggleChoice(optName: string, max: number, label: string) { const cur = pickChoices.value[optName] ?? []; if (max === 1) { pickChoices.value[optName] = [label]; return } pickChoices.value[optName] = cur.includes(label) ? cur.filter((x) => x !== label) : cur.length < max ? [...cur, label] : cur }
const pickValid = computed(() => Boolean(picking.value && picking.value.options.every((o) => !o.required || (pickChoices.value[o.name]?.length ?? 0) > 0)))
const pickPrice = computed(() => { if (!picking.value) return 0; let p = picking.value.price; for (const o of picking.value.options) for (const l of pickChoices.value[o.name] ?? []) p += o.choices.find((c) => c.label === l)?.price ?? 0; return p * pickQty.value })
function addToCart() { if (!picking.value || !pickValid.value) return; const opts = picking.value.options.flatMap((o) => (pickChoices.value[o.name] ?? []).map((l) => ({ name: o.name, choice: l, price: o.choices.find((c) => c.label === l)?.price ?? 0 }))); cart.add(picking.value, pickQty.value, opts, pickNotes.value.trim()); picking.value = null; cartOpen.value = true }
function scrollTo(id: string) { activeCat.value = id; document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
const deliveryFee = computed(() => (cart.type === 'domicilio' ? branch.value?.deliveryFee ?? 0 : 0))
const minOk = computed(() => !branch.value?.minOrder || cart.subtotal >= branch.value.minOrder)
function goCheckout() { if (!cart.lines.length || !branch.value) return; cartOpen.value = false; router.push('/tienda/checkout') }
</script>
<template>
  <div class="store">
    <Transition name="splash"><div v-if="!data && !error" class="splash"><img src="/brand/logo.svg" alt="La Pata Gorda" class="splash-logo" /><CrabLoader text="Preparando el menú…" :size="170" light /></div></Transition>
    <header class="store-top">
      <div class="store-top-inner">
        <RouterLink to="/" class="logo"><img src="/brand/logo.svg" alt="La Pata Gorda" /><span><strong>La Pata Gorda</strong><small>Pedidos en línea</small></span></RouterLink>
        <button class="branch-btn" type="button" @click="branchOpen = true"><i class="fa-solid fa-location-dot" /><span v-if="branch"><strong>{{ branch.name }}</strong><small>{{ cart.type === 'retiro' ? `Retiro · listo en ~${branch.prepMinutes} min` : `A domicilio · envío ${money(branch.deliveryFee)}` }}</small></span><span v-else>Elige tu local</span><i class="fa-solid fa-chevron-down" /></button>
        <div class="top-actions"><RouterLink to="/tienda/reservar" class="link-btn"><i class="fa-solid fa-calendar-check" /> Reservar mesa</RouterLink><button class="cart-btn" type="button" @click="cartOpen = true"><i class="fa-solid fa-basket-shopping" /><span v-if="cart.count" class="count">{{ cart.count }}</span></button></div>
      </div>
      <nav v-if="sections.length" class="cats"><button v-for="c in sections" :key="c.id" type="button" :class="{ active: activeCat === c.id }" @click="scrollTo(c.id)">{{ c.name }}</button></nav>
    </header>

    <main class="store-main">
      <p v-if="error" class="store-error"><i class="fa-solid fa-triangle-exclamation" /> {{ error }}</p>
      <div v-else-if="!data" class="loading"><CrabLoader text="Preparando el menú…" :size="150" /></div>
      <template v-else>
        <section class="hero"><img class="hero-logo" src="/brand/logo.svg" alt="" /><div class="hero-text"><p class="eyebrow">Cangrejo y mariscos desde 2010 · Guayaquil</p><h1>Pide tu Chopsué, tus cangrejos criollos y todo el menú</h1><p class="lead">Retira en el local o recíbelo en casa. {{ data.whatsapp ? `¿Dudas? Escríbenos al WhatsApp ${data.whatsapp}.` : '' }}</p><div class="mode"><button type="button" :class="{ on: cart.type === 'retiro' }" :disabled="branch ? !branch.pickupEnabled : false" @click="cart.type = 'retiro'"><i class="fa-solid fa-store" /> Retiro en local</button><button type="button" :class="{ on: cart.type === 'domicilio' }" :disabled="branch ? !branch.deliveryEnabled : false" @click="cart.type = 'domicilio'"><i class="fa-solid fa-motorcycle" /> A domicilio</button></div></div></div><div class="search"><i class="fa-solid fa-magnifying-glass" /><input v-model="search" placeholder="Buscar plato… (chopsué, ceviche, conchas)" /></div></section>
        <section v-if="featured.length && !search" class="featured"><h2><i class="fa-solid fa-fire" /> Los favoritos</h2><div class="scroller"><button v-for="p in featured" :key="p.id" type="button" class="fcard" @click="open(p)"><img :src="p.image" :alt="p.name" loading="lazy" /><span class="fname">{{ p.name }}</span><span class="fprice">{{ money(p.price) }}</span></button></div></section>
        <section v-for="c in sections" :id="`cat-${c.id}`" :key="c.id" class="cat">
          <h2>{{ c.name }}</h2>
          <div class="grid"><button v-for="p in c.products" :key="p.id" type="button" class="pcard" @click="open(p)"><div class="ptext"><strong>{{ p.name }}</strong><p>{{ p.description }}</p><span class="price">{{ money(p.price) }}</span></div><div class="pimg" :class="{ empty: !p.image }"><img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" /><i v-else class="fa-solid fa-utensils" /><span class="add"><i class="fa-solid fa-plus" /></span></div></button></div>
        </section>
        <footer class="store-foot"><p>La Pata Gorda · {{ (data?.branches ?? []).map((b) => b.city).filter((v, i, a) => a.indexOf(v) === i).join(' · ') }}</p><p v-if="branch"><i class="fa-solid fa-location-dot" /> {{ branch.name }} · {{ branch.address }} · {{ branch.hours }}</p></footer>
      </template>
    </main>

    <!-- Local -->
    <div v-if="branchOpen && data" class="sheet-bg" @click.self="branch && (branchOpen = false)"><div class="sheet"><h3>¿En qué local pides?</h3><p class="muted">Cada local prepara y entrega sus propios pedidos.</p><div v-for="[city, list] in cities" :key="city" class="city"><p class="city-name">{{ city }}</p><button v-for="b in list" :key="b.id" type="button" class="branch-opt" :class="{ on: b.id === cart.branch }" @click="selectBranch(b.id)"><span><strong>{{ b.name }}</strong><small>{{ b.address }} · {{ b.hours }}</small></span><span class="tags"><span v-if="b.pickupEnabled" class="tag">Retiro</span><span v-if="b.deliveryEnabled" class="tag">Domicilio {{ money(b.deliveryFee) }}</span></span></button></div></div></div>

    <!-- Producto -->
    <div v-if="picking" class="sheet-bg" @click.self="picking = null"><div class="sheet product"><button type="button" class="close" @click="picking = null"><i class="fa-solid fa-xmark" /></button><img v-if="picking.image" :src="picking.image" :alt="picking.name" /><div class="pbody"><h3>{{ picking.name }}</h3><p class="desc">{{ picking.description }}</p>
      <div v-for="o in picking.options" :key="o.name" class="opt"><p class="opt-name">{{ o.name }} <small>{{ o.required ? 'obligatorio' : 'opcional' }}{{ o.max > 1 ? ` · hasta ${o.max}` : '' }}</small></p><div class="choices"><button v-for="ch in o.choices" :key="ch.label" type="button" :class="{ on: (pickChoices[o.name] ?? []).includes(ch.label) }" @click="toggleChoice(o.name, o.max, ch.label)">{{ ch.label }}<small v-if="ch.price"> +{{ money(ch.price) }}</small></button></div></div>
      <input v-model="pickNotes" class="notes" placeholder="Alguna indicación (sin cebolla, bien cocido…)" maxlength="200" />
      <div class="pfoot"><div class="qty"><button type="button" @click="pickQty = Math.max(1, pickQty - 1)">−</button><span>{{ pickQty }}</span><button type="button" @click="pickQty = Math.min(20, pickQty + 1)">+</button></div><button type="button" class="cta" :disabled="!pickValid" @click="addToCart">Agregar · {{ money(pickPrice) }}</button></div></div></div></div>

    <!-- Carrito -->
    <div v-if="cartOpen" class="sheet-bg" @click.self="cartOpen = false"><div class="sheet cart"><div class="cart-head"><h3>Tu pedido</h3><button type="button" class="close" @click="cartOpen = false"><i class="fa-solid fa-xmark" /></button></div>
      <p v-if="!cart.lines.length" class="muted" style="padding:1rem 0">Todavía no has agregado nada.</p>
      <ul v-else class="cart-lines"><li v-for="l in cart.lines" :key="l.key"><div class="cl-text"><strong>{{ l.product.name }}</strong><small v-if="l.options.length">{{ l.options.map((o) => o.choice).join(', ') }}</small><small v-if="l.notes">“{{ l.notes }}”</small></div><div class="qty sm"><button type="button" @click="cart.setQty(l.key, l.qty - 1)">−</button><span>{{ l.qty }}</span><button type="button" @click="cart.setQty(l.key, l.qty + 1)">+</button></div><span class="cl-price">{{ money(cart.unit(l) * l.qty) }}</span></li></ul>
      <div v-if="cart.lines.length" class="totals"><div><span>Subtotal</span><span>{{ money(cart.subtotal) }}</span></div><div v-if="cart.type === 'domicilio'"><span>Envío</span><span>{{ money(deliveryFee) }}</span></div><div class="grand"><span>Total</span><span>{{ money(cart.subtotal + deliveryFee) }}</span></div><p v-if="!minOk" class="warn-text">Pedido mínimo en {{ branch?.name }}: {{ money(branch?.minOrder) }}</p><button type="button" class="cta" :disabled="!minOk || !branch" @click="goCheckout">Continuar</button><button type="button" class="link-btn" @click="cart.clear()">Vaciar</button></div></div></div>
    <button v-if="cart.count && !cartOpen" type="button" class="cart-fab" @click="cartOpen = true"><i class="fa-solid fa-basket-shopping" /> Ver pedido ({{ cart.count }}) · {{ money(cart.subtotal) }}</button>
  </div>
</template>
<style lang="scss">
@use '@/styles/shop';
</style>
