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
const justAdded = ref('')
let slowTimer = 0
let addedTimer = 0
let observer: IntersectionObserver | null = null
let catObserver: IntersectionObserver | null = null

const HERO_MAIN = 'https://res.cloudinary.com/tmm85q7f/image/upload/f_auto,q_auto,w_1100,c_limit/v1793158466/la-pata-gorda/menu/combo-cangrejos-criollos.jpg'
const HERO_SMALL = 'https://res.cloudinary.com/tmm85q7f/image/upload/f_auto,q_auto,w_600,h_600,c_fill,g_auto/v1793158461/la-pata-gorda/menu/ceviche-de-cangrejo.jpg'
const thumb = (url: string) => (url.includes('res.cloudinary.com') ? url.replace(/\/upload\/[^/]*\//, '/upload/f_auto,q_auto,w_320,h_320,c_fill,g_auto/') : url)

async function load() {
  error.value = ''; slow.value = false
  clearTimeout(slowTimer); slowTimer = window.setTimeout(() => { slow.value = true }, 9000)
  try { data.value = await shopApi.storefront() } catch (err) { error.value = shopErrorMessage(err) } finally { clearTimeout(slowTimer) }
}
function onScroll() { scrolled.value = window.scrollY > 10 }
onMounted(() => { load(); window.addEventListener('scroll', onScroll, { passive: true }) })
onUnmounted(() => { window.removeEventListener('scroll', onScroll); observer?.disconnect(); catObserver?.disconnect() })
watch(data, async (d) => {
  if (!d) return
  await new Promise((r) => setTimeout(r, 50))
  observer = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); observer?.unobserve(e.target) } }), { threshold: 0.12 })
  document.querySelectorAll('.reveal').forEach((el) => observer?.observe(el))
  catObserver = new IntersectionObserver((es) => { const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (vis) activeCat.value = vis.target.id }, { rootMargin: '-140px 0px -60% 0px', threshold: 0 })
  document.querySelectorAll('.cat').forEach((el) => catObserver?.observe(el))
})

const branch = computed(() => data.value?.branches.find((b) => b.id === cart.branch) ?? null)
const cities = computed(() => { const m = new Map<string, Storefront['branches']>(); for (const b of data.value?.branches ?? []) m.set(b.city, [...(m.get(b.city) ?? []), b]); return [...m.entries()] })
const products = computed(() => (data.value?.products ?? []).filter((p) => !branch.value || !p.excludedBranches.includes(branch.value.id)).filter((p) => !search.value || p.name.toLowerCase().includes(search.value.toLowerCase()) || p.description.toLowerCase().includes(search.value.toLowerCase())))
const sections = computed(() => (data.value?.categories ?? []).map((c) => ({ ...c, products: products.value.filter((p) => p.category === c.id) })).filter((c) => c.products.length))
const featured = computed(() => products.value.filter((p) => p.featured).slice(0, 8))
const hours = computed(() => data.value?.branches[0]?.hours ?? '12:00-22:00')
watch(() => cart.type, (t) => { if (t === 'domicilio' && branch.value && !branch.value.deliveryEnabled) cart.type = 'retiro' })
let pendingAction: (() => void) | null = null
function selectBranch(id: string) { cart.branch = id; branchOpen.value = false; const b = data.value?.branches.find((x) => x.id === id); if (b && cart.type === 'domicilio' && !b.deliveryEnabled) cart.type = 'retiro'; if (pendingAction) { const f = pendingAction; pendingAction = null; setTimeout(f, 50) } }
function needBranch(then: () => void) { if (!branch.value) { pendingAction = then; cartOpen.value = false; picking.value = null; branchOpen.value = true } else then() }
const inCart = (p: ShopProduct) => cart.lines.filter((l) => l.product.id === p.id).reduce((a, l) => a + l.qty, 0)
const hasRequired = (p: ShopProduct) => p.options.some((o) => o.required)
function flash(id: string) { justAdded.value = id; clearTimeout(addedTimer); addedTimer = window.setTimeout(() => { justAdded.value = '' }, 1200) }
/** Un toque: si el plato no tiene opciones obligatorias se agrega directo; si las tiene, se abre la ficha. */
function quickAdd(p: ShopProduct) { needBranch(() => { if (hasRequired(p)) { openPick(p); return } cart.add(p, 1, [], ''); flash(p.id) }) }
function minus(p: ShopProduct) { const line = [...cart.lines].reverse().find((l) => l.product.id === p.id); if (line) cart.setQty(line.key, line.qty - 1) }
function openPick(p: ShopProduct) { picking.value = p; pickQty.value = 1; pickNotes.value = ''; pickChoices.value = Object.fromEntries(p.options.map((o) => [o.name, o.required && o.max === 1 && o.choices[0] ? [o.choices[0].label] : []])) }
function open(p: ShopProduct) { needBranch(() => openPick(p)) }
function toggleChoice(optName: string, max: number, label: string) { const cur = pickChoices.value[optName] ?? []; if (max === 1) { pickChoices.value[optName] = [label]; return } pickChoices.value[optName] = cur.includes(label) ? cur.filter((x) => x !== label) : cur.length < max ? [...cur, label] : cur }
const pickValid = computed(() => Boolean(picking.value && picking.value.options.every((o) => !o.required || (pickChoices.value[o.name]?.length ?? 0) > 0)))
const pickPrice = computed(() => { if (!picking.value) return 0; let p = picking.value.price; for (const o of picking.value.options) for (const l of pickChoices.value[o.name] ?? []) p += o.choices.find((c) => c.label === l)?.price ?? 0; return p * pickQty.value })
function addToCart() { if (!picking.value || !pickValid.value) return; const opts = picking.value.options.flatMap((o) => (pickChoices.value[o.name] ?? []).map((l) => ({ name: o.name, choice: l, price: o.choices.find((c) => c.label === l)?.price ?? 0 }))); cart.add(picking.value, pickQty.value, opts, pickNotes.value.trim()); flash(picking.value.id); picking.value = null }
function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
const deliveryFee = computed(() => (cart.type === 'domicilio' ? branch.value?.deliveryFee ?? 0 : 0))
const minOk = computed(() => !branch.value?.minOrder || cart.subtotal >= branch.value.minOrder)
const total = computed(() => Math.round((cart.subtotal + deliveryFee.value) * 100) / 100)
function goCheckout() { if (!cart.lines.length) return; needBranch(() => { cartOpen.value = false; router.push('/tienda/checkout') }) }
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
        <section class="hero">
          <div class="hero-text">
            <p class="eyebrow">Cangrejo y mariscos desde 2010</p>
            <h1>Cangrejo de verdad,<br /><em>patas bien gordas.</em></h1>
            <p class="lead">Chopsué, cangrejos criollos, ceviches y conchas: todo el menú de La Pata Gorda para retirar en el local o recibir en tu casa.</p>
            <div class="hero-ctas"><button type="button" class="btn-hero" @click="needBranch(() => scrollTo('menu'))"><i class="fa-solid fa-basket-shopping" /> Pedir ahora</button><RouterLink to="/tienda/reservar" class="btn-hero ghost"><i class="fa-solid fa-calendar-check" /> Reservar mesa</RouterLink></div>
          </div>
          <div class="hero-art"><span class="blob-deco" /><img class="blob-main" :src="HERO_MAIN" alt="Cangrejos criollos de La Pata Gorda" /><img class="blob-small" :src="HERO_SMALL" alt="Ceviche de cangrejo" /><span class="hero-badge">¡Recién salidos de la olla!</span></div>
        </section>

        <section v-if="featured.length" class="band band-cream reveal"><div class="band-inner">
          <p class="section-kicker">Los favoritos</p>
          <h2 class="section-title">Lo que más <em>se pide</em></h2>
          <p class="section-lead">Los platos que nuestra gente repite una y otra vez. Toca uno para pedirlo.</p>
          <div class="medallions"><button v-for="p in featured" :key="p.id" type="button" class="medal" @click="open(p)"><span class="ring"><img :src="p.image" :alt="p.name" loading="lazy" /></span><h3>{{ p.name }}</h3><span class="price">{{ money(p.price) }}</span></button></div>
        </div></section>

        <section id="historia" class="band band-blue" style="padding-top:1rem;padding-bottom:1rem"><div class="band-inner"><CrabVideo /></div></section>

        <!-- Menú para pedir -->
        <section id="menu" class="menu-band"><div class="band-inner">
          <p class="section-kicker">El menú</p>
          <h2 class="section-title">Para <em>todos</em> los antojos</h2>
          <div class="order-bar">
            <button class="branch-btn" type="button" @click="branchOpen = true"><i class="fa-solid fa-location-dot" /><span v-if="branch"><strong>{{ branch.name }}</strong><small>{{ cart.type === 'retiro' ? `Retiro · listo en ~${branch.prepMinutes} min` : `A domicilio · envío ${money(branch.deliveryFee)}` }}</small></span><span v-else><strong>1. Elige tu local</strong><small>para ver el menú de ese local</small></span><i class="fa-solid fa-chevron-down" /></button>
            <div class="mode"><button type="button" :class="{ on: cart.type === 'retiro' }" :disabled="branch ? !branch.pickupEnabled : false" @click="cart.type = 'retiro'"><i class="fa-solid fa-store" /> Retiro</button><button type="button" :class="{ on: cart.type === 'domicilio' }" :disabled="branch ? !branch.deliveryEnabled : false" @click="cart.type = 'domicilio'"><i class="fa-solid fa-motorcycle" /> Domicilio</button></div>
            <div class="search"><i class="fa-solid fa-magnifying-glass" /><input v-model="search" placeholder="Buscar un plato…" /></div>
          </div>
          <nav class="cats cats-mobile"><button v-for="c in sections" :key="c.id" type="button" :class="{ active: activeCat === `cat-${c.id}` }" @click="scrollTo(`cat-${c.id}`)">{{ c.name }}</button></nav>

          <div class="menu-layout">
            <aside class="cat-side"><p class="cat-side-title">Categorías</p><button v-for="c in sections" :key="c.id" type="button" :class="{ active: activeCat === `cat-${c.id}` }" @click="scrollTo(`cat-${c.id}`)">{{ c.name }} <span>{{ c.products.length }}</span></button></aside>

            <div class="menu-list">
              <div v-for="c in sections" :id="`cat-${c.id}`" :key="c.id" class="cat">
                <h2>{{ c.name }}</h2>
                <div class="rows">
                  <article v-for="p in c.products" :key="p.id" class="prow" :class="{ added: justAdded === p.id, has: inCart(p) }">
                    <button type="button" class="prow-main" @click="open(p)"><div class="prow-text"><strong>{{ p.name }}</strong><p>{{ p.description }}</p><span class="price">{{ money(p.price) }}<small v-if="hasRequired(p)"> · elige opciones</small></span></div><div class="prow-img"><img v-if="p.image" :src="thumb(p.image)" :alt="p.name" loading="lazy" /><i v-else class="fa-solid fa-utensils" /></div></button>
                    <div class="prow-add">
                      <div v-if="inCart(p)" class="stepper"><button type="button" aria-label="Quitar uno" @click="minus(p)"><i class="fa-solid" :class="inCart(p) === 1 ? 'fa-trash-can' : 'fa-minus'" /></button><span>{{ inCart(p) }}</span><button type="button" aria-label="Agregar uno" @click="quickAdd(p)"><i class="fa-solid fa-plus" /></button></div>
                      <button v-else type="button" class="add-btn" @click="quickAdd(p)"><i class="fa-solid fa-plus" /> Agregar</button>
                    </div>
                  </article>
                </div>
              </div>
              <p v-if="!sections.length" class="section-lead">No encontramos platos con "{{ search }}".</p>
            </div>

            <aside class="cart-side">
              <div class="cart-panel">
                <h3><i class="fa-solid fa-basket-shopping" /> Tu pedido <span v-if="cart.count" class="chip">{{ cart.count }}</span></h3>
                <button type="button" class="cart-where" @click="branchOpen = true"><i class="fa-solid fa-location-dot" /><span v-if="branch">{{ branch.name }} · {{ cart.type === 'retiro' ? 'retiro' : 'domicilio' }}</span><span v-else>Elige tu local</span><i class="fa-solid fa-pen" /></button>
                <p v-if="!cart.lines.length" class="cart-empty">Todavía no has agregado nada.<br /><small>Toca <strong>Agregar</strong> en cualquier plato.</small></p>
                <ul v-else class="cart-lines"><li v-for="l in cart.lines" :key="l.key"><div class="cl-text"><strong>{{ l.product.name }}</strong><small v-if="l.options.length">{{ l.options.map((o) => o.choice).join(', ') }}</small><small v-if="l.notes">“{{ l.notes }}”</small></div><div class="stepper sm"><button type="button" @click="cart.setQty(l.key, l.qty - 1)"><i class="fa-solid" :class="l.qty === 1 ? 'fa-trash-can' : 'fa-minus'" /></button><span>{{ l.qty }}</span><button type="button" @click="cart.setQty(l.key, l.qty + 1)"><i class="fa-solid fa-plus" /></button></div><span class="cl-price">{{ money(cart.unit(l) * l.qty) }}</span></li></ul>
                <div v-if="cart.lines.length" class="totals"><div><span>Subtotal</span><span>{{ money(cart.subtotal) }}</span></div><div v-if="cart.type === 'domicilio'"><span>Envío</span><span>{{ money(deliveryFee) }}</span></div><div class="grand"><span>Total</span><span>{{ money(total) }}</span></div><p v-if="!minOk" class="warn-text">Pedido mínimo en {{ branch?.name }}: {{ money(branch?.minOrder) }}</p><button type="button" class="cta" :disabled="!minOk" @click="goCheckout">Continuar al pago <i class="fa-solid fa-arrow-right" /></button><p class="hint-s" style="text-align:center;margin:0.5rem 0 0">Pagas con tarjeta, en el local o al recibir.</p></div>
              </div>
            </aside>
          </div>
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

    <!-- Carrito (celular) -->
    <div v-if="cartOpen" class="sheet-bg" @click.self="cartOpen = false"><div class="sheet cart"><div class="cart-head"><h3>Tu pedido</h3><button type="button" class="close" @click="cartOpen = false"><i class="fa-solid fa-xmark" /></button></div>
      <button type="button" class="cart-where" @click="cartOpen = false; branchOpen = true"><i class="fa-solid fa-location-dot" /><span v-if="branch">{{ branch.name }} · {{ cart.type === 'retiro' ? 'retiro en local' : 'a domicilio' }}</span><span v-else>Elige tu local</span><i class="fa-solid fa-pen" /></button>
      <p v-if="!cart.lines.length" class="cart-empty">Todavía no has agregado nada. <button type="button" class="link-btn" style="padding:0" @click="cartOpen = false; scrollTo('menu')">Ver el menú</button></p>
      <ul v-else class="cart-lines"><li v-for="l in cart.lines" :key="l.key"><div class="cl-text"><strong>{{ l.product.name }}</strong><small v-if="l.options.length">{{ l.options.map((o) => o.choice).join(', ') }}</small><small v-if="l.notes">“{{ l.notes }}”</small></div><div class="stepper sm"><button type="button" @click="cart.setQty(l.key, l.qty - 1)"><i class="fa-solid" :class="l.qty === 1 ? 'fa-trash-can' : 'fa-minus'" /></button><span>{{ l.qty }}</span><button type="button" @click="cart.setQty(l.key, l.qty + 1)"><i class="fa-solid fa-plus" /></button></div><span class="cl-price">{{ money(cart.unit(l) * l.qty) }}</span></li></ul>
      <div v-if="cart.lines.length" class="totals"><div><span>Subtotal</span><span>{{ money(cart.subtotal) }}</span></div><div v-if="cart.type === 'domicilio'"><span>Envío</span><span>{{ money(deliveryFee) }}</span></div><div class="grand"><span>Total</span><span>{{ money(total) }}</span></div><p v-if="!minOk" class="warn-text">Pedido mínimo en {{ branch?.name }}: {{ money(branch?.minOrder) }}</p><button type="button" class="cta" :disabled="!minOk" @click="goCheckout">Continuar al pago</button><button type="button" class="link-btn" @click="cart.clear()">Vaciar</button></div></div></div>
    <button v-if="cart.count && !cartOpen" type="button" class="cart-fab" @click="cartOpen = true"><i class="fa-solid fa-basket-shopping" /> Ver pedido ({{ cart.count }}) · {{ money(total) }}</button>
  </div>
</template>
<style lang="scss">
@use '@/styles/shop';
</style>
