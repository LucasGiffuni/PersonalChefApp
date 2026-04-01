# Chef Personal — Estado actual del proyecto

## Stack
- **Frontend:** Vite + Vanilla JS (ES Modules, sin frameworks)
- **Backend/DB:** Supabase (auth + PostgreSQL + Storage)
- **PWA:** vite-plugin-pwa + Workbox (service worker, manifest)
- **Deploy:** Vercel → https://chef-pwa.vercel.app
- **Repo:** https://github.com/LucasGiffuni/PersonalChefApp

## Estructura de archivos

```
/
├── index.html           # HTML estático con todas las vistas pre-renderizadas
├── vite.config.js       # Vite + PWA config, build target es2022
├── supabase-setup.sql   # Schema SQL para ejecutar en Supabase
├── .env.example         # Variables de entorno requeridas
└── src/
    ├── main.js          # Entry point: inicializa auth, escucha sesión
    ├── auth.js          # Login/registro/logout, funciones globales handleLogin, toggleAuthMode
    ├── app.js           # Toda la lógica de UI: lista, detalle, formulario
    ├── db.js            # CRUD contra Supabase (fetchRecipes, upsertRecipe, deleteRecipe, uploadPhoto)
    ├── supabase.js      # Cliente Supabase con VITE_SUPABASE_URL y VITE_SUPABASE_KEY
    ├── style.css        # Todos los estilos (design system con variables CSS)
    └── icons/           # Iconos PWA (192px y 512px)
```

## Variables de entorno (`.env`)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_KEY=tu_anon_key
```

## Schema de Supabase

### Tabla `recipes`
```sql
id          bigint generated always as identity primary key
created_at  timestamptz default now()
user_id     uuid references auth.users(id) on delete cascade
name        text not null
cat         text default 'Principal'
emoji       text default '🍽'
description text
time        text
difficulty  text default 'Media'
servings    int  default 4
ingredients jsonb default '[]'  -- [{ name: string, qty: string }]
steps       jsonb default '[]'  -- [string]
tags        jsonb default '[]'  -- [string]
photo_url   text
```
RLS habilitado: cada usuario solo ve/edita sus propias recetas.

### Storage
Bucket `recipe-photos` (público para lectura). Fotos subidas como `{recipeId}.{ext}`.

## Arquitectura de la app

### Patrón de vistas
El HTML tiene 4 vistas estáticas con clase `.view` y `.view.active`:
- `#v-auth` — Login/registro (activa por defecto al cargar)
- `#v-list` — Lista de recetas
- `#v-detail` — Detalle de una receta
- `#v-form` — Formulario nueva/editar receta

La función `showView(id)` en `app.js` maneja la navegación quitando/agregando `.active`.

### Flujo de autenticación (`main.js` + `auth.js`)
1. `initAuth()` — bindea Enter en el campo password
2. `supabase.auth.onAuthStateChange` — si hay sesión llama `initApp()`, si no `showAuthView()`
3. `getSession()` inicial — si no hay sesión, muestra auth inmediatamente

Funciones globales expuestas: `window.handleLogin`, `window.toggleAuthMode`, `window.handleLogout`

### App principal (`app.js`)

**Estado global:**
```js
recipes         // array cache local de recetas
activeCat       // categoría filtro activa ('Todas' por defecto)
curRecipe       // receta abierta en detalle
curServ         // porciones seleccionadas actualmente
baseServ        // porciones base de la receta (para escalar)
editingId       // id de receta siendo editada (null si es nueva)
photoFile       // File object foto nueva
photoPreviewUrl // URL preview foto
formIngredients // array [{name, qty}] para el formulario
formSteps       // array [string] para el formulario
selectedUnit    // unidad activa en las pills ('g' por defecto)
appInitialized  // flag para que bindEvents() solo corra una vez
```

**Funciones principales:**
- `initApp()` — muestra v-list, bindea eventos (solo una vez), carga recetas
- `renderList()` — filtra por categoría/búsqueda y renderiza cards
- `openDetail(r)` — abre vista detalle con datos de receta `r`
- `renderDetailIngs()` — renderiza ingredientes escalados por `curServ/baseServ`
- `updateBatchInfo()` — muestra panel de tandas/factor cuando curServ ≠ baseServ
- `openForm(recipe?)` — abre formulario (edición si se pasa recipe, nueva si null)
- `handleSave()` — guarda receta via `upsertRecipe` + sube foto si hay
- `renderIngList()` / `renderStepList()` — renderizan listas del formulario

**Funciones globales (llamadas desde HTML `onclick`):**
- `window.addIng()` — agrega ingrediente al array usando `selectedUnit`
- `window.addStep()` — agrega paso al array
- `window.onIngKey(e)` — Enter en nombre → foco a cantidad; Enter en cantidad → addIng
- `window.onStepKey(e)` — Enter → addStep
- `window.handleLogout()` — cierra sesión

## Funcionalidades implementadas

### 1. Auth
- Login y registro con email/password
- Toggle login ↔ registro sin recargar
- Mensajes de error traducidos al español
- Enter para enviar formulario

### 2. Lista de recetas
- Cards con foto o emoji placeholder
- Chip de tiempo flotante (⏱) sobre la imagen
- Filtro por categorías (pills deslizables)
- Búsqueda por nombre en tiempo real
- Estado vacío con mensaje guía
- FAB (+) para nueva receta

### 3. Detalle de receta
- Hero con foto/emoji, botones back y editar superpuestos
- Meta-chips: tiempo, dificultad, categoría
- Control de porciones [−] N [+]
- **Escalado de receta:** al cambiar porciones, los ingredientes se escalan automáticamente por el factor `curServ/baseServ`
- **Panel de tandas:** cuando curServ ≠ baseServ, muestra factor (ej: ×2) y cuántas tandas necesitar preparar
- Lista de pasos numerados
- Botón eliminar receta

### 4. Formulario (nueva/editar receta)
Organizado en secciones con card-style:
- **Foto hero** (180px, click para seleccionar, overlay al hover si hay foto)
- **Información básica:** nombre, descripción, emoji
- **Detalles:** categoría + tiempo (2 col), dificultad + porciones (2 col)
- **Ingredientes:** lista dinámica ítem a ítem
  - Input de nombre (ancho completo)
  - Fila: cantidad numérica + pills de unidades deslizables + botón +
  - Unidades: g, kg, cda, cdta, L, mL, taza, u, — (sin unidad)
  - Ítem agregado muestra nombre + cantidad como chip
- **Preparación:** lista de pasos numerados, badge muestra número del próximo paso
- **Etiquetas:** separadas por coma

## Design system (CSS variables)

```css
--green / --green-dark / --green-light / --green-text
--text / --text-2 / --text-3
--border / --border-2
--bg / --bg-2 / --bg-3
--radius: 12px / --radius-sm: 8px / --radius-full: 999px
--safe-top / --safe-bottom   (env safe areas para iOS)
```

Dark mode soportado via `@media (prefers-color-scheme: dark)`.

## Clases CSS clave

| Clase | Uso |
|-------|-----|
| `.view` / `.view.active` | Sistema de vistas |
| `.recipe-card` | Card de receta en lista |
| `.recipe-card-placeholder` | Contenedor foto/emoji (position:relative, height:160px) |
| `.time-chip` | Chip flotante de tiempo (position:absolute) |
| `.fsec` / `.fsec-title` | Secciones del formulario |
| `.ing-add-wrap` | Bloque 2 filas para agregar ingrediente |
| `.ing-qty-row` | Fila cantidad + unit-pills + botón |
| `.unit-pill` / `.unit-pill.active` | Pills de unidades |
| `.ing-add-btn` | Botón + de agregar ítem |
| `.batch-info` | Panel de escalado de receta |
| `.item-list` | Lista de ítems en formulario |
| `.ing-item-form` / `.step-item-form` | Ítem en lista del formulario |
| `.item-del-btn` | Botón × para eliminar ítem |

## Decisiones técnicas importantes

- **HTML estático:** todas las vistas están en `index.html` desde el inicio; JS solo muestra/oculta con `.active`. No hay renderizado dinámico del shell.
- **Sin frameworks:** vanilla JS puro, sin React/Vue/etc.
- **Módulos ES:** Vite maneja bundling; `supabase.js` usa `import.meta.env` para las keys.
- **`lodash@4.17.21` fijado:** la versión `4.18.0` (no oficial) causaba error en `workbox-build`. Nunca actualizar lodash sin verificar.
- **`build.target: 'es2022'`:** necesario para `top-level await` en `main.js`.
- **`flex-shrink: 0` en `.recipe-card`:** evita que las cards se achiquen cuando hay muchas en el flex container.
- **`appInitialized` flag:** `bindEvents()` solo corre una vez aunque `initApp()` se llame múltiples veces (por re-login).

## Comandos

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
vercel --prod    # Deploy a producción
```
