<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { shopApi, shopErrorMessage, type ShopProduct, type Storefront } from '@/services/shopApi'
import { useCartStore } from '@/stores/cart'
import { money } from '@/utils/format'
import CrabVideo from '@/components/shop/CrabVideo.vue'

const router = useRouter()
const cart = useCartStore()
const data = ref<Storefront | null>(null)
const error = ref('')
const slow = ref(false)
const search = ref('')
const activeCat = ref('')
const cartOpen = ref(false)
const picking = ref<ShopProduct | null>(null)
const pickQty = ref(1)
const pickNotes = ref('')
const pickChoices = ref<Record<string, string[]>>({})
const branchOpen = ref(false)
const scrolled = ref(false)
let slowTimer = 0
let observer: IntersectionObserver | null = null

const HERO_MAIN = 'https://res.cloudinary.com/tmm85q7f/image/upload/f_auto,q_auto,w_1100,c_limit/v1793158466/la-pata-gorda/menu/combo-cangrejos-criollos.jpg'
const HERO_SMALL = 'https://res.cloudinary.com/tmm85q7f/image/upload/f_auto,q_auto,w_600,h_600,c_fill,g_auto/v1793158461/la-pata-gorda/menu/ceviche-de-cangrejo.jpg'

async function load() {
  error.value = ''; slow.value = false
  clearTimeout(slowTimer); slowTimer = window.setTimeout(() => { slow.value = true }, 9000)
  try { data.value = await shopApi.storefront(); if (!cart.branch || !data.value.branches.some((b) => b.id === cart.branch)) branchOpen.value = false } catch (err) { error.value = shopErrorMessage(err) } finally { clearTimeout(slowTimer) }
}
function onScroll() { scrolled.value = window.scrollY > 10 }
onMounted(() => { load(); window.addEventListener('scroll', onScroll, { passive: true }) })
onUnmounted(() => { window.removeEventListener('scroll', onScroll); observer?.disconnect() })
watch(data, async (d) => { if (!d) return; await new Promise((r) => setTimeout(r, 50)); observer = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); observer?.unobserve(e.target) } }), { threshold: 0.12 }); document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el)) })

const branch = computed(() => data.value?.branches.find((b) => b.id === cart.branch) ?? null)
const cities = computed(() => { const m = new Map<string, Storefront['branches']>(); for (const b of data.value?.branches ?? []) m.set(b.city, [...(m.get(b.city) ?? []), b]); return [...m.entries()] })
const products = computed(() => (data.value?.products ?? []).filter((p) => !branch.value || !p.excludedBranches.includes(branch.value.id)).filter((p) => !search.value || p.name.toLowerCase().includes(search.value.toLowerCase()) || p.description.toLowerCase().includes(search.value.toLowerCase())))
const sections = computed(() => (data.value?.categories ?? []).map((c) => ({ ...c, products: products.value.filter((p) => p.category === c.id) })).filter((c) => c.products.length))
const featured = computed(() => products.value.filter((p) => p.featured).slice(0, 8))
const hours = computed(() => data.value?.branches[0]?.hours ?? '12:00-22:00')
watch(() => cart.type, (t) => { if (t === 'domicilio' && branch.value && !branch.value.deliveryEnabled) cart.type = 'retiro' })
function selectBranch(id: string) { cart.branch = id; branchOpen.value = false; const b = data.value?.branches.find((x) => x.id === id); if (b && cart.type === 'domicilio' && !b.deliveryEnabled) cart.type = 'retiro' }
function needBranch(then: () => void) { if (!branch.value) { branchOpen.value = true; pendingAction = then } else then() }
let pendingAction: (() => void) | null = null
watch(branch, (b) => { if (b && pendingAction) { const f = pendingAction; pendingAction = null; f() } })
function open(p: ShopProduct) { needBranch(() => { picking.value = p; pickQty.value = 1; pickNotes.value = ''; pickChoices.value = Object.fromEntries(p.options.map((o) => [o.name, o.required && o.max === 1 && o.choices[0] ? [o.choices[0].label] : []])) }) }
function toggleChoice(optName: string, max: number, label: string) { const cur = pickChoices.value[optName] ?? []; if (max === 1) { pickChoices.value[optName] = [label]; return } pickChoices.value[optName] = cur.includes(label) ? cur.filter((x) => x !== label) : cur.length < max ? [...cur, label] : cur }
const pickValid = computed(() => Boolean(picking.value && picking.value.options.every((o) => !o.required || (pickChoices.value[o.name]?.length ?? 0) > 0)))
const pickPrice = computed(() => { if (!picking.value) return 0; let p = picking.value.price; for (const o of picking.value.options) for (const l of pickChoices.value[o.name] ?? []) p += o.choices.find((c) => c.label === l)?.price ?? 0; return p * pickQty.value })
function addToCart() { if (!picking.value || !pickValid.value) return; const opts = picking.value.options.flatMap((o) => (pickChoices.value[o.name] ?? []).map((l) => ({ name: o.name, choice: l, price: o.choices.find((c) => c.label === l)?.price ?? 0 }))); cart.add(picking.value, pickQty.value, opts, pickNotes.value.trim()); picking.value = null; cartOpen.value = true }
function scrollTo(id: string) { activeCat.value = id; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
const deliveryFee = computed(() => (cart.type === 'domicilio' ? branch.value?.deliveryFee ?? 0 : 0))
const minOk = computed(() => !branch.value?.minOrder || cart.subtotal >= branch.value.minOrder)
function goCheckout() { if (!cart.lines.length || !branch.value) return; cartOpen.value = false; router.push('/tienda/checkout') }
</script>
<template>
  <div class="store">
    <Transition name="splash"><div v-if="!data && !error" class="splash"><img src="/brand/logo.svg" alt="La Pata Gorda" class="splash-logo" /><p class="splash-text">Preparando el menú…</p><span class="splash-bar"><span /></span><button v-if="slow" type="button" class="btn-hero ghost retry" @click="load"><i class="fa-solid fa-rotate" /> Está tardando, reintentar</button></div></Transition>

    <div class="topline"><span><i class="fa-solid fa-clock" /> Todos los días {{ hours.replace('-', ' a ') }}</span><span class="topline-r"><i class="fa-solid fa-location-dot" /> Guayaquil · Samborondón · Quito · Manta · Ambato · Miami</span></div>
    <header class="store-top" :class="{ scrolled }">
      <div class="store-top-inner">
        <nav class="nav-l"><button type="button" @click="scrollTo('menu')">Menú</button><button type="button" class="only-desk" @click="branchOpen = true">Locales</button><button type="button" class="only-desk" @click="scrollTo('historia')">Nuestro cangrejo</button></nav>
        <RouterLink to="/" class="logo-c"><img src="/brand/logo.svg" alt="La Pata Gorda" /></RouterLink>
        <nav class="nav-r"><RouterLink to="/tienda/reservar" class="only-desk">Reservar mesa</RouterLink><button type="button" class="cart-btn" @click="cartOpen = true"><i class="fa-solid fa-basket-shopping" /> <span class="only-desk">Mi pedido</span><span v-if="cart.count" class="count">{{ cart.count }}</span></button></nav>
      </div>
    </header>

    <main>
      <p v-if="error" class="store-error"><i class="fa-solid fa-triangle-exclamation" /> {{ error }} <button type="button" class="btn-hero ghost" style="margin-left:0.5rem" @click="load">Reintentar</button></p>
      <template v-else-if="data">
        <!-- Hero -->
        <section class="hero">
          <div class="hero-text">
            <p class="eyebrow">Cangrejo y mariscos desde 2010</p>
            <h1>Cangrejo de verdad,<br /><em>patas bien gordas.</em></h1>
            <p class="lead">Chopsué, cangrejos criollos, ceviches y conchas: todo el menú de La Pata Gorda para retirar en el local o recibir en tu casa.</p>
            <div class="hero-ctas"><button type="button" class="btn-hero" @click="needBranch(() => scrollTo('menu'))"><i class="fa-solid fa-basket-shopping" /> Pedir ahora</button><RouterLink to="/tienda/reservar" class="btn-hero ghost"><i class="fa-solid fa-calendar-check" /> Reservar mesa</RouterLink></div>
          </div>
          <div class="hero-art"><span class="blob-deco" /><img class="blob-main" :src="HERO_MAIN" alt="Cangrejos criollos de La Pata Gorda" /><img class="blob-small" :src="HERO_SMALL" alt="Ceviche de cangrejo" /><span class="hero-badge">¡Recién salidos de la olla!</span></div>
        </section>

        <!-- Favoritos -->
        <section v-if="featured.length" class="band band-cream reveal"><div class="band-inner">
          <p class="section-kicker">Los favoritos</p>
          <h2 class="section-title">Lo que más <em>se pide</em></h2>
          <p class="section-lead">Los platos que nuestra gente repite una y otra vez. Toca uno para pedirlo.</p>
          <div class="medallions"><button v-for="p in featured" :key="p.id" type="button" class="medal" @click="open(p)"><span class="ring"><img :src="p.image" :alt="p.name" loading="lazy" /></span><h3>{{ p.name }}</h3><span class="price">{{ money(p.price) }}</span></button></div>
        </div></section>

        <!-- Historia del cangrejo (scroll) -->
        <section id="historia" class="band band-blue" style="padding-top:1rem;padding-bottom:1rem"><div class="band-inner"><CrabVideo /></div></section>

        <!-- Menú -->
        <section id="menu" class="menu-band"><div class="band-inner" style="max-width:1240px;margin:0 auto">
          <p class="section-kicker">El menú</p>
          <h2 class="section-title">Para <em>todos</em> los antojos</h2>
          <p class="section-lead">Elige tu local, cómo lo quieres y arma tu pedido. Lo preparan en el mismo local que tú eliges.</p>
          <div class="menu-tools">
            <button class="branch-btn" type="button" @click="branchOpen = true"><i class="fa-solid fa-location-dot" /><span v-if="branch"><strong>{{ branch.name }}</strong><small>{{ cart.type === 'retiro' ? `Retiro · listo en ~${branch.prepMinutes} min` : `A domicilio · envío ${money(branch.deliveryFee)}` }}</small></span><span v-else><strong>Elige tu local</strong></span><i class="fa-solid fa-chevron-down" /></button>
            <div class="mode"><button type="button" :class="{ on: cart.type === 'retiro' }" :disabled="branch ? !branch.pickupEnabled : false" @click="cart.type = 'retiro'"><i class="fa-solid fa-store" /> Retiro</button><button type="button" :class="{ on: cart.type === 'domicilio' }" :disabled="branch ? !branch.deliveryEnabled : false" @click="cart.type = 'domicilio'"><i class="fa-solid fa-motorcycle" /> Domicilio</button></div>
            <div class="search"><i class="fa-solid fa-magnifying-glass" /><input v-model="search" placeholder="Buscar un plato…" /></div>
            <nav class="cats"><button v-for="c in sections" :key="c.id" type="button" :class="{ active: activeCat === `cat-${c.id}` }" @click="scrollTo(`cat-${c.id}`)">{{ c.name }}</button></nav>
          </div>
          <div v-for="c in sections" :id="`cat-${c.id}`" :key="c.id" class="cat">
            <h2>{{ c.name }} <small>{{ c.products.length }} {{ c.products.length === 1 ? 'plato' : 'platos' }}</small></h2>
            <div class="grid"><button v-for="p in c.products" :key="p.id" type="button" class="pcard" @click="open(p)"><div class="pimg"><img v-if="p.image" :src="p.image" :alt="p.name" loading="lazy" /><i v-else class="fa-solid fa-utensils" /><span class="add"><i class="fa-solid fa-plus" /></span></div><div class="ptext"><strong>{{ p.name }}</strong><p>{{ p.description }}</p><span class="price">{{ money(p.price) }}</span></div></button></div>
          </div>
          <p v-if="!sections.length" class="section-lead">No encontramos platos con "{{ search }}".</p>
        </div></section>

        <footer class="store-foot"><div class="foot-inner">
          <div><img src="/brand/logo.svg" alt="La Pata Gorda" style="width:110px;height:110px;border-radius:50%;margin-bottom:1rem" /><h4>La Pata Gorda</h4><p style="opacity:0.8;margin:0">Cangrejo y mariscos ecuatorianos desde 2010. Guayaquil, Samborondón, Quito, Manta, Ambato y Coral Gables.</p><p v-if="data.whatsapp" style="margin-top:0.8rem"><i class="fa-brands fa-whatsapp" /> {{ data.whatsapp }} · <a href="https://www.instagram.com/lapatagorda/" target="_blank" rel="noopener"><i class="fa-brands fa-instagram" /> @lapatagorda</a></p></div>
          <div><h4>Nuestros locales</h4><ul class="locs"><li v-for="b in data.branches" :key="b.id"><strong>{{ b.name }}</strong><small>{{ b.address }} · {{ b.city }}<br />{{ b.hours }}{{ b.deliveryEnabled ? ' · domicilio' : '' }}</small></li></ul><p class="copy">© {{ new Date().getFullYear() }} LA PATA GORDA · PEDIDOS EN LÍNEA</p></div>
        </div></footer>
      </template>
    </main>

    <!-- Local -->
    <div v-if="branchOpen && data" class="sheet-bg" @click.self="branchOpen = false"><div class="sheet"><button type="button" class="close" @click="branchOpen = false"><i class="fa-solid fa-xmark" /></button><h3>¿En qué local pides?</h3><p class="muted">Cada local prepara y entrega sus propios pedidos.</p><div v-for="[city, list] in cities" :key="city" class="city"><p class="city-name">{{ city }}</p><button v-for="b in list" :key="b.id" type="button" class="branch-opt" :class="{ on: b.id === cart.branch }" @click="selectBranch(b.id)"><span><strong>{{ b.name }}</strong><small>{{ b.address }} · {{ b.hours }}</small></span><span class="tags"><span v-if="b.pickupEnabled" class="tag">Retiro</span><span v-if="b.deliveryEnabled" class="tag">Domicilio {{ money(b.deliveryFee) }}</span></span></button></div></div></div>

    <!-- Producto -->
    <div v-if="picking" class="sheet-bg" @click.self="picking = null"><div class="sheet product"><button type="button" class="close" @click="picking = null"><i class="fa-solid fa-xmark" /></button><img v-if="picking.image" :src="picking.image" :alt="picking.name" /><div class="pbody"><h3>{{ picking.name }}</h3><p class="desc">{{ picking.description }}</p>
      <div v-for="o in picking.options" :key="o.name" class="opt"><p class="opt-name">{{ o.name }} <small>{{ o.required ? 'obligatorio' : 'opcional' }}{{ o.max > 1 ? ` · hasta ${o.max}` : '' }}</small></p><div class="choices"><button v-for="ch in o.choices" :key="ch.label" type="button" :class="{ on: (pickChoices[o.name] ?? []).includes(ch.label) }" @click="toggleChoice(o.name, o.max, ch.label)">{{ ch.label }}<small v-if="ch.price"> +{{ money(ch.price) }}</small></button></div></div>
      <input v-model="pickNotes" class="notes" placeholder="Alguna indicación (sin cebolla, bien cocido…)" maxlength="200" />
      <div class="pfoot"><div class="qty"><button type="button" @click="pickQty = Math.max(1, pickQty - 1)">−</button><span>{{ pickQty }}</span><button type="button" @click="pickQty = Math.min(20, pickQty + 1)">+</button></div><button type="button" class="cta" :disabled="!pickValid" @click="addToCart">Agregar · {{ money(pickPrice) }}</button></div></div></div></div>

    <!-- Carrito -->
    <div v-if="cartOpen" class="sheet-bg" @click.self="cartOpen = false"><div class="sheet cart"><div class="cart-head"><h3>Tu pedido</h3><button type="button" class="close" @click="cartOpen = false"><i class="fa-solid fa-xmark" /></button></div>
      <p v-if="branch" class="muted"><i class="fa-solid fa-location-dot" /> {{ branch.name }} · {{ cart.type === 'retiro' ? 'retiro en local' : 'a domicilio' }}</p>
      <p v-if="!cart.lines.length" class="muted" style="padding:1rem 0">Todavía no has agregado nada. <button type="button" class="link-btn" style="padding:0" @click="cartOpen = false; scrollTo('menu')">Ver el menú</button></p>
      <ul v-else class="cart-lines"><li v-for="l in cart.lines" :key="l.key"><div class="cl-text"><strong>{{ l.product.name }}</strong><small v-if="l.options.length">{{ l.options.map((o) => o.choice).join(', ') }}</small><small v-if="l.notes">“{{ l.notes }}”</small></div><div class="qty sm"><button type="button" @click="cart.setQty(l.key, l.qty - 1)">−</button><span>{{ l.qty }}</span><button type="button" @click="cart.setQty(l.key, l.qty + 1)">+</button></div><span class="cl-price">{{ money(cart.unit(l) * l.qty) }}</span></li></ul>
      <div v-if="cart.lines.length" class="totals"><div><span>Subtotal</span><span>{{ money(cart.subtotal) }}</span></div><div v-if="cart.type === 'domicilio'"><span>Envío</span><span>{{ money(deliveryFee) }}</span></div><div class="grand"><span>Total</span><span>{{ money(cart.subtotal + deliveryFee) }}</span></div><p v-if="!minOk" class="warn-text">Pedido mínimo en {{ branch?.name }}: {{ money(branch?.minOrder) }}</p><button type="button" class="cta" :disabled="!minOk || !branch" @click="goCheckout">Continuar</button><button type="button" class="link-btn" @click="cart.clear()">Vaciar</button></div></div></div>
    <button v-if="cart.count && !cartOpen" type="button" class="cart-fab" @click="cartOpen = true"><i class="fa-solid fa-basket-shopping" /> Ver pedido ({{ cart.count }}) · {{ money(cart.subtotal) }}</button>
  </div>
</template>
<style lang="scss">
@use '@/styles/shop';
</style>
