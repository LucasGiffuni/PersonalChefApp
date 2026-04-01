import { supabase } from './supabase.js'

function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

function canonicalUnit(unit) {
  const u = String(unit || '').trim().toLowerCase()
  const map = {
    gramos: 'g',
    gramo: 'g',
    g: 'g',
    kilos: 'kg',
    kilo: 'kg',
    kg: 'kg',
    mililitros: 'ml',
    mililitro: 'ml',
    ml: 'ml',
    litros: 'l',
    litro: 'l',
    l: 'l',
    unidades: 'u',
    unidad: 'u',
    u: 'u',
    cucharada: 'cda',
    cucharadas: 'cda',
    cda: 'cda',
    cucharadita: 'cdta',
    cucharaditas: 'cdta',
    cdta: 'cdta',
    taza: 'taza',
    tazas: 'taza',
  }
  return map[u] || u
}

export function parseQty(value) {
  const raw = String(value || '').trim().replace(',', '.')
  if (!raw) return { qty: null, unit: '' }
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*([^\d].*)?$/i)
  if (!m) return { qty: null, unit: '' }
  return {
    qty: Number(m[1]),
    unit: canonicalUnit(m[2] || ''),
  }
}

function formatQty(value) {
  if (value == null || Number.isNaN(value)) return ''
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '')
}

function getCatalogPrice(catalogIndex, normalizedName, unit) {
  const options = catalogIndex.get(normalizedName) || []
  if (!options.length) return null
  const normalizedUnit = canonicalUnit(unit)
  const exact = options.find(x => canonicalUnit(x.unit) === normalizedUnit)
  if (exact) return exact
  return options.find(x => !x.unit) || null
}

export async function fetchIngredientsCatalog() {
  const { data, error } = await supabase
    .from('ingredients_catalog')
    .select('*')
    .order('name', { ascending: true })
  if (error) {
    console.error('fetchIngredientsCatalog error:', error)
    throw error
  }
  return data || []
}

export function classifyIngredient(name) {
  const n = normalizeName(name)
  if (/(pollo|carne|res|cerdo|bondiola|pescado|atun|atún|salm[oó]n|jam[oó]n|pavo|chorizo)/i.test(n)) return 'Carnes'
  if (/(leche|queso|manteca|mantequilla|crema|yogur|yogurt|ricota)/i.test(n)) return 'Lácteos'
  if (/(cebolla|ajo|zanahoria|papa|patata|tomate|morron|morr[oó]n|espinaca|lechuga|zapallo|calabaza|apio|pepino|berenjena|br[oó]coli)/i.test(n)) return 'Verduras'
  if (/(manzana|banana|pl[aá]tano|pera|naranja|lim[oó]n|lima|frutilla|fresa|uvas|durazno|mel[oó]n|sand[ií]a|palta|aguacate)/i.test(n)) return 'Frutas'
  if (/(arroz|fideo|pasta|harina|avena|lenteja|garbanzo|poroto|frijol|tomate enlatado|enlatado|conserva|az[uú]car|sal|aceite|vinagre|especia|pimienta|comino|piment[oó]n)/i.test(n)) return 'Secos/Enlatados'
  return 'Otros'
}

export function aggregateIngredients(recipesList, ingredientsCatalog = []) {
  const grouped = new Map()
  const catalogIndex = new Map()

  ingredientsCatalog.forEach(item => {
    const key = normalizeName(item.name)
    if (!key) return
    if (!catalogIndex.has(key)) catalogIndex.set(key, [])
    catalogIndex.get(key).push({
      unit: canonicalUnit(item.unit || ''),
      price: item.price == null ? null : Number(item.price),
    })
  })

  recipesList.forEach(entry => {
    const recipe = entry?.recipe || {}
    const sourceServings = Number(recipe.servings) || 1
    const targetServings = Number(entry?.servings) || sourceServings
    const factor = targetServings / sourceServings
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : []

    ingredients.forEach(ing => {
      const name = String(ing?.name || ing || '').trim()
      if (!name) return
      const grams = Number(ing?.grams)
      const parsed = Number.isFinite(grams) && grams > 0
        ? { qty: grams, unit: 'g' }
        : parseQty(ing?.qty || '')
      const unit = canonicalUnit(parsed.unit || 'g')
      const normalizedName = normalizeName(name)
      const key = `${normalizedName}::${unit}`
      const scaledQty = parsed.qty == null ? null : parsed.qty * factor

      if (!grouped.has(key)) {
        grouped.set(key, {
          name: normalizedName,
          displayName: name,
          qty: 0,
          hasNumericQty: scaledQty != null,
          unit,
        })
      }

      const bucket = grouped.get(key)
      if (scaledQty != null) {
        bucket.qty += scaledQty
        bucket.hasNumericQty = true
      }
    })
  })

  return Array.from(grouped.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(item => {
      const catalog = getCatalogPrice(catalogIndex, item.name, item.unit)
      const hasPrice = Boolean(catalog && catalog.price != null)
      const totalQty = item.hasNumericQty ? formatQty(item.qty) : ''
      const estimatedCost = hasPrice && item.hasNumericQty
        ? Math.round(item.qty * catalog.price * 100) / 100
        : null
      return {
        name: item.displayName,
        totalQty,
        unit: item.unit,
        hasPrice,
        estimatedCost,
      }
    })
}
