<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { apiErrorMessage } from '@/services/httpBase'
import { ROLE_HOME } from '@/router'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const email = ref('')
const password = ref('')
const error = ref('')
const showPassword = ref(false)

async function submit() {
  error.value = ''
  try {
    await userStore.login(email.value, password.value)
    const next = typeof route.query.next === 'string' ? route.query.next : null
    router.replace(next ?? ROLE_HOME[userStore.role ?? 'gerencia'])
  } catch (err) {
    error.value = apiErrorMessage(err)
  }
}
</script>

<template>
  <div class="login">
    <form class="card login-card" @submit.prevent="submit">
      <div class="brand"><img class="logo" src="/brand/logo.svg" alt="La Pata Gorda" /><h1>La Pata Gorda</h1><p class="hint"><RouterLink to="/">Ir a la tienda</RouterLink></p><p class="muted small">Locales, producción, inventario y atención en un solo lugar</p></div>
      <div class="field"><label>Correo</label><input v-model="email" class="input" type="email" autocomplete="username" inputmode="email" required autofocus /></div>
      <div class="field"><label>Contraseña</label><div class="pw"><input v-model="password" class="input" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required /><button type="button" class="btn ghost icon" @click="showPassword = !showPassword"><i class="fa-solid" :class="showPassword ? 'fa-eye-slash' : 'fa-eye'" /></button></div></div>
      <p v-if="error" class="alert-box danger"><i class="fa-solid fa-circle-xmark" /> {{ error }}</p>
      <button class="btn primary lg block" type="submit" :disabled="userStore.loading"><i v-if="userStore.loading" class="fa-solid fa-circle-notch fa-spin" /> Ingresar</button>
      <p class="hint">Cada persona entra con su propio usuario: todo lo que registre queda a su nombre.</p>
    </form>
  </div>
</template>

<style scoped lang="scss">
.login { min-height: 100dvh; display: flex; align-items: center; justify-content: center; padding: 1rem; background: radial-gradient(circle at 30% 20%, #2a6fe8, var(--navy-800) 45%, var(--navy-900)); }
.login-card { width: min(420px, 100%); display: flex; flex-direction: column; gap: 1rem; padding: 1.75rem; }
.brand { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; text-align: center; .logo { width: 96px; height: 96px; display: block; border-radius: 50%; box-shadow: 0 6px 20px rgba(13,47,120,0.25); } h1 { font-size: 1.4rem; } }
.pw { display: flex; gap: 0.35rem; align-items: center; .input { flex: 1; } }
</style>
