<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { api } from '@/services/api'
import { useAction } from '@/composables/useAsync'
import { ROLE_LABELS } from '@/utils/format'

const userStore = useUserStore()
const { busy, run } = useAction()
const current = ref('')
const next = ref('')
const repeat = ref('')
async function change() {
  if (next.value !== repeat.value) return
  const r = await run(() => api.changePassword(current.value, next.value), 'Contraseña actualizada')
  if (r) { current.value = ''; next.value = ''; repeat.value = '' }
}
</script>
<template>
  <div class="page">
    <div class="page-head"><div class="title"><span class="eyebrow">Mi cuenta</span><h1>{{ userStore.user?.name }}</h1></div></div>
    <div class="cols cols-2">
      <div class="card"><h3>Datos</h3><dl class="kv" style="margin-top:0.75rem"><dt>Correo</dt><dd>{{ userStore.user?.email }}</dd><dt>Rol</dt><dd>{{ userStore.realRole ? ROLE_LABELS[userStore.realRole] : '' }}</dd><dt v-if="userStore.user?.branchName">Local</dt><dd v-if="userStore.user?.branchName">{{ userStore.user.branchName }}</dd></dl></div>
      <form class="card stack" @submit.prevent="change"><h3>Cambiar contraseña</h3><div class="field"><label>Actual</label><input v-model="current" class="input" type="password" required /></div><div class="field"><label>Nueva</label><input v-model="next" class="input" type="password" minlength="6" required /></div><div class="field"><label>Repetir</label><input v-model="repeat" class="input" type="password" required /><span v-if="repeat && repeat !== next" class="error">No coinciden</span></div><button class="btn primary" :disabled="busy || next !== repeat">Guardar</button></form>
    </div>
  </div>
</template>
