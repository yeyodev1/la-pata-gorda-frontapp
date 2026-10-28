<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { shopApi, shopErrorMessage, type Storefront } from '@/services/shopApi'
import { todayStr } from '@/utils/format'

const data = ref<Storefront | null>(null)
const form = ref({ branch: '', date: todayStr(), time: '19:00', name: '', phone: '', people: 2, notes: '', privateTable: '' })
const busy = ref(false)
const error = ref('')
const done = ref<{ message: string; number: string; status: string } | null>(null)
onMounted(async () => { try { data.value = await shopApi.storefront(); form.value.branch = data.value.branches[0]?.id ?? '' } catch (err) { error.value = shopErrorMessage(err) } })
const branch = computed(() => data.value?.branches.find((b) => b.id === form.value.branch))
async function submit() { busy.value = true; error.value = ''; try { const r = await shopApi.reserve({ ...form.value, channel: 'web' }); done.value = { message: r.message, number: r.reservation.number, status: r.reservation.status } } catch (err) { error.value = shopErrorMessage(err) } finally { busy.value = false } }
</script>
<template>
  <div class="store"><div class="store-page">
    <RouterLink to="/" class="link-btn"><i class="fa-solid fa-arrow-left" /> Volver a la tienda</RouterLink>
    <h1>Reserva tu mesa</h1>
    <div v-if="done" class="card-s"><p class="ok-box"><i class="fa-solid fa-circle-check" /> {{ done.message }}</p><p class="hint-s">Reserva {{ done.number }} · {{ done.status === 'confirmada' ? 'confirmada' : 'pendiente de confirmación' }}</p><RouterLink to="/" class="btn-s" style="margin-top:0.5rem">Ver el menú</RouterLink></div>
    <form v-else @submit.prevent="submit">
      <p v-if="error" class="err">{{ error }}</p>
      <div class="card-s"><div class="f"><label>Local</label><select v-model="form.branch"><option v-for="b in data?.branches" :key="b.id" :value="b.id">{{ b.name }} · {{ b.city }}</option></select></div><div class="f-row"><div class="f"><label>Fecha</label><input v-model="form.date" type="date" :min="todayStr()" required /></div><div class="f"><label>Hora</label><input v-model="form.time" type="time" required /></div><div class="f"><label>Personas</label><input v-model.number="form.people" type="number" min="1" max="60" required /></div></div>
        <div v-if="branch?.privateTables.length" class="f"><label>Mesa privada / salón (opcional)</label><select v-model="form.privateTable"><option value="">Mesa normal</option><option v-for="t in branch.privateTables" :key="t.name" :value="t.name">{{ t.name }} (hasta {{ t.capacity }})</option></select><span class="hint-s">Las mesas privadas las confirma el administrador del local.</span></div></div>
      <div class="card-s"><div class="f-row"><div class="f"><label>Nombre</label><input v-model="form.name" required /></div><div class="f"><label>WhatsApp</label><input v-model="form.phone" required inputmode="tel" placeholder="09…" /></div></div><div class="f"><label>Nota</label><textarea v-model="form.notes" placeholder="Cumpleaños, silla de bebé, etc." /></div><p class="hint-s">Reservas con más de una hora de anticipación se confirman al instante. Dentro de la hora, el local te confirma por WhatsApp.</p><button class="btn-s primary block" type="submit" :disabled="busy || !form.name || !form.phone"><i v-if="busy" class="fa-solid fa-circle-notch fa-spin" /> Reservar</button></div>
    </form>
  </div></div>
</template>
