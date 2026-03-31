import { supabase } from './supabase.js'
import { initAuth, showAuthView } from './auth.js'
import { initApp } from './app.js'

// Inicializar listeners de auth (Enter en password, etc.)
initAuth()

// Escucha cambios de sesión: login, logout, recarga de página
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    initApp()
  } else {
    showAuthView()
  }
})

// Verificar sesión inicial
const { data: { session } } = await supabase.auth.getSession()
if (!session) showAuthView()
