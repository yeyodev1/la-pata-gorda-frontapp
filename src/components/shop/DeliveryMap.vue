<script setup lang="ts">
/**
 * Mapa de entrega (Google Maps): el cliente busca su dirección, arrastra el pin o usa su ubicación.
 * Emite la dirección en texto y las coordenadas. Muestra la distancia al local y avisa si queda fuera del radio.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ apiKey: string; branch: { name: string; lat: number | null; lng: number | null; deliveryRadiusKm: number } | null; modelValue: { text: string; lat: number | null; lng: number | null } }>()
const emit = defineEmits<{ 'update:modelValue': [v: { text: string; lat: number | null; lng: number | null }] }>()
const mapEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const acHost = ref<HTMLElement | null>(null)
const acMode = ref<'nuevo' | 'clasico' | 'manual'>('manual')
const status = ref<'cargando' | 'listo' | 'error'>('cargando')
const errMsg = ref('')
const locating = ref(false)
let map: google.maps.Map | null = null
let marker: google.maps.Marker | null = null
let branchMarker: google.maps.Marker | null = null
let geocoder: google.maps.Geocoder | null = null
let circle: google.maps.Circle | null = null

const center = computed(() => (props.branch?.lat != null && props.branch?.lng != null ? { lat: props.branch.lat, lng: props.branch.lng } : { lat: -2.17, lng: -79.9 }))
const distanceKm = computed(() => { const b = props.branch; const v = props.modelValue; if (!b || b.lat == null || b.lng == null || v.lat == null || v.lng == null) return null; const R = 6371, r = (d: number) => (d * Math.PI) / 180; const dLat = r(v.lat - b.lat), dLng = r(v.lng - b.lng); const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(b.lat)) * Math.cos(r(v.lat)) * Math.sin(dLng / 2) ** 2; return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10 })
const outOfRange = computed(() => Boolean(props.branch && props.branch.deliveryRadiusKm > 0 && distanceKm.value != null && distanceKm.value > props.branch.deliveryRadiusKm))

type GoogleWindow = Window & { google?: { maps?: { importLibrary?: unknown } }; __lpgMaps?: Promise<void> }
/** Carga el script de Google Maps una sola vez y espera a que `importLibrary` exista (el onload llega un instante antes). */
function loadScript(key: string): Promise<void> {
  const w = window as GoogleWindow
  const ready = () => typeof w.google?.maps?.importLibrary === 'function'
  if (ready()) return Promise.resolve()
  if (w.__lpgMaps) return w.__lpgMaps
  w.__lpgMaps = new Promise((resolve, reject) => {
    const waitReady = (tries = 0) => { if (ready()) resolve(); else if (tries > 100) reject(new Error('Google Maps no terminó de cargar')); else setTimeout(() => waitReady(tries + 1), 100) }
    if (document.querySelector('script[data-lpg-maps]')) { waitReady(); return }
    const s = document.createElement('script'); s.dataset.lpgMaps = '1'; s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places,marker,geocoding&language=es&region=EC&loading=async`; s.async = true
    s.onload = () => waitReady(); s.onerror = () => reject(new Error('No se pudo cargar Google Maps')); document.head.appendChild(s)
  })
  return w.__lpgMaps
}
function setPoint(lat: number, lng: number, text?: string) {
  marker?.setPosition({ lat, lng }); map?.panTo({ lat, lng })
  if (text !== undefined) emit('update:modelValue', { text, lat, lng })
  else { emit('update:modelValue', { ...props.modelValue, lat, lng }); geocoder?.geocode({ location: { lat, lng } }, (res, st) => { if (st === 'OK' && res?.[0]) emit('update:modelValue', { text: res[0].formatted_address.replace(/, Ecuador$/, ''), lat, lng }) }) }
}
/** Sin autocompletado: geocodificar lo escrito al presionar Enter o salir del campo. */
function searchTyped() { const q = props.modelValue.text.trim(); if (!geocoder || q.length < 4) return; geocoder.geocode({ address: q, componentRestrictions: { country: 'EC' } }, (res, st) => { if (st === 'OK' && res?.[0]?.geometry?.location) { const l = res[0].geometry.location; setPoint(l.lat(), l.lng(), res[0].formatted_address.replace(/, Ecuador$/, '')); map?.setZoom(16) } }) }
function useMyLocation() { if (!navigator.geolocation) return; locating.value = true; navigator.geolocation.getCurrentPosition((p) => { locating.value = false; setPoint(p.coords.latitude, p.coords.longitude); map?.setZoom(16) }, () => { locating.value = false }, { enableHighAccuracy: true, timeout: 8000 }) }
function drawBranch() {
  if (!map || !props.branch || props.branch.lat == null || props.branch.lng == null) return
  const pos = { lat: props.branch.lat, lng: props.branch.lng }
  if (!branchMarker) branchMarker = new google.maps.Marker({ map, position: pos, title: props.branch.name, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: '#1f5fd6', fillOpacity: 1, strokeColor: '#f6efd6', strokeWeight: 3 } })
  else branchMarker.setPosition(pos)
  if (circle) circle.setMap(null)
  if (props.branch.deliveryRadiusKm > 0) circle = new google.maps.Circle({ map, center: pos, radius: props.branch.deliveryRadiusKm * 1000, strokeColor: '#1f5fd6', strokeOpacity: 0.5, strokeWeight: 1.5, fillColor: '#1f5fd6', fillOpacity: 0.06, clickable: false })
}
onMounted(async () => {
  try {
    await loadScript(props.apiKey)
    const { Map } = (await google.maps.importLibrary('maps')) as google.maps.MapsLibrary
    await google.maps.importLibrary('places'); await google.maps.importLibrary('marker'); await google.maps.importLibrary('geocoding')
    const start = props.modelValue.lat != null && props.modelValue.lng != null ? { lat: props.modelValue.lat, lng: props.modelValue.lng } : center.value
    map = new Map(mapEl.value!, { center: start, zoom: props.modelValue.lat != null ? 16 : 13, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false, styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }] })
    geocoder = new google.maps.Geocoder()
    marker = new google.maps.Marker({ map, position: start, draggable: true, animation: google.maps.Animation.DROP, icon: { path: 'M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z', fillColor: '#e8572b', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 2, anchor: new google.maps.Point(12, 22) } })
    marker.addListener('dragend', () => { const p = marker!.getPosition(); if (p) setPoint(p.lat(), p.lng()) })
    map.addListener('click', (e: google.maps.MapMouseEvent) => { if (e.latLng) setPoint(e.latLng.lat(), e.latLng.lng()) })
    drawBranch()
    // Autocompletado: primero el componente nuevo de Google; si no está, el clásico; si tampoco, buscar con Enter.
    const placesLib = google.maps.places as unknown as { PlaceAutocompleteElement?: new (o: Record<string, unknown>) => HTMLElement & { addEventListener: HTMLElement['addEventListener'] } }
    let acReady = false
    if (placesLib.PlaceAutocompleteElement && acHost.value) {
      try {
        const el = new placesLib.PlaceAutocompleteElement({ includedRegionCodes: ['ec', 'us'] })
        el.addEventListener('gmp-select', async (ev: Event) => {
          const pred = (ev as unknown as { placePrediction?: { toPlace: () => { fetchFields: (o: { fields: string[] }) => Promise<unknown>; location?: google.maps.LatLng | null; formattedAddress?: string | null; displayName?: string | null } } }).placePrediction
          if (!pred) return
          const place = pred.toPlace(); await place.fetchFields({ fields: ['location', 'formattedAddress', 'displayName'] })
          if (place.location) { setPoint(place.location.lat(), place.location.lng(), (place.formattedAddress ?? place.displayName ?? '').replace(/, Ecuador$/, '')); map?.setZoom(16) }
        })
        acHost.value.innerHTML = ''; acHost.value.appendChild(el); acReady = true; acMode.value = 'nuevo'
      } catch { acReady = false }
    }
    if (!acReady && inputEl.value) {
      try {
        const ac = new google.maps.places.Autocomplete(inputEl.value, { componentRestrictions: { country: ['ec', 'us'] }, fields: ['geometry', 'formatted_address', 'name'] })
        ac.addListener('place_changed', () => { const pl = ac.getPlace(); const loc = pl.geometry?.location; if (!loc) return; setPoint(loc.lat(), loc.lng(), (pl.formatted_address ?? pl.name ?? '').replace(/, Ecuador$/, '')); map?.setZoom(16) })
        acMode.value = 'clasico'
      } catch { acMode.value = 'manual' }
    }
    status.value = 'listo'
  } catch (err) { status.value = 'error'; errMsg.value = err instanceof Error ? `${err.name}: ${err.message}` : String(err); console.error('[mapa]', err) }
})
watch(() => props.branch, () => { drawBranch(); if (map && props.modelValue.lat == null) map.panTo(center.value) })
onBeforeUnmount(() => { marker?.setMap(null); branchMarker?.setMap(null); circle?.setMap(null) })
</script>
<template>
  <div class="dmap">
    <div class="dmap-search" :class="{ nuevo: acMode === 'nuevo' }"><i v-if="acMode !== 'nuevo'" class="fa-solid fa-magnifying-glass" /><div v-show="acMode === 'nuevo'" ref="acHost" class="dmap-ac" /><input v-show="acMode !== 'nuevo'" ref="inputEl" :value="modelValue.text" placeholder="Escribe tu dirección y presiona Enter…" autocomplete="off" @input="emit('update:modelValue', { ...modelValue, text: ($event.target as HTMLInputElement).value })" @keydown.enter.prevent="searchTyped" @blur="acMode === 'manual' && searchTyped()" /><button type="button" class="dmap-loc" :disabled="locating" title="Usar mi ubicación" @click="useMyLocation"><i class="fa-solid" :class="locating ? 'fa-circle-notch fa-spin' : 'fa-location-crosshairs'" /></button></div>
    <div class="dmap-canvas"><div ref="mapEl" class="dmap-map" /><p v-if="status === 'cargando'" class="dmap-state"><i class="fa-solid fa-circle-notch fa-spin" /> Cargando mapa…</p><p v-else-if="status === 'error'" class="dmap-state">No se pudo cargar el mapa. Escribe la dirección y referencia abajo.<small style="display:block;opacity:0.6;font-weight:400">{{ errMsg }}</small></p></div>
    <p v-if="acMode === 'nuevo' && modelValue.text" class="dmap-sel"><i class="fa-solid fa-location-dot" /> {{ modelValue.text }}</p>
    <p class="dmap-hint"><i class="fa-solid fa-hand-pointer" /> Arrastra el pin rojo hasta tu puerta.<template v-if="distanceKm != null"> · <strong>{{ distanceKm }} km</strong> de {{ branch?.name }}</template></p>
    <p v-if="outOfRange" class="dmap-warn"><i class="fa-solid fa-triangle-exclamation" /> Queda fuera del radio de entrega de {{ branch?.name }} ({{ branch?.deliveryRadiusKm }} km). Elige otro local o retira en el local.</p>
  </div>
</template>
<style scoped lang="scss">
.dmap { display: flex; flex-direction: column; gap: 0.5rem; }
.dmap-search { display: flex; align-items: center; gap: 0.5rem; border: 1.5px solid rgba(13,47,120,0.2); border-radius: 12px; padding: 0 0.4rem 0 0.9rem; background: #fff; color: rgba(13,47,120,0.6); &:focus-within { border-color: #1f5fd6; box-shadow: 0 0 0 3px rgba(31,95,214,0.18); } input { flex: 1; border: none; outline: none; min-height: 48px; font: inherit; color: #0d2f78; background: transparent; min-width: 0; } }
.dmap-search.nuevo { padding-left: 0.2rem; border: none; box-shadow: none; &:focus-within { box-shadow: none; } }
.dmap-ac { flex: 1; min-width: 0; :deep(gmp-place-autocomplete) { display: block; width: 100%; color-scheme: light; --gmp-mat-color-surface: #ffffff; --gmp-mat-color-surface-container: #ffffff; --gmp-mat-color-on-surface: #0d2f78; --gmp-mat-color-on-surface-variant: #5a6a8a; --gmp-mat-color-primary: #1f5fd6; --gmp-mat-color-outline: rgba(13,47,120,0.25); --gmp-mat-color-outline-variant: rgba(13,47,120,0.2); --gmp-mat-font-family: 'Nunito', sans-serif; --gmp-mat-shape-corner: 12px; background: #fff; border-radius: 12px; } }
.dmap-sel { margin: 0; font-size: 0.9rem; font-weight: 700; color: #0d2f78; i { color: #e8572b; } }
.dmap-loc { width: 40px; height: 40px; border-radius: 10px; border: none; background: #f6efd6; color: #1f5fd6; cursor: pointer; font-size: 1rem; &:hover { background: #ece2c0; } }
.dmap-canvas { position: relative; height: 300px; border-radius: 14px; overflow: hidden; background: #e9eef6; }
.dmap-map { position: absolute; inset: 0; }
.dmap-state { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin: 0; color: #0d2f78; font-weight: 700; background: rgba(246,239,214,0.7); }
.dmap-hint { margin: 0; font-size: 0.84rem; opacity: 0.8; }
.dmap-warn { margin: 0; background: #fde8e2; color: #c6391f; border-radius: 10px; padding: 0.6rem 0.8rem; font-size: 0.88rem; font-weight: 700; }
:global(.pac-container) { border-radius: 12px; border: 1px solid rgba(13,47,120,0.15); box-shadow: 0 12px 30px rgba(13,47,120,0.18); font-family: 'Nunito', sans-serif; margin-top: 4px; }
</style>
