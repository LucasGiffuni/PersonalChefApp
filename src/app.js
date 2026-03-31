import { fetchRecipes, upsertRecipe, deleteRecipe, uploadPhoto } from './db.js'
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

const CATS = ['Todas', 'Entrada', 'Principal', 'Postre', 'Sopa', 'Otro']

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id)
const showView = id => {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  $(id).classList.add('active')
}

let toastTimer
function toast(msg, isError = false) {
  const t = $('toast')
  t.textContent = msg
  t.style.background = isError ? '#c0392b' : '#222'
  t.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800)
}

// ─── App shell ────────────────────────────────────────────────────────────────
export function renderApp(userEmail) {
  document.getElementById('app').innerHTML = `

    <!-- LIST -->
    <div class="view active" id="v-list">
      <div class="topbar">
        <div class="topbar-row">
          <div>
            <div class="topbar-label">Tu recetario</div>
            <div class="topbar-title">Chef Personal</div>
          </div>
          <button class="icon-btn" onclick="handleLogout()" title="Cerrar sesión">⎋</button>
        </div>
        <div class="search-wrap">
          <div class="search-box">
            <span class="search-icon">⌕</span>
            <input id="search" type="search" placeholder="Buscar receta...">
          </div>
        </div>
      </div>
      <div class="cats" id="cat-wrap"></div>
      <div class="recipe-list" id="rlist">
        <div class="loading-wrap"><div class="spinner"></div></div>
      </div>
      <button class="fab" id="fab-add" title="Nueva receta">+</button>
    </div>

    <!-- DETAIL -->
    <div class="view" id="v-detail">
      <div class="detail-hero" id="d-hero"></div>
      <div class="detail-scroll">
        <div class="detail-head">
          <div class="detail-title" id="d-title"></div>
          <div class="detail-desc"  id="d-desc"></div>
          <div class="meta-row"     id="d-meta"></div>
        </div>
        <div class="section">
          <div class="section-label">Porciones</div>
          <div class="serv-row">
            <button class="serv-btn" id="serv-dec">−</button>
            <span class="serv-val" id="d-serv">4</span>
            <button class="serv-btn" id="serv-inc">+</button>
            <span class="serv-lbl">personas</span>
          </div>
          <div class="section-label" style="margin-top:14px">Ingredientes</div>
          <div class="ings-grid" id="d-ings"></div>
        </div>
        <div class="section">
          <div class="section-label">Preparación</div>
          <div class="steps" id="d-steps"></div>
        </div>
        <div class="section last" style="display:flex;justify-content:center">
          <button id="btn-delete" class="danger-btn">Eliminar receta</button>
        </div>
      </div>
    </div>

    <!-- FORM -->
    <div class="view" id="v-form">
      <div class="form-header">
        <span class="form-cancel" id="form-cancel">Cancelar</span>
        <span class="form-title-h" id="form-title-h">Nueva receta</span>
        <button class="form-save" id="form-save-btn">Guardar</button>
      </div>
      <div class="form-body">
        <div class="field">
          <label>Foto del plato</label>
          <div id="photo-wrap"></div>
          <input type="file" id="photo-input" accept="image/*" style="display:none">
        </div>
        <div class="field">
          <label>Nombre del plato</label>
          <input id="f-name" type="text" placeholder="Ej: Risotto de hongos">
        </div>
        <div class="field">
          <label>Emoji (si no hay foto)</label>
          <input id="f-emoji" type="text" placeholder="🍝" maxlength="2">
        </div>
        <div class="field">
          <label>Categoría</label>
          <select id="f-cat">
            <option value="Entrada">Entrada</option>
            <option value="Principal" selected>Principal</option>
            <option value="Postre">Postre</option>
            <option value="Sopa">Sopa</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div class="field">
          <label>Descripción breve</label>
          <textarea id="f-desc" placeholder="Una línea que resume el plato..."></textarea>
        </div>
        <div class="field">
          <label>Tiempo total</label>
          <input id="f-time" type="text" placeholder="Ej: 35 min">
        </div>
        <div class="field">
          <label>Dificultad</label>
          <select id="f-diff">
            <option>Fácil</option>
            <option selected>Media</option>
            <option>Alta</option>
          </select>
        </div>
        <div class="field">
          <label>Porciones base</label>
          <input id="f-serv" type="number" min="1" max="20" value="4">
        </div>
        <div class="field">
          <label>Ingredientes</label>
          <div class="list-input-row">
            <input id="f-ing-name" type="text" placeholder="Nombre del ingrediente">
            <input id="f-ing-qty" type="text" placeholder="Cantidad">
            <button class="list-add-btn" id="btn-add-ing" type="button">+</button>
          </div>
          <div id="ing-list" class="form-list"></div>
        </div>
        <div class="field">
          <label>Pasos de preparación</label>
          <div class="list-input-row">
            <input id="f-step-text" type="text" placeholder="Describe el paso...">
            <button class="list-add-btn" id="btn-add-step" type="button">+</button>
          </div>
          <div id="step-list" class="form-list"></div>
        </div>
        <div class="field">
          <label>Etiquetas</label>
          <input id="f-tags" type="text" placeholder="Vegetariano, Rápido, Sin gluten">
          <div class="field-hint">Separadas por coma</div>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `

  bindEvents()
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

  // Ingredientes
  $('btn-add-ing').addEventListener('click', addIngredient)
  $('f-ing-qty').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } })
  $('f-ing-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('f-ing-qty').focus() } })

  // Pasos
  $('btn-add-step').addEventListener('click', addStep)
  $('f-step-text').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addStep() } })
}

function addIngredient() {
  const name = $('f-ing-name').value.trim()
  if (!name) { $('f-ing-name').focus(); return }
  const qty = $('f-ing-qty').value.trim()
  formIngredients.push({ name, qty })
  $('f-ing-name').value = ''
  $('f-ing-qty').value = ''
  $('f-ing-name').focus()
  renderIngList()
}

function addStep() {
  const text = $('f-step-text').value.trim()
  if (!text) { $('f-step-text').focus(); return }
  formSteps.push(text)
  $('f-step-text').value = ''
  $('f-step-text').focus()
  renderStepList()
}

function renderIngList() {
  const el = $('ing-list')
  if (!formIngredients.length) {
    el.innerHTML = '<div class="form-list-empty">Aún no hay ingredientes</div>'
    return
  }
  el.innerHTML = formIngredients.map((ing, i) => `
    <div class="form-list-item">
      <div class="ing-dot"></div>
      <span class="form-list-text">${ing.name}${ing.qty ? ` <span class="form-list-qty">— ${ing.qty}</span>` : ''}</span>
      <button class="form-list-del" data-i="${i}" type="button">×</button>
    </div>
  `).join('')
  el.querySelectorAll('.form-list-del').forEach(btn =>
    btn.addEventListener('click', () => {
      formIngredients.splice(parseInt(btn.dataset.i), 1)
      renderIngList()
    })
  )
}

function renderStepList() {
  const el = $('step-list')
  if (!formSteps.length) {
    el.innerHTML = '<div class="form-list-empty">Aún no hay pasos</div>'
    return
  }
  el.innerHTML = formSteps.map((s, i) => `
    <div class="form-list-item">
      <div class="form-step-num">${i + 1}</div>
      <span class="form-list-text">${s}</span>
      <button class="form-list-del" data-i="${i}" type="button">×</button>
    </div>
  `).join('')
  el.querySelectorAll('.form-list-del').forEach(btn =>
    btn.addEventListener('click', () => {
      formSteps.splice(parseInt(btn.dataset.i), 1)
      renderStepList()
    })
  )
}

window.handleLogout = async function () {
  await logout()
}

// ─── List ─────────────────────────────────────────────────────────────────────
async function initList() {
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
    btn.className = 'cat' + (activeCat === c ? ' on' : '')
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
    wrap.innerHTML = `<div class="empty"><div class="empty-icon">🍽</div><div class="empty-txt">Sin resultados.<br>Usá el botón + para agregar tu primera receta.</div></div>`
    return
  }

  wrap.innerHTML = list.map(r => `
    <div class="card" data-id="${r.id}">
      ${r.photo_url
        ? `<img class="card-photo" src="${r.photo_url}" alt="${r.name}" loading="lazy">`
        : `<div class="card-photo-empty">${r.emoji || '🍽'}</div>`}
      <div class="card-body">
        <div class="card-row">
          <div class="card-name">${r.name}</div>
          <div class="card-time">⏱ ${r.time || '—'}</div>
        </div>
        <div class="card-desc">${r.description || ''}</div>
        <div class="card-tags">
          ${(r.tags || []).map(t => `<span class="tag">${t}</span>`).join('')}
          ${r.difficulty ? `<span class="tag">${r.difficulty}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('')

  wrap.querySelectorAll('.card').forEach(card => {
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
    ? `<img src="${r.photo_url}" alt="${r.name}" style="width:100%;height:100%;object-fit:cover;display:block">`
    : `<div class="detail-hero-empty">${r.emoji || '🍽'}</div>`
  hero.insertAdjacentHTML('beforeend', `
    <button class="back-btn" onclick="document.getElementById('v-list').classList.add('active');document.getElementById('v-detail').classList.remove('active')">‹</button>
    <button class="edit-btn" data-id="${r.id}">Editar</button>
  `)
  hero.querySelector('.edit-btn').addEventListener('click', () => openForm(r))

  $('d-title').textContent = r.name
  $('d-desc').textContent = r.description || ''
  $('d-meta').innerHTML = [['⏱', r.time], ['👨‍🍳', r.difficulty], ['🍽', r.cat]]
    .filter(([, v]) => v)
    .map(([icon, val]) => `<div class="meta-chip">${icon} ${val}</div>`)
    .join('')

  $('d-serv').textContent = curServ
  renderDetailIngs()

  $('d-steps').innerHTML = (r.steps || [])
    .map((s, i) => `<div class="step"><div class="step-n">${i + 1}</div><div class="step-txt">${s}</div></div>`)
    .join('')

  showView('v-detail')
}

function renderDetailIngs() {
  $('d-ings').innerHTML = (curRecipe.ingredients || [])
    .map(ing => `
      <div class="ing">
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

  $('form-title-h').textContent = recipe ? 'Editar receta' : 'Nueva receta'
  $('f-name').value    = recipe?.name || ''
  $('f-cat').value     = recipe?.cat  || 'Principal'
  $('f-emoji').value   = recipe?.emoji || ''
  $('f-desc').value    = recipe?.description || ''
  $('f-time').value    = recipe?.time || ''
  $('f-diff').value    = recipe?.difficulty || 'Media'
  $('f-serv').value    = recipe?.servings || 4
  $('f-tags').value    = (recipe?.tags || []).join(', ')

  formIngredients = (recipe?.ingredients || []).map(i => ({ name: i.name || i, qty: i.qty || '' }))
  formSteps = [...(recipe?.steps || [])]

  renderPhotoArea()
  showView('v-form')
  // Render lists after view is shown so elements exist
  renderIngList()
  renderStepList()
}

function renderPhotoArea() {
  const wrap = $('photo-wrap')
  if (photoPreviewUrl) {
    wrap.innerHTML = `<img class="photo-preview" src="${photoPreviewUrl}" alt="preview">`
    const btn = document.createElement('button')
    btn.className = 'photo-btn'
    btn.style.marginTop = '8px'
    btn.textContent = '📷 Cambiar foto'
    btn.addEventListener('click', () => $('photo-input').click())
    wrap.appendChild(btn)
  } else {
    wrap.innerHTML = ''
    const btn = document.createElement('button')
    btn.className = 'photo-btn'
    btn.textContent = '📷 Agregar foto del plato'
    btn.addEventListener('click', () => $('photo-input').click())
    wrap.appendChild(btn)
  }
}

function onPhotoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  photoFile = file
  photoPreviewUrl = URL.createObjectURL(file)
  renderPhotoArea()
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
    // Actualizar cache local
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
