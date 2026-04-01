import { fetchRecipes, upsertRecipe, deleteRecipe, uploadPhoto } from './db.js'
import { fetchClients, upsertClient, deleteClient } from './clients.js'
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
let selectedUnit = 'g'
let appInitialized = false

// Clients state
let clients = []
let clientEditingId = null
let formAllergies = []

const CATS = ['Todas', 'Entrada', 'Principal', 'Postre', 'Sopa', 'Otro']

const $ = id => document.getElementById(id)

const showView = id => {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  $(id).classList.add('active')
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
  $('form-cancel').addEventListener('click', () => showView('v-list'))
  $('form-save-btn').addEventListener('click', handleSave)
  $('photo-input').addEventListener('change', onPhotoChange)
  document.querySelectorAll('.unit-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.unit-pill').forEach(p => p.classList.remove('active'))
      pill.classList.add('active')
      selectedUnit = pill.dataset.unit
    })
  })

  // Clients
  $('client-search').addEventListener('input', renderClientList)
  $('fab-add-client').addEventListener('click', () => openClientForm())
  $('cf-cancel').addEventListener('click', () => showView('v-clients'))
  $('cf-save-btn').addEventListener('click', handleClientSave)
  $('cf-delete-btn').addEventListener('click', handleClientDelete)
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

  $('d-steps').innerHTML = (r.steps || [])
    .map((s, i) => `
      <div class="step-row">
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${s}</div>
      </div>`)
    .join('')

  showView('v-detail')
}

function scaleQty(qty, factor) {
  if (!qty || factor === 1) return qty
  const m = qty.match(/^(\d+\.?\d*)(.*)$/)
  if (!m) return qty
  const scaled = Math.round(parseFloat(m[1]) * factor * 100) / 100
  const fmt = scaled % 1 === 0 ? String(scaled) : scaled.toFixed(2).replace(/\.?0+$/, '')
  return fmt + m[2]
}

function renderDetailIngs() {
  const factor = curServ / baseServ
  $('d-ings').innerHTML = (curRecipe.ingredients || [])
    .map(ing => `
      <div class="ing-item">
        <div class="ing-dot"></div>
        <div class="ing-name">${ing.name || ing}</div>
        <div class="ing-qty">${scaleQty(ing.qty || '', factor)}</div>
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

function changeServ(d) {
  curServ = Math.max(1, curServ + d)
  $('d-serv').textContent = curServ
  renderDetailIngs()
  updateBatchInfo()
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

  $('form-title').textContent = recipe ? 'Editar receta' : 'Nueva receta'
  $('f-name').value  = recipe?.name || ''
  $('f-cat').value   = recipe?.cat  || 'Principal'
  $('f-emoji').value = recipe?.emoji || ''
  $('f-desc').value  = recipe?.description || ''
  $('f-time').value  = recipe?.time || ''
  $('f-diff').value  = recipe?.difficulty || 'Media'
  $('f-serv').value  = recipe?.servings || 4
  $('f-tags').value  = (recipe?.tags || []).join(', ')

  formIngredients = (recipe?.ingredients || []).map(i => ({ name: i.name || i, qty: i.qty || '' }))
  formSteps = [...(recipe?.steps || [])]

  selectedUnit = 'g'
  document.querySelectorAll('.unit-pill').forEach(p =>
    p.classList.toggle('active', p.dataset.unit === 'g')
  )

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

window.addIng = function () {
  const nameEl = $('ing-input-name')
  const qtyEl  = $('ing-input-qty')
  const name = nameEl.value.trim()
  if (!name) { nameEl.focus(); return }
  const num = qtyEl.value.trim()
  const qty = num ? (selectedUnit ? `${num} ${selectedUnit}` : num) : ''
  formIngredients.push({ name, qty })
  nameEl.value = ''
  qtyEl.value = ''
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
    if (e.target.id === 'ing-input-name') $('ing-input-qty').focus()
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
      ${ing.qty ? `<span class="ing-item-qty">${ing.qty}</span>` : ''}
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
    ingredients: formIngredients,
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
