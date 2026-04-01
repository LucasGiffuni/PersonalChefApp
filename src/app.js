import { fetchRecipes, upsertRecipe, deleteRecipe, uploadPhoto } from './db.js'
import { fetchClients, upsertClient, deleteClient } from './clients.js'
import { fetchServices, upsertService, deleteService } from './services.js'
import { searchIngredient, calculateNutrition, fetchIngredientsByIds } from './nutrition.js'
import { aggregateIngredients, classifyIngredient, fetchIngredientsCatalog } from './shopping.js'
import { logout } from './auth.js'

// ─── State ────────────────────────────────────────────────────────────────────
let recipes = []
let activeCat = 'Todas'
let curRecipe = null
let curServ = 4
let baseServ = 4
let editingId = null
let photoFile = null
let photoPreviewUrl = null
let formIngredients = []
let formSteps = []
let appInitialized = false
let ingredientSearchTimer
let ingredientSuggestions = []
let selectedIngredientMatch = null
let nutritionCatalogById = new Map()
let curRecipeNutritionBase = null

// Clients state
let clients = []
let clientEditingId = null
let formAllergies = []
let services = []
let serviceEditingId = null
let currentMonth = new Date().getMonth()
let currentYear = new Date().getFullYear()
let selectedServiceDate = toIsoDate(new Date())
let calendarListMode = false
let selectedServiceStatus = 'pendiente'
let ingredientsCatalog = []
let shoppingMode = 'recipes'
let shoppingSelectedRecipes = new Map()
let shoppingManualItems = []
let shoppingResults = []
let shoppingCollapsedCategories = new Set()
let shoppingIdCounter = 1

const CATS = ['Todas', 'Entrada', 'Principal', 'Postre', 'Sopa', 'Otro']
const ING_UNIT_FACTORS = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  cda: 15,
  cdta: 5,
  taza: 240,
}

const $ = id => document.getElementById(id)

const showView = id => {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  $(id).classList.add('active')
  setBottomNavActive(id)
}

function setBottomNavActive(viewId) {
  document.querySelectorAll('.bnav-btn[data-nav]').forEach(btn => {
    btn.classList.toggle('bnav-active', btn.dataset.nav === viewId)
  })
}

let toastTimer
function toast(msg, isError = false) {
  const t = $('toast')
  t.textContent = msg
  t.className = 'toast show' + (isError ? ' error' : '')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800)
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initApp() {
  if (!appInitialized) {
    bindEvents()
    appInitialized = true
  }
  showView('v-list')
  initList()
}

// ─── Events ───────────────────────────────────────────────────────────────────
function bindEvents() {
  // Recipes
  $('search').addEventListener('input', renderList)
  $('fab-add').addEventListener('click', () => openForm())
  $('serv-dec').addEventListener('click', () => changeServ(-1))
  $('serv-inc').addEventListener('click', () => changeServ(1))
  $('btn-delete').addEventListener('click', handleDelete)
  $('btn-add-shopping').addEventListener('click', () => addCurrentRecipeToShopping())
  $('form-cancel').addEventListener('click', () => showView('v-list'))
  $('form-save-btn').addEventListener('click', handleSave)
  $('photo-input').addEventListener('change', onPhotoChange)
  $('ing-input-name').addEventListener('input', onIngredientInput)
  $('ing-input-name').addEventListener('focus', onIngredientInput)
  $('ing-input-name').addEventListener('blur', () => {
    setTimeout(() => { $('ing-suggest').style.display = 'none' }, 140)
  })

  // Clients
  $('client-search').addEventListener('input', renderClientList)
  $('fab-add-client').addEventListener('click', () => openClientForm())
  $('cf-cancel').addEventListener('click', () => showView('v-clients'))
  $('cf-save-btn').addEventListener('click', handleClientSave)
  $('cf-delete-btn').addEventListener('click', handleClientDelete)

  // Services / Calendar
  $('cal-prev').addEventListener('click', () => moveMonth(-1))
  $('cal-next').addEventListener('click', () => moveMonth(1))
  $('calendar-toggle-view').addEventListener('click', toggleCalendarMode)
  $('fab-add-service').addEventListener('click', () => openServiceForm())
  $('sf-cancel').addEventListener('click', () => showView('v-calendar'))
  $('sf-save-btn').addEventListener('click', handleServiceSave)
  $('sf-delete-btn').addEventListener('click', handleServiceDelete)
  $('sf-status-wrap').addEventListener('click', handleStatusPillClick)

  // Shopping
  $('shopping-mode-recipes').addEventListener('click', () => setShoppingMode('recipes'))
  $('shopping-mode-manual').addEventListener('click', () => setShoppingMode('manual'))
  $('shopping-content').addEventListener('click', handleShoppingContentClick)
}

window.handleLogout = async function () {
  await logout()
}

window.goTo = function (id) {
  showView(id)
}

window.goToClients = function () {
  showView('v-clients')
  initClients()
}

window.goToCalendar = function () {
  showView('v-calendar')
  initCalendar()
}

window.goToShopping = function () {
  showView('v-shopping')
  initShopping()
}

// ─── Recipes List ─────────────────────────────────────────────────────────────
async function initList() {
  $('rlist').innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>'
  try {
    recipes = await fetchRecipes()
    console.log('fetchRecipes result:', recipes)
  } catch {
    toast('Error al cargar recetas', true)
  }
  renderCats()
  renderList()
}

function renderCats() {
  const wrap = $('cat-wrap')
  wrap.innerHTML = ''
  CATS.forEach(c => {
    const btn = document.createElement('button')
    btn.className = 'cat-pill' + (activeCat === c ? ' active' : '')
    btn.textContent = c
    btn.addEventListener('click', () => { activeCat = c; renderCats(); renderList() })
    wrap.appendChild(btn)
  })
}

function renderList() {
  const q = $('search').value.toLowerCase().trim()
  let list = recipes
  if (activeCat !== 'Todas') list = list.filter(r => r.cat === activeCat)
  if (q) list = list.filter(r => r.name.toLowerCase().includes(q))

  const wrap = $('rlist')
  if (!list.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🍽</div>
        <div class="empty-state-text">Sin resultados.<br>Usá el botón + para agregar tu primera receta.</div>
      </div>`
    return
  }

  wrap.innerHTML = list.map(r => `
    <div class="recipe-card" data-id="${r.id}">
      <div class="recipe-card-placeholder" style="position:relative">
        ${r.photo_url
          ? `<img class="recipe-card-photo" src="${r.photo_url}" alt="${r.name || ''}" loading="lazy">`
          : (r.emoji || '🍽')}
        ${r.time ? `<div class="time-chip">⏱ ${r.time}</div>` : ''}
      </div>
      <div class="recipe-card-body">
        <div class="recipe-card-name">${r.name || ''}</div>
        <div class="recipe-card-desc">${r.description || ''}</div>
        <div class="recipe-card-tags">
          ${(r.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
          ${r.difficulty ? `<span class="tag">${r.difficulty}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('')

  wrap.querySelectorAll('.recipe-card').forEach(card => {
    card.addEventListener('click', () => {
      const r = recipes.find(x => String(x.id) === card.dataset.id)
      if (r) openDetail(r)
    })
  })
}

// ─── Detail ───────────────────────────────────────────────────────────────────
function openDetail(r) {
  curRecipe = r
  baseServ = r.servings || 4
  curServ = baseServ
  curRecipeNutritionBase = null

  const hero = $('d-hero')
  hero.innerHTML = r.photo_url
    ? `<img src="${r.photo_url}" alt="${r.name}">`
    : r.emoji || '🍽'
  hero.insertAdjacentHTML('beforeend', `
    <button class="detail-hero-back" onclick="
      document.getElementById('v-list').classList.add('active');
      document.getElementById('v-detail').classList.remove('active')
    ">‹</button>
    <button class="detail-hero-edit" id="detail-edit-btn">Editar</button>
  `)
  $('detail-edit-btn').addEventListener('click', () => openForm(r))

  $('d-title').textContent = r.name
  $('d-desc').textContent = r.description || ''
  $('d-meta').innerHTML = [['⏱', r.time], ['👨‍🍳', r.difficulty], ['🍽', r.cat]]
    .filter(([, v]) => v)
    .map(([icon, val]) => `<div class="meta-chip">${icon} ${val}</div>`)
    .join('')

  $('d-serv').textContent = curServ
  renderDetailIngs()
  updateBatchInfo()
  renderNutritionSummary()
  loadRecipeNutrition(r)

  $('d-steps').innerHTML = (r.steps || [])
    .map((s, i) => `
      <div class="step-row">
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${s}</div>
      </div>`)
    .join('')

  showView('v-detail')
}

function scaleGrams(grams, factor) {
  const n = Number(grams)
  if (!Number.isFinite(n) || n <= 0) return ''
  const scaled = Math.round(n * factor * 100) / 100
  return scaled % 1 === 0 ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, '')
}

function parseLegacyQtyToGrams(qty) {
  const m = String(qty || '').trim().replace(',', '.').match(/^(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function estimateUnitWeightG(ingredientName) {
  const name = String(ingredientName || '').toLowerCase()
  if (/huevo|egg/.test(name)) return 50
  if (/zanahoria|carrot/.test(name)) return 60
  if (/cebolla|onion/.test(name)) return 110
  if (/ajo|garlic/.test(name)) return 5
  if (/tomate|tomato/.test(name)) return 120
  if (/papa|potato/.test(name)) return 170
  if (/manzana|apple/.test(name)) return 180
  if (/banana/.test(name)) return 120
  if (/lim[oó]n|lemon/.test(name)) return 65
  if (/palta|avocado/.test(name)) return 180
  if (/pechuga|pollo|chicken/.test(name)) return 180
  return 100
}

function amountToGrams(amount, unit, ingredientName) {
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return null
  if (unit === 'u') return n * estimateUnitWeightG(ingredientName)
  const factor = ING_UNIT_FACTORS[unit] || 1
  return n * factor
}

function formatIngMeasure(ing) {
  const amount = Number(ing.amount)
  const unit = String(ing.unit || 'g')
  if (Number.isFinite(amount) && amount > 0) {
    const main = `${amount % 1 === 0 ? amount : round2(amount)} ${unit}`
    const grams = Number(ing.grams)
    if (unit !== 'g' && Number.isFinite(grams) && grams > 0) {
      return `${main} (~${round2(grams)} g)`
    }
    return main
  }
  const grams = Number(ing.grams)
  if (Number.isFinite(grams) && grams > 0) return `${round2(grams)} g`
  return ''
}

function renderDetailIngs() {
  const factor = curServ / baseServ
  $('d-ings').innerHTML = (curRecipe.ingredients || [])
    .map(ing => `
      <div class="ing-item">
        <div class="ing-dot"></div>
        <div class="ing-name">${ing.name || ing}</div>
        <div class="ing-qty">${(() => {
          const base = Number(ing.grams) || parseLegacyQtyToGrams(ing.qty)
          const scaled = scaleGrams(base, factor)
          return scaled ? `${scaled} g` : ''
        })()}</div>
      </div>`)
    .join('')
}

function updateBatchInfo() {
  const el = $('d-batch-info')
  if (curServ === baseServ) {
    el.style.display = 'none'
    return
  }
  const factor = curServ / baseServ
  const batches = Math.ceil(factor)
  const fmtFactor = factor % 1 === 0 ? factor : factor.toFixed(2).replace(/\.?0+$/, '')
  el.style.display = ''
  el.innerHTML = `
    <div class="batch-factor">×${fmtFactor}</div>
    <div class="batch-detail">
      <div class="batch-main">${batches === 1 ? 'Con 1 tanda alcanza' : `Necesitás ${batches} tandas`}</div>
      <div class="batch-sub">Receta base: ${baseServ} personas · Factor ×${fmtFactor}</div>
    </div>
  `
}

async function loadRecipeNutrition(recipe) {
  try {
    const ingredientIds = (recipe.ingredients || [])
      .map(i => Number(i?.ingredient_id))
      .filter(Boolean)

    const missing = ingredientIds.filter(id => !nutritionCatalogById.has(id))
    if (missing.length) {
      const rows = await fetchIngredientsByIds(missing)
      rows.forEach(row => nutritionCatalogById.set(Number(row.id), row))
    }
    curRecipeNutritionBase = calculateNutrition(recipe, nutritionCatalogById)
  } catch (err) {
    console.error(err)
    curRecipeNutritionBase = null
  }
  renderNutritionSummary()
}

function renderNutritionSummary() {
  const el = $('d-nutrition')
  if (!curRecipeNutritionBase) {
    el.style.display = 'none'
    return
  }
  const factor = curServ / baseServ
  const total = {
    calories: round2(curRecipeNutritionBase.calories * factor),
    protein: round2(curRecipeNutritionBase.protein * factor),
    fat: round2(curRecipeNutritionBase.fat * factor),
    carbs: round2(curRecipeNutritionBase.carbs * factor),
  }
  const perServing = {
    calories: round2(total.calories / curServ),
    protein: round2(total.protein / curServ),
    fat: round2(total.fat / curServ),
    carbs: round2(total.carbs / curServ),
  }
  el.style.display = ''
  el.innerHTML = `
    <div class="nutrition-top">
      <div class="nutrition-kcal">${Math.round(total.calories)} kcal</div>
      <div class="nutrition-servings">${curServ} porciones</div>
    </div>
    <div class="nutrition-macros">
      <div class="nutrition-macro"><span>P</span><strong>${total.protein}g</strong></div>
      <div class="nutrition-macro"><span>C</span><strong>${total.carbs}g</strong></div>
      <div class="nutrition-macro"><span>G</span><strong>${total.fat}g</strong></div>
    </div>
    <div class="nutrition-sub">Por porción: ${Math.round(perServing.calories)} kcal · P ${perServing.protein}g · C ${perServing.carbs}g · G ${perServing.fat}g</div>
  `
}

function changeServ(d) {
  curServ = Math.max(1, curServ + d)
  $('d-serv').textContent = curServ
  renderDetailIngs()
  updateBatchInfo()
  renderNutritionSummary()
}

async function handleDelete() {
  if (!curRecipe || !confirm(`¿Eliminar "${curRecipe.name}"?`)) return
  try {
    await deleteRecipe(curRecipe.id)
    recipes = recipes.filter(r => r.id !== curRecipe.id)
    renderList()
    toast('Receta eliminada')
    showView('v-list')
  } catch {
    toast('Error al eliminar', true)
  }
}

// ─── Recipe Form ──────────────────────────────────────────────────────────────
function openForm(recipe = null) {
  editingId = recipe?.id || null
  photoFile = null
  photoPreviewUrl = recipe?.photo_url || null
  selectedIngredientMatch = null
  ingredientSuggestions = []
  $('ing-suggest').style.display = 'none'

  $('form-title').textContent = recipe ? 'Editar receta' : 'Nueva receta'
  $('f-name').value  = recipe?.name || ''
  $('f-cat').value   = recipe?.cat  || 'Principal'
  $('f-emoji').value = recipe?.emoji || ''
  $('f-desc').value  = recipe?.description || ''
  $('f-time').value  = recipe?.time || ''
  $('f-diff').value  = recipe?.difficulty || 'Media'
  $('f-serv').value  = recipe?.servings || 4
  $('f-tags').value  = (recipe?.tags || []).join(', ')

  formIngredients = (recipe?.ingredients || []).map(i => ({
    name: i.name || '',
    grams: Number(i.grams) || parseLegacyQtyToGrams(i.qty) || '',
    ingredient_id: i.ingredient_id || null,
    amount: Number(i.amount) || Number(i.grams) || parseLegacyQtyToGrams(i.qty) || '',
    unit: i.unit || 'g',
  }))
  formSteps = [...(recipe?.steps || [])]

  renderPhotoArea()
  showView('v-form')
  renderIngList()
  renderStepList()
  updateStepNextNum()
}

function renderPhotoArea() {
  const wrap = $('photo-wrap')
  wrap.innerHTML = ''
  const hero = document.createElement('div')
  hero.className = 'photo-hero'
  if (photoPreviewUrl) {
    hero.innerHTML = `
      <img src="${photoPreviewUrl}" alt="preview">
      <div class="photo-hero-overlay">📷 Cambiar foto</div>`
  } else {
    hero.innerHTML = `
      <div class="photo-hero-icon">📷</div>
      <div class="photo-hero-label">Agregar foto del plato</div>
      <div class="photo-hero-hint">Toca para seleccionar</div>`
  }
  hero.addEventListener('click', () => $('photo-input').click())
  wrap.appendChild(hero)
}

function onPhotoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  photoFile = file
  photoPreviewUrl = URL.createObjectURL(file)
  renderPhotoArea()
}

async function onIngredientInput() {
  const query = $('ing-input-name').value.trim()
  selectedIngredientMatch = null
  clearTimeout(ingredientSearchTimer)
  if (query.length < 2) {
    ingredientSuggestions = []
    renderIngredientSuggestions()
    return
  }

  ingredientSearchTimer = setTimeout(async () => {
    try {
      ingredientSuggestions = await searchIngredient(query)
      renderIngredientSuggestions()
    } catch (err) {
      console.error(err)
      ingredientSuggestions = []
      renderIngredientSuggestions()
      const reason = String(err?.message || '').trim()
      toast(`USDA no disponible: ${reason || 'error desconocido'}`, true)
    }
  }, 260)
}

function renderIngredientSuggestions() {
  const box = $('ing-suggest')
  if (!ingredientSuggestions.length) {
    box.style.display = 'none'
    box.innerHTML = ''
    return
  }
  box.innerHTML = ingredientSuggestions.map((item, idx) => `
    <button type="button" class="ingredient-suggest-item" onclick="pickIngredientSuggestion(${idx})">
      <span class="ingredient-suggest-name">${item.display_name}</span>
      <span class="ingredient-suggest-meta">${Math.round(item.calories_per_100g || 0)} kcal / 100g</span>
    </button>
  `).join('')
  box.style.display = ''
}

window.pickIngredientSuggestion = function (index) {
  const item = ingredientSuggestions[index]
  if (!item) return
  selectedIngredientMatch = item
  $('ing-input-name').value = item.display_name
  $('ing-suggest').style.display = 'none'
  $('ing-input-amount').focus()
}

window.addIng = function () {
  const nameEl = $('ing-input-name')
  const amountEl = $('ing-input-amount')
  const unitEl = $('ing-input-unit')
  const typedName = nameEl.value.trim()
  const amountRaw = String(amountEl.value || '').trim().replace(',', '.')
  const amount = amountRaw ? Number(amountRaw) : 100
  const unit = unitEl.value || 'g'
  let grams = amountToGrams(amount, unit, selectedIngredientMatch?.display_name || typedName)

  if (!Number.isFinite(grams) || grams <= 0) {
    toast('Ingresá una cantidad válida', true)
    amountEl.focus()
    return
  }

  if (selectedIngredientMatch) {
    formIngredients.push({
      name: selectedIngredientMatch.display_name || selectedIngredientMatch.name,
      grams,
      ingredient_id: selectedIngredientMatch.id,
      amount,
      unit,
    })
  } else {
    if (!typedName) {
      toast('Ingresá el nombre del ingrediente', true)
      nameEl.focus()
      return
    }
    formIngredients.push({
      name: typedName,
      grams,
      ingredient_id: null,
      amount,
      unit,
    })
    toast('Ingrediente agregado sin match nutricional')
  }

  nameEl.value = ''
  amountEl.value = ''
  unitEl.value = 'g'
  selectedIngredientMatch = null
  ingredientSuggestions = []
  $('ing-suggest').style.display = 'none'
  nameEl.focus()
  renderIngList()
}

window.addStep = function () {
  const input = $('step-input')
  const text = input.value.trim()
  if (!text) { input.focus(); return }
  formSteps.push(text)
  input.value = ''
  input.focus()
  renderStepList()
  updateStepNextNum()
}

window.onIngKey = function (e) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.target.id === 'ing-input-name') $('ing-input-amount').focus()
    else window.addIng()
  }
}

window.onStepKey = function (e) {
  if (e.key === 'Enter') { e.preventDefault(); window.addStep() }
}

function updateStepNextNum() {
  const el = $('step-next-num')
  if (el) el.textContent = formSteps.length + 1
}

function renderIngList() {
  const el = $('ing-list')
  if (!formIngredients.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:2px 0">Aún no hay ingredientes</div>'
    return
  }
  el.innerHTML = formIngredients.map((ing, i) => `
    <div class="ing-item-form">
      <div class="ing-item-dot"></div>
      <span class="ing-item-name">${ing.name}</span>
      ${formatIngMeasure(ing) ? `<span class="ing-item-qty">${formatIngMeasure(ing)}</span>` : ''}
      <button class="item-del-btn" data-i="${i}" type="button">×</button>
    </div>
  `).join('')
  el.querySelectorAll('.item-del-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      formIngredients.splice(parseInt(btn.dataset.i), 1)
      renderIngList()
    })
  )
}

function renderStepList() {
  const el = $('step-list')
  if (!formSteps.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:2px 0">Aún no hay pasos</div>'
    return
  }
  el.innerHTML = formSteps.map((s, i) => `
    <div class="step-item-form">
      <div class="step-item-badge">${i + 1}</div>
      <span class="step-item-text">${s}</span>
      <button class="item-del-btn" data-i="${i}" type="button">×</button>
    </div>
  `).join('')
  el.querySelectorAll('.item-del-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      formSteps.splice(parseInt(btn.dataset.i), 1)
      renderStepList()
      updateStepNextNum()
    })
  )
}

async function handleSave() {
  const name = $('f-name').value.trim()
  if (!name) { toast('Ingresá el nombre del plato', true); return }

  const btn = $('form-save-btn')
  btn.disabled = true
  btn.textContent = 'Guardando...'

  const recipe = {
    id:          editingId || undefined,
    name,
    cat:         $('f-cat').value,
    emoji:       $('f-emoji').value.trim() || '🍽',
    description: $('f-desc').value.trim(),
    time:        $('f-time').value.trim(),
    difficulty:  $('f-diff').value,
    servings:    parseInt($('f-serv').value) || 4,
    ingredients: formIngredients.map(ing => ({
      name: ing.name,
      grams: round2(ing.grams),
      ingredient_id: ing.ingredient_id || null,
      amount: Number(ing.amount) || null,
      unit: ing.unit || 'g',
    })),
    steps:       formSteps,
    tags:        $('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
    photo_url:   photoPreviewUrl && !photoFile ? photoPreviewUrl : null,
  }

  try {
    const saved = await upsertRecipe(recipe)
    if (photoFile) {
      const url = await uploadPhoto(photoFile, saved.id)
      saved.photo_url = url
      await upsertRecipe({ id: saved.id, photo_url: url })
    }
    const idx = recipes.findIndex(r => r.id === saved.id)
    if (idx >= 0) recipes[idx] = { ...recipes[idx], ...saved }
    else recipes.unshift(saved)

    renderList()
    toast(editingId ? 'Receta actualizada' : 'Receta guardada')
    showView('v-list')
  } catch (err) {
    console.error(err)
    toast('Error al guardar. Revisá la conexión.', true)
  } finally {
    btn.disabled = false
    btn.textContent = 'Guardar'
  }
}

// ─── Services / Calendar ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  pendiente: 'status-pendiente',
  confirmado: 'status-confirmado',
  completado: 'status-completado',
  cancelado: 'status-cancelado',
}

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  completado: 'Completado',
  cancelado: 'Cancelado',
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

async function initCalendar() {
  $('calendar-content').innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>'
  try {
    const [servicesData, clientsData] = await Promise.all([fetchServices(), fetchClients()])
    services = servicesData
    clients = clientsData
  } catch (err) {
    console.error(err)
    toast('Error al cargar servicios', true)
  }
  renderCalendar()
}

function moveMonth(delta) {
  const next = new Date(currentYear, currentMonth + delta, 1)
  currentYear = next.getFullYear()
  currentMonth = next.getMonth()
  selectedServiceDate = toIsoDate(new Date(currentYear, currentMonth, 1))
  renderCalendar()
}

function toggleCalendarMode() {
  calendarListMode = !calendarListMode
  renderCalendar()
}

function renderCalendar() {
  $('cal-month-title').textContent = `${MONTHS_ES[currentMonth]} ${currentYear}`
  $('calendar-toggle-view').textContent = calendarListMode ? 'Mes' : 'Lista'
  $('cal-prev').style.visibility = calendarListMode ? 'hidden' : 'visible'
  $('cal-next').style.visibility = calendarListMode ? 'hidden' : 'visible'
  $('cal-month-title').style.opacity = calendarListMode ? '0.7' : '1'
  $('calendar-content').innerHTML = calendarListMode ? buildCalendarListView() : buildCalendarMonthView()
  bindCalendarDynamicEvents()
}

function buildCalendarMonthView() {
  const firstDay = new Date(currentYear, currentMonth, 1)
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7
  const servicesByDate = groupServicesByDate(services)

  const dayCells = []
  for (let i = 0; i < totalCells; i += 1) {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > daysInMonth) {
      dayCells.push('<button class="cal-day-cell is-empty" type="button" disabled></button>')
      continue
    }

    const date = toIsoDate(new Date(currentYear, currentMonth, dayNum))
    const dayServices = servicesByDate.get(date) || []
    const dotHtml = buildServiceDots(dayServices)
    const isSelected = date === selectedServiceDate
    dayCells.push(`
      <button class="cal-day-cell${isSelected ? ' is-selected' : ''}" type="button" data-date="${date}">
        <span class="cal-day-num">${dayNum}</span>
        <span class="cal-day-dots">${dotHtml}</span>
      </button>
    `)
  }

  const selectedServices = (servicesByDate.get(selectedServiceDate) || []).slice()
  selectedServices.sort(sortByDateAndTime)

  return `
    <div class="calendar-grid-wrap">
      <div class="calendar-weekdays">
        <span>Lu</span><span>Ma</span><span>Mi</span><span>Ju</span><span>Vi</span><span>Sá</span><span>Do</span>
      </div>
      <div class="calendar-grid">${dayCells.join('')}</div>
    </div>
    <div class="calendar-day-services" id="calendar-day-services">
      ${renderServiceCards(selectedServices, 'No hay servicios para este día')}
    </div>
  `
}

function buildCalendarListView() {
  const todayIso = toIsoDate(new Date())
  const upcoming = services.filter(s => s.date >= todayIso).slice().sort(sortByDateAndTime)
  return `
    <div class="calendar-day-services">
      ${renderServiceCards(upcoming, 'No hay servicios próximos')}
    </div>
  `
}

function bindCalendarDynamicEvents() {
  document.querySelectorAll('.cal-day-cell[data-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedServiceDate = btn.dataset.date
      renderCalendar()
    })
  })

  document.querySelectorAll('.service-card[data-id]').forEach(card => {
    card.addEventListener('click', () => {
      const service = services.find(s => String(s.id) === card.dataset.id)
      if (service) openServiceForm(service)
    })
  })
}

function renderServiceCards(list, emptyText) {
  if (!list.length) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📅</div>
        <div class="empty-state-text">${emptyText}</div>
      </div>
    `
  }

  return list.map(service => {
    const client = clients.find(c => c.id === service.client_id)
    const clientName = client?.name || 'Sin cliente'
    const timeLabel = formatTimeRange(service.time_start, service.time_end)
    const statusClass = STATUS_COLORS[service.status] || STATUS_COLORS.pendiente
    const datePrefix = calendarListMode ? `<div class="service-card-date">${formatDateFriendly(service.date)}</div>` : ''
    const price = service.price != null && service.price !== '' ? `<span class="service-price">$${service.price}</span>` : ''
    return `
      <div class="service-card" data-id="${service.id}">
        ${datePrefix}
        <div class="service-card-row">
          <div class="service-client">${clientName}</div>
          <span class="service-status-badge ${statusClass}">${STATUS_LABELS[service.status] || 'Pendiente'}</span>
        </div>
        <div class="service-card-row service-card-meta">
          <span>${timeLabel}</span>
          ${price}
        </div>
      </div>
    `
  }).join('')
}

function openServiceForm(service = null) {
  serviceEditingId = service?.id || null
  selectedServiceStatus = service?.status || 'pendiente'

  const selectedClientId = service?.client_id ?? null
  if (!clients.length) {
    $('sf-client').innerHTML = '<option value="">Cargando clientes...</option>'
    initClientsForSelect(selectedClientId)
  } else {
    renderServiceClientOptions(selectedClientId)
  }

  const defaultDate = selectedServiceDate || toIsoDate(new Date())
  $('sf-title').textContent = service ? 'Editar servicio' : 'Nuevo servicio'
  $('sf-date').value = service?.date || defaultDate
  $('sf-time-start').value = service?.time_start || ''
  $('sf-time-end').value = service?.time_end || ''
  $('sf-location').value = service?.location || ''
  $('sf-menu-notes').value = service?.menu_notes || ''
  $('sf-price').value = service?.price ?? ''
  $('sf-notes').value = service?.notes || ''
  $('sf-delete-section').style.display = service ? '' : 'none'
  setStatusPillActive(selectedServiceStatus)
  showView('v-service-form')
}

async function initClientsForSelect(selectedId = null) {
  try {
    clients = await fetchClients()
    renderServiceClientOptions(selectedId)
  } catch (err) {
    console.error(err)
    toast('Error al cargar clientes', true)
  }
}

function renderServiceClientOptions(selectedId = null) {
  const select = $('sf-client')
  const options = ['<option value="">Sin cliente</option>']
  clients
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(client => {
      const isSelected = selectedId != null && String(selectedId) === String(client.id)
      options.push(`<option value="${client.id}"${isSelected ? ' selected' : ''}>${client.name}</option>`)
    })
  select.innerHTML = options.join('')
}

function handleStatusPillClick(e) {
  const btn = e.target.closest('.status-pill[data-status]')
  if (!btn) return
  selectedServiceStatus = btn.dataset.status
  setStatusPillActive(selectedServiceStatus)
}

function setStatusPillActive(status) {
  document.querySelectorAll('.status-pill[data-status]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.status === status)
  })
}

async function handleServiceSave() {
  const date = $('sf-date').value
  if (!date) {
    toast('Seleccioná una fecha', true)
    return
  }

  const btn = $('sf-save-btn')
  btn.disabled = true
  btn.textContent = 'Guardando...'

  const clientValue = $('sf-client').value
  const service = {
    id: serviceEditingId || undefined,
    client_id: clientValue ? parseInt(clientValue, 10) : null,
    date,
    time_start: $('sf-time-start').value || null,
    time_end: $('sf-time-end').value || null,
    location: $('sf-location').value.trim() || null,
    menu_notes: $('sf-menu-notes').value.trim() || null,
    status: selectedServiceStatus,
    price: $('sf-price').value ? Number($('sf-price').value) : null,
    notes: $('sf-notes').value.trim() || null,
  }

  try {
    const saved = await upsertService(service)
    const idx = services.findIndex(s => s.id === saved.id)
    if (idx >= 0) services[idx] = { ...services[idx], ...saved }
    else services.push(saved)

    selectedServiceDate = saved.date
    renderCalendar()
    toast(serviceEditingId ? 'Servicio actualizado' : 'Servicio guardado')
    showView('v-calendar')
  } catch (err) {
    console.error(err)
    toast('Error al guardar servicio', true)
  } finally {
    btn.disabled = false
    btn.textContent = 'Guardar'
  }
}

async function handleServiceDelete() {
  const service = services.find(s => s.id === serviceEditingId)
  if (!service || !confirm('¿Eliminar este servicio?')) return
  try {
    await deleteService(serviceEditingId)
    services = services.filter(s => s.id !== serviceEditingId)
    renderCalendar()
    toast('Servicio eliminado')
    showView('v-calendar')
  } catch (err) {
    console.error(err)
    toast('Error al eliminar servicio', true)
  }
}

function buildServiceDots(dayServices) {
  if (!dayServices.length) return ''
  return dayServices
    .slice(0, 4)
    .map(s => `<span class="service-dot ${STATUS_COLORS[s.status] || STATUS_COLORS.pendiente}"></span>`)
    .join('')
}

function groupServicesByDate(list) {
  const map = new Map()
  list.forEach(service => {
    if (!map.has(service.date)) map.set(service.date, [])
    map.get(service.date).push(service)
  })
  return map
}

function sortByDateAndTime(a, b) {
  if (a.date !== b.date) return a.date.localeCompare(b.date)
  const aTime = a.time_start || '23:59:59'
  const bTime = b.time_start || '23:59:59'
  return aTime.localeCompare(bTime)
}

function formatTimeRange(start, end) {
  if (start && end) return `${start.slice(0, 5)} - ${end.slice(0, 5)}`
  if (start) return `${start.slice(0, 5)}`
  return 'Hora a confirmar'
}

function formatDateFriendly(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day}/${month}/${year}`
}

function toIsoDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Shopping List ────────────────────────────────────────────────────────────
async function initShopping() {
  if (!recipes.length) {
    try {
      recipes = await fetchRecipes()
    } catch (err) {
      console.error(err)
      toast('Error al cargar recetas', true)
    }
  }
  if (!ingredientsCatalog.length) {
    try {
      ingredientsCatalog = await fetchIngredientsCatalog()
    } catch (err) {
      console.error(err)
      toast('No se pudo cargar catálogo de precios', true)
    }
  }
  renderShopping()
}

function setShoppingMode(mode) {
  shoppingMode = mode
  if (shoppingMode === 'manual') shoppingResults = shoppingManualItems
  renderShopping()
}

function addCurrentRecipeToShopping() {
  if (!curRecipe) return
  shoppingMode = 'recipes'
  shoppingSelectedRecipes.set(curRecipe.id, curServ || curRecipe.servings || 1)
  showView('v-shopping')
  initShopping()
}

function renderShopping() {
  $('shopping-mode-recipes').classList.toggle('active', shoppingMode === 'recipes')
  $('shopping-mode-manual').classList.toggle('active', shoppingMode === 'manual')

  const controls = shoppingMode === 'recipes' ? renderShoppingFromRecipesControls() : renderShoppingManualControls()
  const results = renderShoppingResults()
  $('shopping-content').innerHTML = `${controls}${results}`
}

function renderShoppingFromRecipesControls() {
  if (!recipes.length) {
    return `
      <div class="shopping-card">
        <div class="empty-state">
          <div class="empty-state-icon">🍽</div>
          <div class="empty-state-text">No hay recetas para seleccionar.</div>
        </div>
      </div>
    `
  }

  const chips = recipes.map(r => {
    const active = shoppingSelectedRecipes.has(r.id)
    return `
      <button type="button" class="shopping-recipe-chip${active ? ' active' : ''}" onclick="toggleShoppingRecipe(${r.id})">
        <span>${r.emoji || '🍽'}</span>
        <span>${r.name}</span>
      </button>
    `
  }).join('')

  const selectedRows = Array.from(shoppingSelectedRecipes.entries()).map(([id, servings]) => {
    const recipe = recipes.find(r => r.id === id)
    if (!recipe) return ''
    return `
      <div class="shopping-recipe-row">
        <span class="shopping-recipe-row-name">${recipe.name}</span>
        <input type="number" min="1" class="shopping-servings-input"
          value="${servings}"
          onchange="changeShoppingRecipeServings(${id}, this.value)">
      </div>
    `
  }).join('')

  return `
    <div class="shopping-card">
      <div class="fsec-title">Seleccionar recetas</div>
      <div class="shopping-chip-wrap">${chips}</div>
      <div class="shopping-recipe-config">${selectedRows || '<div class="field-hint">Seleccioná una o más recetas.</div>'}</div>
      <button class="btn-primary btn-full" type="button" onclick="generateShoppingList()">Generar lista</button>
    </div>
  `
}

function renderShoppingManualControls() {
  const manualRows = shoppingManualItems.map(item => `
    <div class="shopping-manual-row">
      <label class="shopping-check">
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleShoppingItem(${item.id})">
      </label>
      <div class="shopping-manual-main">
        <div class="shopping-manual-name${item.checked ? ' done' : ''}">${item.name}</div>
        <div class="shopping-manual-qty">${formatItemQty(item)}</div>
      </div>
      <button class="item-del-btn" type="button" onclick="removeManualShoppingItem(${item.id})">×</button>
    </div>
  `).join('')

  return `
    <div class="shopping-card">
      <div class="fsec-title">Agregar ítem manual</div>
      <div class="shopping-manual-add">
        <input id="sm-name" type="text" placeholder="Ingrediente">
        <input id="sm-qty" type="number" placeholder="Cant." min="0" step="any">
        <input id="sm-unit" type="text" placeholder="Unidad">
        <button class="ing-add-btn" type="button" onclick="addManualShoppingItem()">+</button>
      </div>
      <div class="shopping-manual-list">
        ${manualRows || '<div class="field-hint">Todavía no agregaste ítems.</div>'}
      </div>
    </div>
  `
}

function renderShoppingResults() {
  const list = shoppingMode === 'manual' ? shoppingManualItems : shoppingResults
  if (!list.length) {
    return `
      <div class="shopping-card">
        <div class="empty-state">
          <div class="empty-state-icon">🧺</div>
          <div class="empty-state-text">Generá una lista para ver los ítems agrupados.</div>
        </div>
      </div>
    `
  }

  const grouped = new Map()
  list.forEach(item => {
    const cat = item.category || classifyIngredient(item.name)
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat).push(item)
  })

  let totalKnown = 0
  let withoutPrice = 0
  list.forEach(item => {
    if (item.hasPrice && item.estimatedCost != null) totalKnown += Number(item.estimatedCost)
    else withoutPrice += 1
  })

  const categoryHtml = Array.from(grouped.entries()).map(([category, items]) => {
    const catKey = toCategoryKey(category)
    const collapsed = shoppingCollapsedCategories.has(catKey)
    const rows = items.map(item => `
      <div class="shopping-item-row">
        <label class="shopping-check">
          <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleShoppingItem(${item.id})">
        </label>
        <div class="shopping-item-main">
          <div class="shopping-item-name${item.checked ? ' done' : ''}">${item.name}</div>
          <div class="shopping-item-qty">${formatItemQty(item)}</div>
        </div>
        <div class="shopping-item-price">${item.hasPrice && item.estimatedCost != null ? `$${formatMoney(item.estimatedCost)}` : '—'}</div>
      </div>
    `).join('')
    return `
      <div class="shopping-category">
        <button class="shopping-category-head" type="button" onclick="toggleShoppingCategory('${catKey}')">
          <span>${category}</span>
          <span>${collapsed ? '+' : '−'}</span>
        </button>
        <div class="shopping-category-body${collapsed ? ' collapsed' : ''}">
          ${rows}
        </div>
      </div>
    `
  }).join('')

  return `
    <div class="shopping-card">
      <div class="fsec-title">Resultado</div>
      <div class="shopping-categories">${categoryHtml}</div>
      <div class="shopping-footer">
        <div class="shopping-total">Total estimado: $${formatMoney(totalKnown)}</div>
        <div class="shopping-missing">${withoutPrice} ítems sin precio estimado</div>
      </div>
      <div class="shopping-actions">
        <button class="btn-primary" type="button" onclick="shareShoppingList()">Compartir lista</button>
        <button class="shopping-clear-btn" type="button" onclick="clearShoppingList()">Nueva lista</button>
      </div>
    </div>
  `
}

function handleShoppingContentClick(e) {
  if (e.target.id === 'sm-name' || e.target.id === 'sm-qty' || e.target.id === 'sm-unit') return
}

function toCategoryKey(category) {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function formatMoney(value) {
  return (Math.round(Number(value || 0) * 100) / 100).toFixed(2)
}

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100
}

function formatItemQty(item) {
  return [item.totalQty, item.unit].filter(Boolean).join(' ').trim() || 'Cantidad a definir'
}

function getCatalogPriceInfo(name, unit) {
  const key = String(name || '').trim().toLowerCase()
  const candidates = ingredientsCatalog.filter(x => String(x.name || '').trim().toLowerCase() === key)
  if (!candidates.length) return { hasPrice: false, estimatedCost: null }
  const normalizedUnit = String(unit || '').trim().toLowerCase()
  const exact = candidates.find(x => String(x.unit || '').trim().toLowerCase() === normalizedUnit)
  const fallback = exact || candidates.find(x => !x.unit)
  if (!fallback || fallback.price == null) return { hasPrice: false, estimatedCost: null }
  return { hasPrice: true, price: Number(fallback.price) }
}

function generateShoppingFromRecipes() {
  const selected = Array.from(shoppingSelectedRecipes.entries())
    .map(([id, servings]) => ({ recipe: recipes.find(r => r.id === id), servings }))
    .filter(x => x.recipe)
  if (!selected.length) {
    toast('Seleccioná al menos una receta', true)
    return
  }
  const aggregated = aggregateIngredients(selected, ingredientsCatalog)
  shoppingResults = aggregated.map(item => ({
    id: shoppingIdCounter++,
    ...item,
    checked: false,
    category: classifyIngredient(item.name),
  }))
  renderShopping()
}

function addManualItem() {
  const name = $('sm-name')?.value.trim()
  const qty = $('sm-qty')?.value.trim()
  const unit = $('sm-unit')?.value.trim()
  if (!name) {
    toast('Ingresá el nombre del ítem', true)
    return
  }

  const qtyNum = qty ? Number(qty) : null
  const priceInfo = getCatalogPriceInfo(name, unit)
  const estimatedCost = priceInfo.hasPrice && qtyNum != null ? qtyNum * priceInfo.price : null
  const item = {
    id: shoppingIdCounter++,
    name,
    totalQty: qty || '',
    unit: unit || '',
    hasPrice: priceInfo.hasPrice,
    estimatedCost: estimatedCost != null ? Math.round(estimatedCost * 100) / 100 : null,
    checked: false,
    category: classifyIngredient(name),
  }
  shoppingManualItems.push(item)
  shoppingResults = shoppingManualItems
  $('sm-name').value = ''
  $('sm-qty').value = ''
  $('sm-unit').value = ''
  renderShopping()
}

function toggleRecipeSelection(recipeId) {
  if (shoppingSelectedRecipes.has(recipeId)) shoppingSelectedRecipes.delete(recipeId)
  else {
    const recipe = recipes.find(r => r.id === recipeId)
    shoppingSelectedRecipes.set(recipeId, recipe?.servings || 1)
  }
  renderShopping()
}

function setRecipeServings(recipeId, value) {
  const servings = Math.max(1, parseInt(value, 10) || 1)
  shoppingSelectedRecipes.set(recipeId, servings)
}

function toggleShoppingItemById(itemId) {
  const targetList = shoppingMode === 'manual' ? shoppingManualItems : shoppingResults
  const item = targetList.find(x => x.id === itemId)
  if (!item) return
  item.checked = !item.checked
  renderShopping()
}

function removeManualItem(itemId) {
  shoppingManualItems = shoppingManualItems.filter(x => x.id !== itemId)
  shoppingResults = shoppingManualItems
  renderShopping()
}

function toggleCategory(categoryKey) {
  if (shoppingCollapsedCategories.has(categoryKey)) shoppingCollapsedCategories.delete(categoryKey)
  else shoppingCollapsedCategories.add(categoryKey)
  renderShopping()
}

async function shareShopping() {
  const list = shoppingMode === 'manual' ? shoppingManualItems : shoppingResults
  if (!list.length) {
    toast('No hay ítems para compartir', true)
    return
  }
  const grouped = new Map()
  list.forEach(item => {
    const category = item.category || classifyIngredient(item.name)
    if (!grouped.has(category)) grouped.set(category, [])
    grouped.get(category).push(item)
  })
  let text = 'Lista de Compras\n\n'
  Array.from(grouped.entries()).forEach(([category, items]) => {
    text += `${category}\n`
    items.forEach(item => {
      const mark = item.checked ? '[x]' : '[ ]'
      text += `${mark} ${item.name} - ${formatItemQty(item)}\n`
    })
    text += '\n'
  })

  try {
    if (navigator.share) {
      await navigator.share({ title: 'Lista de compras', text })
      return
    }
    await navigator.clipboard.writeText(text)
    toast('Lista copiada al portapapeles')
  } catch (err) {
    console.error(err)
    toast('No se pudo compartir la lista', true)
  }
}

function clearShoppingState() {
  shoppingSelectedRecipes = new Map()
  shoppingManualItems = []
  shoppingResults = []
  shoppingCollapsedCategories = new Set()
  shoppingMode = 'recipes'
  renderShopping()
}

window.toggleShoppingRecipe = function (id) {
  toggleRecipeSelection(Number(id))
}

window.changeShoppingRecipeServings = function (id, value) {
  setRecipeServings(Number(id), value)
}

window.generateShoppingList = function () {
  generateShoppingFromRecipes()
}

window.addManualShoppingItem = function () {
  addManualItem()
}

window.toggleShoppingItem = function (id) {
  toggleShoppingItemById(Number(id))
}

window.removeManualShoppingItem = function (id) {
  removeManualItem(Number(id))
}

window.toggleShoppingCategory = function (categoryKey) {
  toggleCategory(categoryKey)
}

window.shareShoppingList = function () {
  shareShopping()
}

window.clearShoppingList = function () {
  clearShoppingState()
}

window.addCurrentRecipeToShopping = function () {
  addCurrentRecipeToShopping()
}

// ─── Clients List ─────────────────────────────────────────────────────────────
async function initClients() {
  $('clist').innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>'
  try {
    clients = await fetchClients()
  } catch {
    toast('Error al cargar clientes', true)
  }
  renderClientList()
}

function clientInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function renderClientList() {
  const q = $('client-search').value.toLowerCase().trim()
  const list = q ? clients.filter(c => c.name.toLowerCase().includes(q)) : clients

  const wrap = $('clist')
  if (!list.length) {
    wrap.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <div class="empty-state-text">Sin clientes todavía.<br>Usá el botón + para agregar el primero.</div>
      </div>`
    return
  }

  wrap.innerHTML = list.map(c => {
    const allergies = c.allergies || []
    const shown = allergies.slice(0, 3).map(a => `<span class="tag">${a}</span>`).join('')
    const extra = allergies.length > 3 ? `<span class="tag tag-more">+${allergies.length - 3}</span>` : ''
    return `
      <div class="client-card" data-id="${c.id}">
        <div class="client-avatar">${clientInitials(c.name)}</div>
        <div class="client-info">
          <div class="client-name">${c.name}</div>
          ${c.phone ? `<div class="client-sub">${c.phone}</div>` : (c.email ? `<div class="client-sub">${c.email}</div>` : '')}
          ${allergies.length ? `<div class="client-tags">${shown}${extra}</div>` : ''}
        </div>
        <div class="client-chevron">›</div>
      </div>`
  }).join('')

  wrap.querySelectorAll('.client-card').forEach(card => {
    card.addEventListener('click', () => {
      const c = clients.find(x => String(x.id) === card.dataset.id)
      if (c) openClientForm(c)
    })
  })
}

// ─── Client Form ──────────────────────────────────────────────────────────────
function openClientForm(client = null) {
  clientEditingId = client?.id || null
  formAllergies = [...(client?.allergies || [])]

  $('cf-title').textContent = client ? 'Editar cliente' : 'Nuevo cliente'
  $('cf-name').value        = client?.name || ''
  $('cf-phone').value       = client?.phone || ''
  $('cf-email').value       = client?.email || ''
  $('cf-preferences').value = client?.preferences || ''
  $('cf-notes').value       = client?.notes || ''

  $('cf-delete-section').style.display = client ? '' : 'none'

  showView('v-client-form')
  renderAllergyList()
}

window.addAllergy = function () {
  const input = $('allergy-input')
  const val = input.value.trim()
  if (!val) { input.focus(); return }
  // allow comma-separated entries
  val.split(',').map(v => v.trim()).filter(Boolean).forEach(a => formAllergies.push(a))
  input.value = ''
  input.focus()
  renderAllergyList()
}

window.onAllergyKey = function (e) {
  if (e.key === 'Enter') { e.preventDefault(); window.addAllergy() }
}

function renderAllergyList() {
  const el = $('allergy-list')
  if (!formAllergies.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-3);padding:2px 0">Sin alergias registradas</div>'
    return
  }
  el.innerHTML = formAllergies.map((a, i) => `
    <div class="allergy-chip-row">
      <span class="allergy-chip">${a}</span>
      <button class="item-del-btn" data-i="${i}" type="button">×</button>
    </div>
  `).join('')
  el.querySelectorAll('.item-del-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      formAllergies.splice(parseInt(btn.dataset.i), 1)
      renderAllergyList()
    })
  )
}

async function handleClientSave() {
  const name = $('cf-name').value.trim()
  if (!name) { toast('Ingresá el nombre del cliente', true); return }

  const btn = $('cf-save-btn')
  btn.disabled = true
  btn.textContent = 'Guardando...'

  const client = {
    id:          clientEditingId || undefined,
    name,
    phone:       $('cf-phone').value.trim() || null,
    email:       $('cf-email').value.trim() || null,
    allergies:   formAllergies,
    preferences: $('cf-preferences').value.trim() || null,
    notes:       $('cf-notes').value.trim() || null,
  }

  try {
    const saved = await upsertClient(client)
    const idx = clients.findIndex(c => c.id === saved.id)
    if (idx >= 0) clients[idx] = { ...clients[idx], ...saved }
    else clients.push(saved)

    renderClientList()
    toast(clientEditingId ? 'Cliente actualizado' : 'Cliente guardado')
    showView('v-clients')
  } catch (err) {
    console.error(err)
    toast('Error al guardar. Revisá la conexión.', true)
  } finally {
    btn.disabled = false
    btn.textContent = 'Guardar'
  }
}

async function handleClientDelete() {
  const client = clients.find(c => c.id === clientEditingId)
  if (!client || !confirm(`¿Eliminar a "${client.name}"?`)) return
  try {
    await deleteClient(clientEditingId)
    clients = clients.filter(c => c.id !== clientEditingId)
    renderClientList()
    toast('Cliente eliminado')
    showView('v-clients')
  } catch {
    toast('Error al eliminar', true)
  }
}
