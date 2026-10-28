/**
 * Subida de fotos a Cloudinary directo desde el navegador.
 * 1) Pide a la API una firma (`POST /media/sign`), 2) manda el archivo a Cloudinary con XHR (para mostrar
 * progreso), 3) devuelve la URL segura y el public_id para guardarlos en la entidad que corresponda
 * (evidencia de entrega, chequeo de calidad, foto de producto).
 * Las fotos se reducen a 1600 px de lado antes de subir para que desde un celular pesen poco.
 */
import { ref } from 'vue'
import { api } from '@/services/api'

export interface UploadedImage { url: string; publicId: string; width: number; height: number; bytes: number }

async function shrink(file: File, max = 1600, quality = 0.86): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 1_200_000) return file
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality))
  } catch { return file }
}

export function useCloudinaryUpload() {
  const progress = ref(0)
  const uploading = ref(false)
  const error = ref('')

  async function upload(file: File, opts: { folder?: string; publicId?: string; tags?: string[] } = {}): Promise<UploadedImage | null> {
    uploading.value = true; progress.value = 0; error.value = ''
    try {
      const sig = await api.signUpload(opts)
      const blob = await shrink(file)
      const form = new FormData()
      for (const [k, v] of Object.entries(sig.params)) form.append(k, v)
      form.append('file', blob, file.name.replace(/\.[^.]+$/, '') + '.jpg')
      const res = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', sig.uploadUrl)
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) progress.value = Math.round((e.loaded / e.total) * 100) }
        xhr.onload = () => { try { const d = JSON.parse(xhr.responseText); xhr.status < 300 ? resolve(d) : reject(new Error((d.error && d.error.message) || `Cloudinary ${xhr.status}`)) } catch { reject(new Error('Respuesta inválida de Cloudinary')) } }
        xhr.onerror = () => reject(new Error('No se pudo conectar con Cloudinary'))
        xhr.send(form)
      })
      progress.value = 100
      return { url: String(res.secure_url), publicId: String(res.public_id), width: Number(res.width), height: Number(res.height), bytes: Number(res.bytes) }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally { uploading.value = false }
  }

  return { upload, progress, uploading, error }
}
