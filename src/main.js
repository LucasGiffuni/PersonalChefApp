import { supabase } from './supabase.js'
import { renderLogin } from './auth.js'
import { renderApp } from './app.js'

// Escucha cambios de sesión: login, logout, recarga de página
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    renderApp(session.user.email)
  } else {
    renderLogin()
  }
})

// Verificar sesión inicial (evita flash de login si ya estaba logueado)
const { data: { session } } = await supabase.auth.getSession()
if (!session) renderLogin()
