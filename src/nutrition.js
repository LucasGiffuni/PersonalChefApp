import { supabase } from './supabase.js'

export function normalizeIngredient(name) {
  let normalized = String(name || '').toLowerCase().trim().replace(/\s+/g, ' ')
  if (normalized.length > 3 && normalized.endsWith('es')) normalized = normalized.slice(0, -2)
  else if (normalized.length > 2 && normalized.endsWith('s')) normalized = normalized.slice(0, -1)
  return normalized
}

function titleCase(text) {
  return String(text || '')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1))
    .join(' ')
}

function pickNutrient(food, names) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : []
  const hit = nutrients.find(n => names.includes(String(n?.nutrientName || '').toLowerCase()))
  if (!hit) return 0
  return Number(hit.value) || 0
}

function mapCatalogRow(row) {
  return {
    id: row.id,
    name: row.name,
    display_name: row.display_name,
    fdc_id: row.fdc_id,
    calories_per_100g: Number(row.calories_per_100g) || 0,
    protein_per_100g: Number(row.protein_per_100g) || 0,
    fat_per_100g: Number(row.fat_per_100g) || 0,
    carbs_per_100g: Number(row.carbs_per_100g) || 0,
  }
}

const ES_EN_INGREDIENTS = {
  zanahoria: 'carrot',
  cebolla: 'onion',
  ajo: 'garlic',
  papa: 'potato',
  patata: 'potato',
  tomate: 'tomato',
  lechuga: 'lettuce',
  espinaca: 'spinach',
  pepino: 'cucumber',
  berenjena: 'eggplant',
  morron: 'bell pepper',
  pimiento: 'bell pepper',
  zapallo: 'pumpkin',
  calabaza: 'pumpkin',
  brocoli: 'broccoli',
  brócoli: 'broccoli',
  manzana: 'apple',
  banana: 'banana',
  platano: 'banana',
  plátano: 'banana',
  pera: 'pear',
  limon: 'lemon',
  limón: 'lemon',
  pollo: 'chicken',
  carne: 'beef',
  cerdo: 'pork',
  atun: 'tuna',
  atún: 'tuna',
  arroz: 'rice',
  queso: 'cheese',
  leche: 'milk',
  huevo: 'egg',
}

function translateToEnglish(raw, normalized) {
  const rawKey = String(raw || '').trim().toLowerCase()
  return ES_EN_INGREDIENTS[normalized] || ES_EN_INGREDIENTS[rawKey] || normalized
}

function isRawLabel(value) {
  const text = String(value || '').toLowerCase()
  return /(^|[\s,;()\-])raw([\s,;()\-]|$)/i.test(text)
}

function preferRawResults(rows) {
  const rawFirst = [...rows].sort((a, b) => {
    const aRaw = isRawLabel(a.display_name) ? 1 : 0
    const bRaw = isRawLabel(b.display_name) ? 1 : 0
    return bRaw - aRaw
  })
  return rawFirst
}

export async function searchIngredient(query) {
  const raw = String(query || '').trim()
  const normalizedEs = normalizeIngredient(raw)
  if (!normalizedEs) return []
  const englishQuery = translateToEnglish(raw, normalizedEs)
  const normalizedEn = normalizeIngredient(englishQuery)

  const { data: cached, error: cacheError } = await supabase
    .from('ingredients_catalog')
    .select('id, name, display_name, fdc_id, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g')
    .or(`name.ilike.%${normalizedEs}%,name.ilike.%${normalizedEn}%,display_name.ilike.%${raw}%,display_name.ilike.%${englishQuery}%`)
    .order('name', { ascending: true })
    .limit(8)

  if (cacheError) throw cacheError
  if (cached?.length) return preferRawResults(cached.map(mapCatalogRow))

  const { data: { session } } = await supabase.auth.getSession()
  const invokeHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined
  const { data, error } = await supabase.functions.invoke('usda-search', {
    body: { query: englishQuery, rawOnly: true },
    headers: invokeHeaders,
  })
  if (error) throw error
  const food = data?.food
  if (!food) return []

  const payload = {
    name: normalizedEs || normalizedEn,
    display_name: titleCase(normalizedEs || food.description || englishQuery),
    fdc_id: food.fdcId,
    calories_per_100g: pickNutrient(food, ['energy']),
    protein_per_100g: pickNutrient(food, ['protein']),
    fat_per_100g: pickNutrient(food, ['total lipid (fat)', 'fatty acids, total saturated']),
    carbs_per_100g: pickNutrient(food, ['carbohydrate, by difference']),
  }

  const { data: inserted, error: insertError } = await supabase
    .from('ingredients_catalog')
    .upsert(payload, { onConflict: 'fdc_id' })
    .select('id, name, display_name, fdc_id, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g')
    .single()

  if (insertError) throw insertError
  return [mapCatalogRow(inserted)]
}

export async function fetchIngredientsByIds(ids) {
  const uniqueIds = [...new Set((ids || []).map(id => Number(id)).filter(Boolean))]
  if (!uniqueIds.length) return []
  const { data, error } = await supabase
    .from('ingredients_catalog')
    .select('id, name, display_name, fdc_id, calories_per_100g, protein_per_100g, fat_per_100g, carbs_per_100g')
    .in('id', uniqueIds)
  if (error) throw error
  return (data || []).map(mapCatalogRow)
}

export function calculateNutrition(recipe, catalogSource = []) {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
  const catalogMap = catalogSource instanceof Map
    ? catalogSource
    : new Map((catalogSource || []).map(i => [Number(i.id), i]))

  const totals = ingredients.reduce((acc, ing) => {
    const ingredientId = Number(ing?.ingredient_id)
    const grams = Number(ing?.grams)
    if (!ingredientId || !Number.isFinite(grams) || grams <= 0) return acc
    const catalog = catalogMap.get(ingredientId)
    if (!catalog) return acc

    acc.calories += (Number(catalog.calories_per_100g) || 0) * grams / 100
    acc.protein += (Number(catalog.protein_per_100g) || 0) * grams / 100
    acc.fat += (Number(catalog.fat_per_100g) || 0) * grams / 100
    acc.carbs += (Number(catalog.carbs_per_100g) || 0) * grams / 100
    return acc
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 })

  return {
    calories: Math.round(totals.calories * 100) / 100,
    protein: Math.round(totals.protein * 100) / 100,
    fat: Math.round(totals.fat * 100) / 100,
    carbs: Math.round(totals.carbs * 100) / 100,
  }
}
