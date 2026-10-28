import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { CartLine, ShopProduct } from '@/services/shopApi'

const KEY = 'lpg.cart'
function load(): { lines: CartLine[]; branch: string; type: 'retiro' | 'domicilio' } { try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) } catch { /* privado */ } return { lines: [], branch: '', type: 'retiro' } }

/** Carrito de la tienda en línea (se guarda en el navegador del cliente). */
export const useCartStore = defineStore('cart', () => {
  const saved = load()
  const lines = ref<CartLine[]>(saved.lines)
  const branch = ref<string>(saved.branch)
  const type = ref<'retiro' | 'domicilio'>(saved.type)
  watch([lines, branch, type], () => { try { localStorage.setItem(KEY, JSON.stringify({ lines: lines.value, branch: branch.value, type: type.value })) } catch { /* privado */ } }, { deep: true })
  const count = computed(() => lines.value.reduce((a, l) => a + l.qty, 0))
  const unit = (l: CartLine) => l.product.price + l.options.reduce((a, o) => a + o.price, 0)
  const subtotal = computed(() => Math.round(lines.value.reduce((a, l) => a + unit(l) * l.qty, 0) * 100) / 100)
  function add(product: ShopProduct, qty: number, options: { name: string; choice: string; price: number }[], notes: string) {
    const key = `${product.id}|${options.map((o) => `${o.name}=${o.choice}`).join(',')}|${notes}`
    const existing = lines.value.find((l) => l.key === key)
    if (existing) existing.qty += qty
    else lines.value.push({ key, product, qty, options, notes })
  }
  function setQty(key: string, qty: number) { const l = lines.value.find((x) => x.key === key); if (!l) return; if (qty <= 0) lines.value = lines.value.filter((x) => x.key !== key); else l.qty = qty }
  function clear() { lines.value = [] }
  return { lines, branch, type, count, subtotal, unit, add, setQty, clear }
})
