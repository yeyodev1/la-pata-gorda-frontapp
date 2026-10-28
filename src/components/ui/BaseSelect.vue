<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface SelectOption { value: string | number | null; label: string; sub?: string; disabled?: boolean; /** Se muestra primero con la etiqueta "Recomendado". */ recommended?: boolean; /** Texto corto de la recomendación. */ hint?: string }
const props = withDefaults(defineProps<{ options: SelectOption[]; placeholder?: string; disabled?: boolean; searchable?: boolean; clearable?: boolean; multiple?: boolean; size?: 'sm' | 'md' | 'lg' }>(), { placeholder: 'Seleccionar…', size: 'md' })
const model = defineModel<string | number | null | (string | number)[]>({ default: null })
const emit = defineEmits<{ change: [value: unknown] }>()

const open = ref(false)
const query = ref('')
const root = ref<HTMLElement | null>(null)
const pop = ref<HTMLElement | null>(null)
const searchBox = ref<HTMLInputElement | null>(null)
const highlighted = ref(0)
/** El menú se dibuja fuera del contenedor (Teleport) para que ningún scroll lo recorte, y se voltea hacia arriba si abajo no cabe. */
const popStyle = ref<Record<string, string>>({})
const openUp = ref(false)
function place() {
  const btn = root.value?.querySelector('.bsel-btn') as HTMLElement | null
  if (!btn) return
  const r = btn.getBoundingClientRect()
  const vh = window.innerHeight
  const wanted = Math.min(360, (isSearchable.value ? 52 : 0) + Math.min(filtered.value.length, 8) * 44 + 12)
  const below = vh - r.bottom - 8
  openUp.value = below < wanted && r.top > below
  const maxH = Math.max(160, Math.min(360, openUp.value ? r.top - 12 : below))
  popStyle.value = { position: 'fixed', left: `${Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8))}px`, width: `${Math.max(r.width, 220)}px`, maxHeight: `${maxH}px`, ...(openUp.value ? { bottom: `${vh - r.top + 4}px` } : { top: `${r.bottom + 4}px` }) }
}

const isSearchable = computed(() => props.searchable ?? props.options.length > 7)
const selectedValues = computed<(string | number | null)[]>(() => (props.multiple ? ((model.value as (string | number)[] | null) ?? []) : [model.value as string | number | null]))
const selectedOptions = computed(() => props.options.filter((o) => selectedValues.value.includes(o.value)))
const display = computed(() => selectedOptions.value.map((o) => o.label).join(', '))
const filtered = computed(() => { const q = query.value.trim().toLowerCase(); const list = q ? props.options.filter((o) => `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(q)) : props.options; return [...list].sort((a, b) => Number(Boolean(b.recommended)) - Number(Boolean(a.recommended))) })
const recommendedCount = computed(() => filtered.value.filter((o) => o.recommended).length)

function toggle() { if (props.disabled) return; open.value = !open.value; if (open.value) { query.value = ''; highlighted.value = Math.max(0, filtered.value.findIndex((o) => selectedValues.value.includes(o.value))); place(); setTimeout(() => { place(); searchBox.value?.focus() }, 0) } }
function pick(o: SelectOption) {
  if (o.disabled) return
  if (props.multiple) {
    const cur = [...((model.value as (string | number)[] | null) ?? [])]
    const idx = cur.indexOf(o.value as string | number)
    if (idx >= 0) cur.splice(idx, 1); else cur.push(o.value as string | number)
    model.value = cur
    emit('change', cur)
  } else {
    model.value = o.value
    emit('change', o.value)
    open.value = false
  }
}
function clear(e: Event) { e.stopPropagation(); model.value = props.multiple ? [] : null; emit('change', model.value) }
function onKey(e: KeyboardEvent) {
  if (!open.value) { if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') { e.preventDefault(); toggle() } return }
  if (e.key === 'Escape') open.value = false
  if (e.key === 'ArrowDown') { e.preventDefault(); highlighted.value = Math.min(filtered.value.length - 1, highlighted.value + 1) }
  if (e.key === 'ArrowUp') { e.preventDefault(); highlighted.value = Math.max(0, highlighted.value - 1) }
  if (e.key === 'Enter') { e.preventDefault(); const o = filtered.value[highlighted.value]; if (o) pick(o) }
}
function onDocClick(e: MouseEvent) { const t = e.target as Node; if (root.value && !root.value.contains(t) && !(pop.value && pop.value.contains(t))) open.value = false }
function onScrollOrResize() { if (open.value) place() }
onMounted(() => { document.addEventListener('mousedown', onDocClick); window.addEventListener('resize', onScrollOrResize); window.addEventListener('scroll', onScrollOrResize, true) })
onBeforeUnmount(() => { document.removeEventListener('mousedown', onDocClick); window.removeEventListener('resize', onScrollOrResize); window.removeEventListener('scroll', onScrollOrResize, true) })
watch(query, () => { highlighted.value = 0 })
</script>

<template>
  <div ref="root" class="bsel" :class="[size, { open, disabled }]" @keydown="onKey">
    <button type="button" class="bsel-btn" :disabled="disabled" :aria-expanded="open" @click="toggle">
      <span class="bsel-text" :class="{ placeholder: !display }">{{ display || placeholder }}</span>
      <span v-if="clearable && display && !disabled" class="bsel-clear" role="button" aria-label="Limpiar" @click="clear"><i class="fa-solid fa-xmark" /></span>
      <i class="fa-solid fa-chevron-down bsel-caret" />
    </button>
    <Teleport to="body"><Transition name="fade">
      <div v-if="open" ref="pop" class="bsel-pop" :class="{ up: openUp }" :style="popStyle" @keydown="onKey">
        <label v-if="isSearchable" class="bsel-search"><i class="fa-solid fa-magnifying-glass" /><input ref="searchBox" v-model="query" type="text" placeholder="Buscar…" autocomplete="off" /></label>
        <ul class="bsel-list" role="listbox">
          <li v-if="recommendedCount" class="bsel-group"><i class="fa-solid fa-wand-magic-sparkles" /> Recomendado para ti</li>
          <template v-for="(o, i) in filtered" :key="String(o.value)">
          <li v-if="recommendedCount && i === recommendedCount" class="bsel-group">Todos</li>
          <li role="option" :aria-selected="selectedValues.includes(o.value)" :class="{ selected: selectedValues.includes(o.value), hl: i === highlighted, disabled: o.disabled, rec: o.recommended }" @mouseenter="highlighted = i" @click="pick(o)">
            <span v-if="multiple" class="bsel-check" :class="{ on: selectedValues.includes(o.value) }"><i class="fa-solid fa-check" /></span>
            <span class="bsel-opt"><span>{{ o.label }} <span v-if="o.recommended" class="bsel-rec"><i class="fa-solid fa-star" /> {{ o.hint || 'Recomendado' }}</span></span><span v-if="o.sub" class="bsel-sub">{{ o.sub }}</span></span>
            <i v-if="!multiple && selectedValues.includes(o.value)" class="fa-solid fa-check bsel-tick" />
          </li>
          </template>
          <li v-if="!filtered.length" class="bsel-empty">Sin resultados</li>
        </ul>
      </div>
    </Transition></Teleport>
  </div>
</template>

<style lang="scss">
/* Sin scoped: el menú vive en <body> por Teleport. Prefijo .bsel-* evita colisiones. */
.bsel { position: relative; width: 100%; }
.bsel-btn { display: flex; align-items: center; gap: 0.5rem; width: 100%; min-height: 42px; padding: 0.45rem 0.7rem; border: 1px solid var(--gray-300); border-radius: 6px; background: var(--surface); text-align: left; transition: border-color 0.15s, box-shadow 0.15s; .open & { border-color: var(--blue-500); box-shadow: 0 0 0 3px rgba(43, 127, 194, 0.18); } &:disabled { background: var(--gray-100); color: var(--gray-700); cursor: not-allowed; } }
.sm .bsel-btn { min-height: 34px; padding: 0.25rem 0.6rem; font-size: 0.88rem; }
.lg .bsel-btn { min-height: 52px; font-size: 1.05rem; }
.bsel-text { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; &.placeholder { color: var(--text-muted); font-weight: 500; } }
.bsel-clear { color: var(--text-muted); padding: 0 0.2rem; &:hover { color: var(--red-600); } }
.bsel-caret { color: var(--text-muted); font-size: 0.75rem; transition: transform 0.15s; .open & { transform: rotate(180deg); } }
.bsel-pop { z-index: 120; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 12px 32px rgba(10, 42, 66, 0.22); display: flex; flex-direction: column; overflow: hidden; }
.bsel-search { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.7rem; border-bottom: 1px solid var(--border); color: var(--text-muted); input { flex: 1; border: none; outline: none; background: transparent; min-height: 30px; } }
.bsel-list { list-style: none; margin: 0; padding: 0.3rem; overflow-y: auto; -webkit-overflow-scrolling: touch; display: flex; flex-direction: column; li { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 0.65rem; border-radius: 6px; cursor: pointer; &.hl { background: var(--blue-100); } &.selected { font-weight: 700; color: var(--navy-800); } &.disabled { opacity: 0.5; cursor: not-allowed; } } }
.bsel-opt { display: flex; flex-direction: column; flex: 1; min-width: 0; .bsel-sub { font-size: 0.78rem; color: var(--text-muted); font-weight: 500; } }
.bsel-tick { color: var(--green-600); }
.bsel-check { width: 20px; height: 20px; border-radius: 5px; border: 2px solid var(--gray-300); display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: transparent; flex: none; &.on { background: var(--primary); border-color: var(--primary); color: #fff; } }
.bsel-empty { color: var(--text-muted); justify-content: center; cursor: default; }
.bsel-group { font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); font-weight: 700; padding: 0.4rem 0.65rem 0.1rem !important; cursor: default !important; &:hover { background: none !important; } }
.bsel-list li.rec { background: var(--green-100); }
.bsel-list li.rec.hl { background: var(--blue-100); }
.bsel-rec { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.68rem; font-weight: 800; color: var(--green-600); margin-left: 0.3rem; }
</style>
