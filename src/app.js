import { fetchRecipes, upsertRecipe, deleteRecipe, uploadPhoto } from './db.js'
import { logout } from './auth.js'

// ─── State ────────────────────────────────────────────────────────────────────
let recipes = []
let activeCat = 'Todas'
let curRecipe = null
let curServ = 4
let editingId = null
let photoFile = null
let photoPreviewUrl = null
let formIngredients = []
let formSteps = []
let appInitialized = false

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
  $('search').addEventListener('input', renderList)
  $('fab-add').addEventListener('click', () => openForm())
  $('serv-dec').addEventListener('click', () => changeServ(-1))
  $('serv-inc').addEventListener('click', () => changeServ(1))
  $('btn-delete').addEventListener('click', handleDelete)
  $('form-cancel').addEventListener('click', () => showView('v-list'))
  $('form-save-btn').addEventListener('click', handleSave)
  $('photo-input').addEventListener('change', onPhotoChange)
}

window.handleLogout = async function () {
  await logout()
}

// ─── List ─────────────────────────────────────────────────────────────────────
async function initList() {
  $('rlist').innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>'
  try {
    recipes = await fetchRecipes()
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
      ${r.photo_url
        ? `<div style="position:relative">
             <img class="recipe-card-photo" src="${r.photo_url}" alt="${r.name}" loading="lazy">
             ${r.time ? `<div class="time-chip">⏱ ${r.time}</div>` : ''}
           </div>`
        : `<div class="recipe-card-placeholder">
             ${r.emoji || '🍽'}
             ${r.time ? `<div class="time-chip">⏱ ${r.time}</div>` : ''}
           </div>`}
      <div class="recipe-card-body">
        <div class="recipe-card-name">${r.name}</div>
        ${r.description ? `<div class="recipe-card-desc">${r.description}</div>` : ''}
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
  curServ = r.servings || 4

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

  $('d-steps').innerHTML = (r.steps || [])
    .map((s, i) => `
      <div class="step-row">
        <div class="step-num">${i + 1}</div>
        <div class="step-text">${s}</div>
      </div>`)
    .join('')

  showView('v-detail')
}

function renderDetailIngs() {
  $('d-ings').innerHTML = (curRecipe.ingredients || [])
    .map(ing => `
      <div class="ing-item">
        <div class="ing-dot"></div>
        <div class="ing-name">${ing.name || ing}</div>
        <div class="ing-qty">${ing.qty || ''}</div>
      </div>`)
    .join('')
}

function changeServ(d) {
  curServ = Math.max(1, curServ + d)
  $('d-serv').textContent = curServ
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

// ─── Form ─────────────────────────────────────────────────────────────────────
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

  renderPhotoArea()
  showView('v-form')
  renderIngList()
  renderStepList()
  updateStepNextNum()
}

function renderPhotoArea() {
  const wrap = $('photo-wrap')
  if (photoPreviewUrl) {
    wrap.innerHTML = `<img class="photo-preview" src="${photoPreviewUrl}" alt="preview">`
    const btn = document.createElement('button')
    btn.className = 'photo-change-btn'
    btn.type = 'button'
    btn.textContent = '📷 Cambiar foto'
    btn.addEventListener('click', () => $('photo-input').click())
    wrap.appendChild(btn)
  } else {
    const zone = document.createElement('div')
    zone.className = 'photo-zone'
    zone.innerHTML = `
      <div class="photo-zone-icon">📷</div>
      <div class="photo-zone-label">Agregar foto del plato</div>`
    zone.addEventListener('click', () => $('photo-input').click())
    wrap.innerHTML = ''
    wrap.appendChild(zone)
  }
}

function onPhotoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  photoFile = file
  photoPreviewUrl = URL.createObjectURL(file)
  renderPhotoArea()
}

// ─── Form list helpers (expuestas globalmente para los onclick del HTML) ───────
window.addIng = function () {
  const nameEl = $('ing-input-name')
  const qtyEl  = $('ing-input-qty')
  const name = nameEl.value.trim()
  if (!name) { nameEl.focus(); return }
  formIngredients.push({ name, qty: qtyEl.value.trim() })
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

// ─── Save ─────────────────────────────────────────────────────────────────────
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
