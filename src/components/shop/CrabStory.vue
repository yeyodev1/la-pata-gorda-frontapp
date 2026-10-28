<script setup lang="ts">
/**
 * Motion graphic con scroll: el cangrejo se cocina en la olla con salsa criolla, sale con las patas
 * bien gordas y aterriza en el plato sobre la mesa. Todo es SVG + transforms (sin librerías):
 * el progreso del scroll (0 → 1) mueve cada pieza.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

const root = ref<HTMLElement | null>(null)
const progress = ref(0)
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
let raf = 0
function update() {
  raf = 0
  const el = root.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const total = r.height - window.innerHeight
  progress.value = reduced ? 1 : Math.min(1, Math.max(0, total > 0 ? -r.top / total : 1))
}
function onScroll() { if (!raf) raf = requestAnimationFrame(update) }
onMounted(() => { update(); window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll) })
onUnmounted(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) })

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const seg = (from: number, to: number) => clamp((progress.value - from) / (to - from))
const ease = (t: number) => t * t * (3 - 2 * t)
// Fases: 0–0.38 hierve en la olla · 0.38–0.72 sale de la olla · 0.72–1 cae al plato en la mesa
const boil = computed(() => ease(seg(0, 0.38)))
const lift = computed(() => ease(seg(0.38, 0.72)))
const land = computed(() => ease(seg(0.72, 1)))
const stage = computed(() => (progress.value < 0.38 ? 0 : progress.value < 0.72 ? 1 : 2))
const crabStyle = computed(() => {
  // en la olla: medio sumergido y bamboleando; sale: sube y crece; aterriza: baja al plato
  const bob = Math.sin(progress.value * 40) * 3 * (1 - lift.value)
  const y = 150 - lift.value * 150 + land.value * 215 + bob
  const scale = 0.85 + lift.value * 0.3 + land.value * 0.05
  const rot = (1 - lift.value) * 4 * Math.sin(progress.value * 30) + lift.value * (1 - land.value) * -8
  return { transform: `translate(300px, ${y}px) rotate(${rot}deg) scale(${scale})`, '--crab': `color-mix(in srgb, #7a3a1e ${Math.round((1 - boil.value) * 100)}%, #e8572b)` } as Record<string, string>
})
const potStyle = computed(() => ({ transform: `translateY(${land.value * 260}px)`, opacity: String(1 - land.value) }))
const lidStyle = computed(() => ({ transform: `translate(${lift.value * 150}px, ${-lift.value * 90}px) rotate(${lift.value * 25}deg)`, opacity: String(1 - land.value) }))
const tableStyle = computed(() => ({ transform: `translateY(${(1 - land.value) * 220}px)`, opacity: String(land.value) }))
const steamStyle = computed(() => ({ opacity: String(0.25 + boil.value * 0.6 - land.value) }))
const captions = ['Cocinamos el cangrejo en nuestra salsa criolla, en la olla, como hace 15 años.', 'Patas bien gordas, llenas de carne. Así de rojo sale.', 'Y a tu mesa: con maduro, salsa criolla y cocolón. O a tu casa.']
</script>
<template>
  <section ref="root" class="story" aria-label="Así preparamos tu cangrejo">
    <div class="story-sticky">
      <div class="story-head"><p class="story-kicker">De la olla a tu mesa</p><h2>Así preparamos tu cangrejo</h2></div>
      <div class="story-scene">
        <svg viewBox="0 0 600 520" class="scene" aria-hidden="true">
          <defs>
            <linearGradient id="potG" x1="0" x2="1"><stop offset="0" stop-color="#5b6470" /><stop offset=".5" stop-color="#8d97a3" /><stop offset="1" stop-color="#4b535e" /></linearGradient>
            <linearGradient id="salsaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a45" /><stop offset="1" stop-color="#c63a1a" /></linearGradient>
            <linearGradient id="woodG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9793a" /><stop offset="1" stop-color="#8a5423" /></linearGradient>
            <clipPath id="potClip"><rect x="140" y="250" width="320" height="200" rx="30" /></clipPath>
          </defs>
          <!-- Mesa y plato (aparecen al final) -->
          <g class="table" :style="tableStyle">
            <rect x="0" y="420" width="600" height="100" fill="url(#woodG)" />
            <ellipse cx="300" cy="430" rx="190" ry="40" fill="#f6efd6" stroke="#1f5fd6" stroke-width="6" />
            <ellipse cx="300" cy="430" rx="160" ry="30" fill="#fff8e6" />
            <ellipse cx="190" cy="432" rx="34" ry="12" fill="#e9a23b" /><ellipse cx="190" cy="430" rx="30" ry="8" fill="#f4c25c" />
            <ellipse cx="410" cy="432" rx="36" ry="13" fill="#d9b06a" /><ellipse cx="410" cy="429" rx="30" ry="9" fill="#efd39a" />
            <ellipse cx="300" cy="455" rx="40" ry="9" fill="#e8572b" /><circle cx="286" cy="453" r="3" fill="#fff" /><circle cx="310" cy="456" r="3" fill="#2f9e44" />
          </g>
          <!-- Olla con fuego -->
          <g class="pot" :style="potStyle">
            <g class="fire"><path class="flame f1" d="M220 470 q10-40 30-50 q-5 25 20 45 z" /><path class="flame f2" d="M280 475 q15-50 40-55 q-10 30 15 55 z" /><path class="flame f3" d="M340 470 q10-45 30-50 q-5 30 20 50 z" /></g>
            <rect x="150" y="440" width="300" height="18" rx="6" fill="#2b2f36" />
            <path d="M140 250 h320 v170 a40 40 0 0 1 -40 40 h-240 a40 40 0 0 1 -40 -40 z" fill="url(#potG)" />
            <rect x="130" y="242" width="340" height="22" rx="8" fill="#3d444d" />
            <path d="M100 290 q-40 0 -40 40 q0 40 40 40" fill="none" stroke="#3d444d" stroke-width="14" stroke-linecap="round" /><path d="M500 290 q40 0 40 40 q0 40 -40 40" fill="none" stroke="#3d444d" stroke-width="14" stroke-linecap="round" />
            <g clip-path="url(#potClip)"><rect x="140" y="262" width="320" height="200" fill="url(#salsaG)" /><g class="bubbles" :style="steamStyle"><circle class="b b1" cx="200" cy="300" r="9" /><circle class="b b2" cx="260" cy="320" r="6" /><circle class="b b3" cx="330" cy="305" r="11" /><circle class="b b4" cx="400" cy="325" r="7" /><circle class="b b5" cx="300" cy="290" r="5" /></g></g>
          </g>
          <!-- Vapor -->
          <g class="steam" :style="steamStyle"><path class="s s1" d="M230 240 c-20-30 20-40 0-70" /><path class="s s2" d="M300 235 c-25-35 25-45 0-80" /><path class="s s3" d="M370 240 c-20-30 20-40 0-70" /></g>
          <!-- Tapa -->
          <g class="lid" :style="lidStyle"><ellipse cx="300" cy="248" rx="170" ry="16" fill="#9aa3ae" /><ellipse cx="300" cy="244" rx="170" ry="12" fill="#c4cbd3" /><rect x="286" y="222" width="28" height="18" rx="6" fill="#3d444d" /></g>
          <!-- Cangrejo de patas gordas -->
          <g class="crab" :style="crabStyle">
            <g class="legs">
              <path d="M-70 10 q-40 10 -60 50 q-6 18 10 40" /><path d="M-78 30 q-45 20 -58 70" /><path d="M70 10 q40 10 60 50 q6 18 -10 40" /><path d="M78 30 q45 20 58 70" />
            </g>
            <g class="claw L"><path d="M-70 -10 c-50-10 -95-55 -75-95 c12-24 42-22 50 2 l-16 22 c-6 12 2 24 16 24 z" /><path class="pincer" d="M-95 -103 c10-26 42-18 36 10 l-18 28 z" /></g>
            <g class="claw R"><path d="M70 -10 c50-10 95-55 75-95 c-12-24 -42-22 -50 2 l16 22 c6 12 -2 24 -16 24 z" /><path class="pincer" d="M95 -103 c-10-26 -42-18 -36 10 l18 28 z" /></g>
            <ellipse class="shell" cx="0" cy="20" rx="92" ry="60" />
            <path class="shine" d="M-55 -5 q40 -30 90 -8" />
            <g class="eyes"><line x1="-28" y1="-30" x2="-34" y2="-56" /><line x1="28" y1="-30" x2="34" y2="-56" /><circle cx="-35" cy="-60" r="9" /><circle cx="35" cy="-60" r="9" /><circle class="pupil" cx="-33" cy="-60" r="4" /><circle class="pupil" cx="37" cy="-60" r="4" /></g>
            <path class="smile" d="M-22 38 q22 18 44 0" />
          </g>
        </svg>
        <div class="story-captions">
          <p v-for="(c, i) in captions" :key="i" class="cap" :class="{ on: stage === i }"><span class="num">{{ i + 1 }}</span>{{ c }}</p>
        </div>
      </div>
      <div class="story-bar"><span :style="{ width: `${progress * 100}%` }" /></div>
    </div>
  </section>
</template>
<style scoped lang="scss">
.story { position: relative; height: 240vh; margin: 0.5rem 0 1.5rem; }
.story-sticky { position: sticky; top: calc(var(--story-top, 96px)); height: calc(100vh - var(--story-top, 96px) - 8px); display: flex; flex-direction: column; background: radial-gradient(circle at 50% 10%, #2a6fe8, #1f5fd6 40%, #0d2f78); border-radius: 22px; overflow: hidden; color: var(--cream); box-shadow: 0 16px 40px rgba(13,47,120,0.25); }
.story-head { padding: 1.1rem 1.4rem 0; .story-kicker { margin: 0; text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.68rem; opacity: 0.85; } h2 { margin: 0.15rem 0 0; font-family: 'Archivo Black', 'Inter', sans-serif; font-size: clamp(1.2rem, 3vw, 1.8rem); color: var(--cream); } }
.story-scene { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 0 1rem; position: relative; }
.scene { width: min(100%, 560px); height: 100%; max-height: 100%; overflow: visible; }
.story-captions { position: absolute; left: 0; right: 0; bottom: 0.6rem; display: flex; justify-content: center; padding: 0 1rem; pointer-events: none; }
.cap { position: absolute; bottom: 0; margin: 0; max-width: 560px; background: rgba(13,47,120,0.75); backdrop-filter: blur(6px); border: 1px solid rgba(246,239,214,0.25); border-radius: 14px; padding: 0.6rem 0.9rem; font-weight: 600; font-size: 0.95rem; display: flex; gap: 0.6rem; align-items: center; opacity: 0; transform: translateY(12px); transition: opacity 0.35s, transform 0.35s; &.on { opacity: 1; transform: none; } .num { width: 26px; height: 26px; border-radius: 50%; background: var(--red-500); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; flex: none; font-size: 0.8rem; } }
.story-bar { height: 5px; background: rgba(246,239,214,0.2); span { display: block; height: 100%; background: var(--red-500); transition: width 0.1s linear; } }
.crab, .pot, .lid, .table { transform-box: view-box; transform-origin: 0 0; will-change: transform; }
.crab { --crab: #e8572b; .legs path { fill: none; stroke: var(--crab); stroke-width: 26; stroke-linecap: round; stroke-linejoin: round; } .claw path { fill: var(--crab); } .pincer { fill: color-mix(in srgb, var(--crab) 80%, #000); } .shell { fill: var(--crab); } .shine { fill: none; stroke: rgba(255,255,255,0.45); stroke-width: 8; stroke-linecap: round; } .eyes line { stroke: var(--crab); stroke-width: 8; stroke-linecap: round; } .eyes circle { fill: #fff; stroke: var(--crab); stroke-width: 4; } .pupil { fill: #0d2f78 !important; stroke: none !important; } .smile { fill: none; stroke: #0d2f78; stroke-width: 5; stroke-linecap: round; opacity: 0.7; } }
.claw { transform-box: fill-box; transform-origin: 90% 95%; animation: clawL 1.4s ease-in-out infinite; &.R { transform-origin: 10% 95%; animation-name: clawR; animation-delay: 0.3s; } }
.flame { fill: #ffb347; opacity: 0.95; transform-box: fill-box; transform-origin: 50% 100%; animation: flicker 0.5s ease-in-out infinite alternate; &.f2 { fill: #ff7a1a; animation-delay: 0.15s; } &.f3 { animation-delay: 0.3s; } }
.b { fill: rgba(255,255,255,0.55); animation: bubble 1.8s ease-in infinite; &.b2 { animation-delay: 0.4s; } &.b3 { animation-delay: 0.9s; } &.b4 { animation-delay: 1.2s; } &.b5 { animation-delay: 0.6s; } }
.s { fill: none; stroke: rgba(246,239,214,0.7); stroke-width: 8; stroke-linecap: round; animation: steam 2.4s ease-out infinite; &.s2 { animation-delay: 0.6s; } &.s3 { animation-delay: 1.2s; } }
@keyframes clawL { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-10deg); } }
@keyframes clawR { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(10deg); } }
@keyframes flicker { from { transform: scaleY(0.85) scaleX(1.05); } to { transform: scaleY(1.15) scaleX(0.95); } }
@keyframes bubble { 0% { transform: translateY(40px) scale(0.6); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-30px) scale(1.1); opacity: 0; } }
@keyframes steam { 0% { transform: translateY(10px); opacity: 0; } 30% { opacity: 1; } 100% { transform: translateY(-60px); opacity: 0; } }
@media (max-width: 719px) { .story { height: 200vh; } .cap { font-size: 0.85rem; } }
@media (prefers-reduced-motion: reduce) { .claw, .flame, .b, .s { animation: none !important; } .story { height: auto; } .story-sticky { position: static; height: 460px; } }
</style>
