const nf2 = new Intl.NumberFormat('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 0 })
const nfq = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 2 })

export const money = (n: number | null | undefined) => `$${nf2.format(n ?? 0)}`
export const num = (n: number | null | undefined, d = 2) => (d === 0 ? nf0 : nf2).format(n ?? 0)
export const qty = (n: number | null | undefined, unit = '') => `${nfq.format(n ?? 0)}${unit ? ` ${unit}` : ''}`
export const pct = (n: number | null | undefined) => `${nfq.format(n ?? 0)}%`
export const dateShort = (iso: string | Date | null | undefined) => (iso ? new Date(typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00-05:00` : iso).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', weekday: 'short', day: '2-digit', month: 'short' }) : '—')
export const dateFull = (iso: string | Date | null | undefined) => (iso ? new Date(typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00-05:00` : iso).toLocaleDateString('es-EC', { timeZone: 'America/Guayaquil', weekday: 'long', day: '2-digit', month: 'long' }) : '—')
export const dateTime = (iso: string | Date | null | undefined) => (iso ? new Date(iso).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')
export const timeAgo = (iso: string | Date | null | undefined) => { if (!iso) return '—'; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); if (m < 1) return 'ahora'; if (m < 60) return `hace ${m} min`; const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`; return `hace ${Math.round(h / 24)} d` }
export const todayStr = () => new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10)
export const addDaysStr = (d: string, n: number) => new Date(new Date(`${d}T12:00:00-05:00`).getTime() + n * 86400000).toISOString().slice(0, 10)
export const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const weekdayOf = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay()

export const ROLE_LABELS: Record<string, string> = { admin: 'Administración del sistema', gerencia: 'Gerencia', local: 'Administrador de local', produccion: 'Centro de producción', bodega: 'Bodega central', compras: 'Compras', contabilidad: 'Contabilidad', atencion: 'Atención al cliente' }
export const GROUP_LABELS: Record<string, string> = { mariscos: 'Mariscos', preparados: 'Preparados (producción)', granos: 'Granos', verduras: 'Verduras y frutas', lacteos: 'Lácteos', carnes: 'Carnes', bebidas: 'Bebidas', insumos: 'Insumos', otros: 'Otros' }
export const UNIT_LABELS: Record<string, string> = { kg: 'kg', lb: 'lb', un: 'unidad', lt: 'litro', porcion: 'porción', paq: 'paquete' }
export const BRANCH_TYPE_LABELS: Record<string, string> = { local: 'Restaurante', produccion: 'Centro de producción', bodega: 'Bodega' }
export const ORDER_STATUS: Record<string, { label: string; cls: string }> = { borrador: { label: 'Borrador', cls: '' }, enviado: { label: 'Enviado a producción', cls: 'info' }, aprobado: { label: 'Aprobado', cls: 'ok' }, despachado: { label: 'Despachado', cls: 'warn' }, recibido: { label: 'Recibido', cls: 'ok' }, anulado: { label: 'Anulado', cls: 'danger' } }
export const PLAN_STATUS: Record<string, { label: string; cls: string }> = { borrador: { label: 'Borrador', cls: '' }, en_proceso: { label: 'En proceso', cls: 'info' }, cerrado: { label: 'Cerrado', cls: 'ok' } }
export const PURCHASE_STATUS: Record<string, { label: string; cls: string }> = { requerimiento: { label: 'Requerimiento', cls: '' }, pedida: { label: 'Pedida al proveedor', cls: 'info' }, recibida: { label: 'Recibida', cls: 'ok' }, anulada: { label: 'Anulada', cls: 'danger' } }
export const RESERVATION_STATUS: Record<string, { label: string; cls: string }> = { pendiente: { label: 'Por confirmar', cls: 'warn' }, confirmada: { label: 'Confirmada', cls: 'ok' }, sentada: { label: 'En mesa', cls: 'info' }, cancelada: { label: 'Cancelada', cls: 'danger' }, no_show: { label: 'No llegó', cls: 'danger' } }
export const CONVERSATION_STATUS: Record<string, { label: string; cls: string }> = { abierta: { label: 'Sin responder', cls: 'danger' }, esperando: { label: 'Esperando al cliente', cls: 'info' }, cerrada: { label: 'Cerrada', cls: '' } }
export const REVIEW_STATUS: Record<string, { label: string; cls: string }> = { nueva: { label: 'Sin responder', cls: 'warn' }, respondida: { label: 'Respondida', cls: 'ok' }, escalada: { label: 'Escalada a gerencia', cls: 'danger' } }
export const CHANNEL_LABELS: Record<string, string> = { whatsapp: 'WhatsApp', telefono: 'Teléfono', web: 'Web', agente: 'Agente IA', local: 'En el local' }
export const TOPIC_LABELS: Record<string, string> = { reserva: 'Reserva', pedido: 'Pedido a domicilio', queja: 'Queja', consulta: 'Consulta', evento: 'Evento', otro: 'Otro' }
export const MOVEMENT_LABELS: Record<string, string> = { ingreso: 'Ingreso', egreso: 'Egreso', venta: 'Venta (receta)', produccion: 'Producción', consumo_produccion: 'Consumo en producción', despacho: 'Despacho a local', recepcion: 'Recepción de producción', ajuste: 'Ajuste', merma: 'Merma', conteo: 'Conteo físico' }
export const ALERT_TYPE_LABELS: Record<string, string> = { pedido_inflado: 'Pedido por encima de lo sugerido', stock_critico: 'Stock bajo mínimo', diferencia_inventario: 'Diferencia de inventario', pedido_sin_enviar: 'Local sin pedido', ventas_sin_cerrar: 'Ventas sin cerrar', materia_prima_faltante: 'Falta materia prima', reserva_sin_confirmar: 'Reserva sin confirmar', resena_negativa: 'Reseña negativa', conversacion_sin_responder: 'WhatsApp sin responder', otro: 'Otro' }
export function statusBadge(map: Record<string, { label: string; cls: string }>, key: string) { return map[key] ?? { label: key, cls: '' } }
export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const first = rows[0]
  if (!first) return
  const headers = Object.keys(first)
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [headers.join(';'), ...rows.map((r) => headers.map((h) => esc(r[h])).join(';'))].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = filename; a.click(); URL.revokeObjectURL(a.href)
}
