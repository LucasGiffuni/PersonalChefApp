import { supabase } from './supabase.js'

let isRegister = false

const $ = id => document.getElementById(id)

// ─── Inicializa listeners del formulario de auth ──────────────────────────────
export function initAuth() {
  $('a-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') window.handleLogin()
  })
}

// ─── Muestra la pantalla de auth ─────────────────────────────────────────────
export function showAuthView() {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  $('v-auth').classList.add('active')
  // Resetear estado
  isRegister = false
  $('a-submit').textContent = 'Entrar'
  $('a-error').textContent = ''
  $('a-error').style.color = '#c0392b'
  document.querySelector('.auth-footer').innerHTML =
    '¿Primera vez? <span class="auth-link" onclick="toggleAuthMode()">Crear cuenta</span>'
}

// ─── Toggle login / registro ──────────────────────────────────────────────────
window.toggleAuthMode = function () {
  isRegister = !isRegister
  $('a-submit').textContent = isRegister ? 'Crear cuenta' : 'Entrar'
  $('a-error').textContent = ''
  document.querySelector('.auth-footer').innerHTML = isRegister
    ? '¿Ya tenés cuenta? <span class="auth-link" onclick="toggleAuthMode()">Iniciar sesión</span>'
    : '¿Primera vez? <span class="auth-link" onclick="toggleAuthMode()">Crear cuenta</span>'
}

// ─── Login / registro ─────────────────────────────────────────────────────────
window.handleLogin = async function () {
  const email = $('a-email').value.trim()
  const pass  = $('a-pass').value
  const btn   = $('a-submit')
  const errEl = $('a-error')

  if (!email || !pass) { errEl.textContent = 'Completá email y contraseña'; return }

  btn.disabled = true
  btn.textContent = isRegister ? 'Creando cuenta...' : 'Entrando...'
  errEl.textContent = ''

  const fn = isRegister
    ? supabase.auth.signUp({ email, password: pass })
    : supabase.auth.signInWithPassword({ email, password: pass })

  const { error } = await fn

  if (error) {
    errEl.textContent = translateError(error.message)
    errEl.style.color = '#c0392b'
    btn.disabled = false
    btn.textContent = isRegister ? 'Crear cuenta' : 'Entrar'
    return
  }

  if (isRegister) {
    errEl.style.color = 'var(--green)'
    errEl.textContent = 'Cuenta creada. Revisá tu email para confirmar.'
    btn.textContent = 'Entrar'
    btn.disabled = false
    isRegister = false
  }
  // Si el login es exitoso, onAuthStateChange en main.js muestra la app
}

// ─── Logout ───────────────────────────────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut()
}

// ─── Traducción de errores ────────────────────────────────────────────────────
function translateError(msg) {
  if (msg.includes('Invalid login')) return 'Email o contraseña incorrectos'
  if (msg.includes('Email not confirmed')) return 'Confirmá tu email antes de entrar'
  if (msg.includes('already registered')) return 'Ese email ya tiene una cuenta'
  if (msg.includes('Password should')) return 'La contraseña debe tener al menos 6 caracteres'
  return msg
}
