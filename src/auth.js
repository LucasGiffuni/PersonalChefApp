import { supabase } from './supabase.js'

// ─── Renderiza la pantalla de login ──────────────────────────────────────────
export function renderLogin() {
  document.getElementById('app').innerHTML = `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">🍳</div>
        <div class="auth-title">Chef Personal</div>
        <div class="auth-sub">Tu recetario privado</div>

        <div class="field" style="margin-top:28px">
          <label>Email</label>
          <input id="a-email" type="email" placeholder="tu@email.com" autocomplete="email">
        </div>
        <div class="field" style="margin-top:14px">
          <label>Contraseña</label>
          <input id="a-pass" type="password" placeholder="••••••••" autocomplete="current-password">
        </div>

        <div class="auth-error" id="a-error"></div>

        <button class="auth-btn" id="a-submit" onclick="handleLogin()">Entrar</button>

        <div class="auth-footer">
          ¿Primera vez? <span class="auth-link" onclick="toggleMode()">Crear cuenta</span>
        </div>
      </div>
    </div>
  `

  // Enter para enviar
  document.getElementById('a-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleLogin()
  })
}

// ─── Toggle login / registro ─────────────────────────────────────────────────
let isRegister = false

window.toggleMode = function () {
  isRegister = !isRegister
  document.getElementById('a-submit').textContent = isRegister ? 'Crear cuenta' : 'Entrar'
  document.getElementById('a-error').textContent = ''
  const footer = document.querySelector('.auth-footer')
  footer.innerHTML = isRegister
    ? '¿Ya tenés cuenta? <span class="auth-link" onclick="toggleMode()">Iniciar sesión</span>'
    : '¿Primera vez? <span class="auth-link" onclick="toggleMode()">Crear cuenta</span>'
}

// ─── Login / registro ────────────────────────────────────────────────────────
window.handleLogin = async function () {
  const email = document.getElementById('a-email').value.trim()
  const pass  = document.getElementById('a-pass').value
  const btn   = document.getElementById('a-submit')
  const errEl = document.getElementById('a-error')

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
  // Si el login es exitoso, onAuthStateChange en main.js se encarga de mostrar la app
}

// ─── Logout ──────────────────────────────────────────────────────────────────
export async function logout() {
  await supabase.auth.signOut()
}

// ─── Traducción de errores comunes ───────────────────────────────────────────
function translateError(msg) {
  if (msg.includes('Invalid login')) return 'Email o contraseña incorrectos'
  if (msg.includes('Email not confirmed')) return 'Confirmá tu email antes de entrar'
  if (msg.includes('already registered')) return 'Ese email ya tiene una cuenta'
  if (msg.includes('Password should')) return 'La contraseña debe tener al menos 6 caracteres'
  return msg
}
