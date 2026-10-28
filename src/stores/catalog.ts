import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Branch, Ingredient, Product, Category, Supplier } from '@/types'
import { api } from '@/services/api'

/** Catálogos pequeños que se usan en muchas pantallas (locales, insumos, productos). Se cargan una vez por sesión. */
export const useCatalogStore = defineStore('catalog', () => {
  const branches = ref<Branch[]>([])
  const ingredients = ref<Ingredient[]>([])
  const products = ref<Product[]>([])
  const categories = ref<Category[]>([])
  const suppliers = ref<Supplier[]>([])
  const loadedAt = ref<Record<string, number>>({})
  const fresh = (k: string) => Date.now() - (loadedAt.value[k] ?? 0) < 60000

  const locals = computed(() => branches.value.filter((b) => b.type === 'local'))
  const branchName = (id: string | null | undefined) => branches.value.find((b) => b._id === id)?.name ?? '—'
  const ingredientById = (id: string) => ingredients.value.find((i) => i._id === id)

  async function loadBranches(force = false) { if (!force && fresh('branches') && branches.value.length) return; branches.value = (await api.branches({ active: 'all' })).items; loadedAt.value.branches = Date.now() }
  async function loadIngredients(force = false) { if (!force && fresh('ingredients') && ingredients.value.length) return; ingredients.value = (await api.ingredients()).items; loadedAt.value.ingredients = Date.now() }
  async function loadProducts(force = false) { if (!force && fresh('products') && products.value.length) return; const [p, c] = await Promise.all([api.products(), api.categories()]); products.value = p.items; categories.value = c.items; loadedAt.value.products = Date.now() }
  async function loadSuppliers(force = false) { if (!force && fresh('suppliers') && suppliers.value.length) return; suppliers.value = (await api.suppliers()).items; loadedAt.value.suppliers = Date.now() }
  return { branches, locals, ingredients, products, categories, suppliers, branchName, ingredientById, loadBranches, loadIngredients, loadProducts, loadSuppliers }
})
