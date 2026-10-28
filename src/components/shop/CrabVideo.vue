<script setup lang="ts">
/**
 * Video real del cangrejo (olla → tenazas → plato) controlado por el scroll: al bajar, el video avanza
 * cuadro a cuadro. Si el navegador no permite "scrub" (iOS sin precarga) o el usuario prefiere menos
 * movimiento, se reproduce solo en bucle.
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'

const SRC = '/media/cangrejo-olla-mesa.mp4'
const POSTER = '/media/cangrejo-poster.jpg'
const root = ref<HTMLElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const progress = ref(0)
const ready = ref(false)
const autoplay = ref(false)
let raf = 0
let targetTime = 0
let lastSet = -1
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function update() {
  raf = 0
  const el = root.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const total = r.height - window.innerHeight
  progress.value = Math.min(1, Math.max(0, total > 0 ? -r.top / total : 1))
  const v = video.value
  if (!v || autoplay.value || !ready.value || !Number.isFinite(v.duration)) return
  targetTime = progress.value * (v.duration - 0.05)
  if (Math.abs(targetTime - lastSet) > 0.04) { lastSet = targetTime; try { v.currentTime = targetTime } catch { /* aún no se puede buscar */ } }
}
function onScroll() { if (!raf) raf = requestAnimationFrame(update) }
function startAutoplay() { autoplay.value = true; const v = video.value; if (v) { v.loop = true; v.play().catch(() => undefined) } }
onMounted(() => {
  const v = video.value
  if (reduced) { startAutoplay(); return }
  if (v) {
    v.addEventListener('loadedmetadata', () => { ready.value = true; update() })
    v.addEventListener('canplaythrough', () => { ready.value = true }, { once: true })
    v.addEventListener('error', startAutoplay)
    // Safari iOS no precarga sin interacción: si tras 4 s no hay metadatos, reproducir en bucle.
    window.setTimeout(() => { if (!ready.value) startAutoplay() }, 4000)
    v.load()
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  update()
})
onUnmounted(() => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) })

const stage = computed(() => (progress.value < 0.3 ? 0 : progress.value < 0.6 ? 1 : 2))
const captions = ['Cocinamos el cangrejo en nuestra salsa criolla, en la olla, como hace 15 años.', 'Sale rojo, brillante y con las patas bien gordas, llenas de carne.', 'Y llega a tu mesa con maduro, salsa criolla y cocolón. O a tu casa.']
</script>
<template>
  <section ref="root" class="vstory" aria-label="Así preparamos tu cangrejo">
    <div class="vstory-sticky">
      <video ref="video" class="vstory-video" :src="SRC" :poster="POSTER" muted playsinline preload="auto" disablepictureinpicture />
      <div class="vstory-shade" />
      <div class="vstory-head"><p class="vstory-kicker">De la olla a tu mesa</p><h2>Así preparamos <em>tu cangrejo</em></h2></div>
      <div class="vstory-captions"><p v-for="(c, i) in captions" :key="i" class="vcap" :class="{ on: stage === i }"><span class="num">{{ i + 1 }}</span>{{ c }}</p></div>
      <div class="vstory-bar"><span :style="{ width: `${progress * 100}%` }" /></div>
      <p v-if="!autoplay" class="vstory-hint"><i class="fa-solid fa-arrow-down" /> Sigue bajando</p>
    </div>
  </section>
</template>
<style scoped lang="scss">
.vstory { position: relative; height: 260vh; }
.vstory-sticky { position: sticky; top: calc(var(--story-top, 100px)); height: calc(100vh - var(--story-top, 100px) - 12px); border-radius: 26px; overflow: hidden; background: #0d2f78; box-shadow: 0 20px 50px rgba(13,47,120,0.35); }
.vstory-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.vstory-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(13,47,120,0.55) 0%, rgba(13,47,120,0) 35%, rgba(13,47,120,0) 60%, rgba(13,47,120,0.7) 100%); pointer-events: none; }
.vstory-head { position: absolute; top: 1.4rem; left: 1.6rem; right: 1.6rem; color: #f6efd6; .vstory-kicker { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 0.7rem; font-weight: 800; opacity: 0.9; } h2 { margin: 0.2rem 0 0; font-family: 'Fraunces', Georgia, serif; font-weight: 400; font-size: clamp(1.7rem, 4vw, 3rem); line-height: 1.05; em { font-style: italic; font-weight: 300; } } }
.vstory-captions { position: absolute; left: 1.2rem; right: 1.2rem; bottom: 2.2rem; display: flex; justify-content: center; pointer-events: none; }
.vcap { position: absolute; bottom: 0; margin: 0; max-width: 620px; background: rgba(246,239,214,0.92); color: #0d2f78; border-radius: 16px; padding: 0.75rem 1.1rem; font-weight: 700; font-size: 1rem; display: flex; gap: 0.7rem; align-items: center; opacity: 0; transform: translateY(14px); transition: opacity 0.4s, transform 0.4s; box-shadow: 0 10px 30px rgba(0,0,0,0.25); &.on { opacity: 1; transform: none; } .num { width: 28px; height: 28px; border-radius: 50%; background: #e8572b; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; flex: none; font-size: 0.8rem; } }
.vstory-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: rgba(246,239,214,0.25); span { display: block; height: 100%; background: #e8572b; transition: width 0.1s linear; } }
.vstory-hint { position: absolute; right: 1.4rem; top: 1.6rem; margin: 0; color: #f6efd6; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; opacity: 0.8; animation: nudge 1.6s ease-in-out infinite; }
@keyframes nudge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
@media (max-width: 719px) { .vstory { height: 220vh; } .vcap { font-size: 0.88rem; } .vstory-hint { display: none; } }
@media (prefers-reduced-motion: reduce) { .vstory { height: auto; } .vstory-sticky { position: static; height: 420px; } .vstory-hint { animation: none; } }
</style>
