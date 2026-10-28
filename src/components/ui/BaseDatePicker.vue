<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/** Selector de fecha propio (YYYY-MM-DD) o de mes (YYYY-MM) con mode="month". Sin controles nativos. */
const props = withDefaults(defineProps<{ mode?: 'date' | 'month'; placeholder?: string; disabled?: boolean; clearable?: boolean; min?: string; max?: string }>(), { mode: 'date', clearable: true })
const model = defineModel<string>({ default: '' })

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const open = ref(false)
const root = ref<HTMLElement | null>(null)
const pop = ref<HTMLElement | null>(null)
const popStyle = ref<Record<string, string>>({})
function place() { const btn = root.value?.querySelector('.bdate-btn') as HTMLElement | null; if (!btn) return; const r = btn.getBoundingClientRect(); const vh = window.innerHeight; const wanted = 330; const up = vh - r.bottom - 8 < wanted && r.top > vh - r.bottom; popStyle.value = { position: 'fixed', left: `${Math.max(8, Math.min(r.left, window.innerWidth - 308))}px`, ...(up ? { bottom: `${vh - r.top + 4}px` } : { top: `${r.bottom + 4}px` }) } }
const todayStr = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10)
const view = ref({ y: Number((model.value || todayStr).slice(0, 4)), m: Number((model.value || todayStr).slice(5, 7)) - 1 })

const display = computed(() => {
  if (!model.value) return ''
  if (props.mode === 'month') { const [y, m] = model.value.split('-'); return `${MONTHS[Number(m) - 1] ?? ''} ${y}` }
  const [y, m, d] = model.value.split('-')
  return `${d} ${(MONTHS[Number(m) - 1] ?? '').slice(0, 3).toLowerCase()} ${y}`
})
const cells = computed(() => {
  const first = new Date(Date.UTC(view.value.y, view.value.m, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(view.value.y, view.value.m + 1, 0)).getUTCDate()
  const out: { key: string; day: number | null; iso: string; disabled: boolean }[] = []
  for (let i = 0; i < offset; i++) out.push({ key: `e${i}`, day: null, iso: '', disabled: true })
  for (let d = 1; d <= daysInMonth; d++) { const iso = `${view.value.y}-${String(view.value.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`; out.push({ key: iso, day: d, iso, disabled: Boolean((props.min && iso < props.min) || (props.max && iso > props.max)) }) }
  return out
})
function toggle() { if (props.disabled) return; open.value = !open.value; if (open.value) { if (model.value) view.value = { y: Number(model.value.slice(0, 4)), m: Number(model.value.slice(5, 7)) - 1 }; place() } }
function shiftMonth(n: number) { const d = new Date(Date.UTC(view.value.y, view.value.m + n, 1)); view.value = { y: d.getUTCFullYear(), m: d.getUTCMonth() } }
function pickDay(iso: string) { model.value = iso; open.value = false }
function pickMonth(m: number) { model.value = `${view.value.y}-${String(m + 1).padStart(2, '0')}`; open.value = false }
function setToday() { model.value = props.mode === 'month' ? todayStr.slice(0, 7) : todayStr; open.value = false }
function clear(e: Event) { e.stopPropagation(); model.value = '' }
function onDocClick(e: MouseEvent) { const t = e.target as Node; if (root.value && !root.value.contains(t) && !(pop.value && pop.value.contains(t))) open.value = false }
function onScrollOrResize() { if (open.value) place() }
onMounted(() => { document.addEventListener('mousedown', onDocClick); window.addEventListener('resize', onScrollOrResize); window.addEventListener('scroll', onScrollOrResize, true) })
onBeforeUnmount(() => { document.removeEventListener('mousedown', onDocClick); window.removeEventListener('resize', onScrollOrResize); window.removeEventListener('scroll', onScrollOrResize, true) })
</script>

<template>
  <div ref="root" class="bdate" :class="{ open, disabled }">
    <button type="button" class="bdate-btn" :disabled="disabled" @click="toggle"><i class="fa-regular fa-calendar bdate-ico" /><span class="bdate-text" :class="{ placeholder: !display }">{{ display || placeholder || (mode === 'month' ? 'Mes' : 'Fecha') }}</span><span v-if="clearable && model && !disabled" class="bdate-clear" role="button" aria-label="Limpiar" @click="clear"><i class="fa-solid fa-xmark" /></span></button>
    <Teleport to="body"><Transition name="fade">
      <div v-if="open" ref="pop" class="bdate-pop" :style="popStyle">
        <div class="bdate-nav"><button type="button" class="btn ghost icon sm" @click="mode === 'month' ? (view.y -= 1) : shiftMonth(-1)"><i class="fa-solid fa-chevron-left" /></button><strong>{{ mode === 'month' ? view.y : `${MONTHS[view.m] ?? ''} ${view.y}` }}</strong><button type="button" class="btn ghost icon sm" @click="mode === 'month' ? (view.y += 1) : shiftMonth(1)"><i class="fa-solid fa-chevron-right" /></button></div>
        <template v-if="mode === 'date'">
          <div class="bdate-row head"><span v-for="(d, i) in DAYS" :key="i">{{ d }}</span></div>
          <div class="bdate-days"><button v-for="c in cells" :key="c.key" type="button" class="bdate-day" :class="{ empty: !c.day, selected: c.iso === model, today: c.iso === todayStr }" :disabled="!c.day || c.disabled" @click="pickDay(c.iso)">{{ c.day ?? '' }}</button></div>
        </template>
        <div v-else class="bdate-months"><button v-for="(m, i) in MONTHS" :key="m" type="button" class="bdate-day month" :class="{ selected: model === `${view.y}-${String(i + 1).padStart(2, '0')}` }" @click="pickMonth(i)">{{ m.slice(0, 3) }}</button></div>
        <div class="bdate-foot"><button type="button" class="btn sm ghost" @click="setToday">{{ mode === 'month' ? 'Este mes' : 'Hoy' }}</button><button type="button" class="btn sm ghost" @click="open = false">Cerrar</button></div>
      </div>
    </Transition></Teleport>
  </div>
</template>

<style lang="scss">
/* Sin scoped: el calendario vive en <body> por Teleport. */
.bdate { position: relative; width: 100%; }
.bdate-btn { display: flex; align-items: center; gap: 0.5rem; width: 100%; min-height: 42px; padding: 0.45rem 0.7rem; border: 1px solid var(--gray-300); border-radius: 6px; background: var(--surface); text-align: left; .open & { border-color: var(--blue-500); box-shadow: 0 0 0 3px rgba(43, 127, 194, 0.18); } &:disabled { background: var(--gray-100); cursor: not-allowed; } }
.bdate-ico { color: var(--text-muted); }
.bdate-text { flex: 1; font-weight: 600; white-space: nowrap; &.placeholder { color: var(--text-muted); font-weight: 500; } }
.bdate-clear { color: var(--text-muted); &:hover { color: var(--red-600); } }
.bdate-pop { z-index: 120; width: 300px; max-width: calc(100vw - 2rem); background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 32px rgba(10, 42, 66, 0.18); padding: 0.6rem; display: flex; flex-direction: column; gap: 0.4rem; }
.bdate-nav { display: flex; align-items: center; justify-content: space-between; }
.bdate-row { display: flex; span { flex: 1; text-align: center; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); } }
.bdate-days, .bdate-months { display: flex; flex-wrap: wrap; }
.bdate-day { flex: 0 0 calc(100% / 7); height: 36px; border: none; background: none; border-radius: 6px; font-weight: 600; &:hover:not(:disabled) { background: var(--blue-100); } &.today { color: var(--blue-500); } &.selected { background: var(--primary); color: #fff; } &.empty { visibility: hidden; } &:disabled { color: var(--gray-300); } &.month { flex-basis: calc(100% / 3); height: 42px; } }
.bdate-foot { display: flex; justify-content: space-between; border-top: 1px solid var(--border); padding-top: 0.4rem; }
</style>
