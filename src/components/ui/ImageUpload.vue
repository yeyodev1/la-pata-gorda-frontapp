<script setup lang="ts">
/**
 * Botón de foto (cámara en celular, archivo en escritorio) que sube a Cloudinary y emite la URL.
 * Uso: <ImageUpload v-model="foto" folder="despachos" label="Foto de la entrega" />
 */
import { ref } from 'vue'
import { useCloudinaryUpload, type UploadedImage } from '@/composables/useCloudinaryUpload'

const props = withDefaults(defineProps<{ modelValue?: string; folder?: string; label?: string; tags?: string[]; compact?: boolean }>(), { modelValue: '', folder: 'general', label: 'Agregar foto', tags: () => [] })
const emit = defineEmits<{ 'update:modelValue': [value: string]; uploaded: [image: UploadedImage] }>()
const input = ref<HTMLInputElement | null>(null)
const { upload, progress, uploading, error } = useCloudinaryUpload()

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const img = await upload(file, { folder: props.folder, tags: props.tags })
  if (img) { emit('update:modelValue', img.url); emit('uploaded', img) }
  if (input.value) input.value.value = ''
}
function clear() { emit('update:modelValue', '') }
</script>
<template>
  <div class="imgup" :class="{ compact }">
    <input ref="input" type="file" accept="image/*" capture="environment" hidden @change="onPick" />
    <div v-if="modelValue" class="imgup-preview">
      <img :src="modelValue" alt="" loading="lazy" />
      <div class="imgup-actions"><button type="button" class="btn sm" :disabled="uploading" @click="input?.click()"><i class="fa-solid fa-camera" /> Cambiar</button><button type="button" class="btn sm ghost" :disabled="uploading" @click="clear"><i class="fa-solid fa-trash" /> Quitar</button></div>
    </div>
    <button v-else type="button" class="imgup-btn" :disabled="uploading" @click="input?.click()">
      <i class="fa-solid" :class="uploading ? 'fa-spinner fa-spin' : 'fa-camera'" />
      <span>{{ uploading ? `Subiendo… ${progress}%` : label }}</span>
    </button>
    <div v-if="uploading" class="imgup-bar"><span :style="{ width: progress + '%' }" /></div>
    <p v-if="error" class="hint danger">{{ error }}</p>
  </div>
</template>
<style scoped lang="scss">
.imgup { display: flex; flex-direction: column; gap: 0.4rem; }
.imgup-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; min-height: 56px; border: 2px dashed var(--border); border-radius: 12px; background: var(--surface-2, #f4f6f8); color: var(--text-muted); font-weight: 700; cursor: pointer; &:hover { border-color: var(--blue-500, #2b7fc2); color: var(--blue-700, #16507a); } &:disabled { opacity: 0.7; cursor: wait; } }
.compact .imgup-btn { min-height: 42px; }
.imgup-preview { display: flex; flex-direction: column; gap: 0.4rem; img { width: 100%; max-height: 260px; object-fit: cover; border-radius: 12px; border: 1px solid var(--border); } }
.imgup-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.imgup-bar { height: 6px; border-radius: 3px; background: var(--border); overflow: hidden; span { display: block; height: 100%; background: var(--blue-500, #2b7fc2); transition: width 0.2s; } }
.hint.danger { color: var(--red-600, #d92d20); }
</style>
