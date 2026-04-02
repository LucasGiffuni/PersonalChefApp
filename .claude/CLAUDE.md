# Chef Mobile — Estado actual del proyecto

## Stack
- **Framework:** React Native + Expo SDK ~54
- **Routing:** Expo Router ~6.0 (file-based, grupos de rutas)
- **Lenguaje:** TypeScript
- **State:** Zustand ^5
- **Backend/DB:** Supabase (auth + PostgreSQL + Storage)
- **Repo:** https://github.com/LucasGiffuni/PersonalChefApp

## Variables de entorno (`.env`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_USDA_API_KEY=
EXPO_PUBLIC_ENABLE_INGREDIENT_PRICES=false
```
El cliente Supabase (`lib/supabase.ts`) usa `AsyncStorage` para persistir sesión en mobile.

## Estructura de archivos

```
/
├── app.json                  # Config Expo (scheme: "chefapp", orientación portrait)
├── index.ts                  # Expo entry point
├── babel.config.js
├── tsconfig.json
├── supabase-setup.sql        # Schema SQL completo
├── supabase/
│   ├── functions/
│   │   └── usda-search/      # Edge function: búsqueda USDA de ingredientes
│   │       └── index.ts
│   └── migrations/           # Migraciones SQL (add_dual_roles, add_weekly_plans)
├── scripts/
│   └── seed-ingredients-catalog.mjs
├── assets/
├── lib/                      # Lógica central
│   ├── supabase.ts           # Cliente Supabase con AsyncStorage
│   ├── stores/               # Zustand stores
│   │   ├── authStore.ts
│   │   ├── chefDashboardStore.ts
│   │   ├── consumerStore.ts
│   │   └── inviteStore.ts
│   ├── components/           # UI reutilizable (legacy — formulario activo está en app/)
│   │   ├── chef/
│   │   │   └── RecipeForm.tsx    # LEGACY: reemplazado por app/(chef)/recipes/_form.tsx
│   │   ├── CategoryFilter.tsx
│   │   ├── InputField.tsx
│   │   ├── IOSCard.tsx
│   │   ├── IOSLargeHeader.tsx
│   │   ├── IOSSheet.tsx
│   │   ├── PrimaryButton.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── ScreenContainer.tsx
│   │   ├── SearchBar.tsx
│   │   ├── SectionHeader.tsx
│   │   └── SkeletonCard.tsx
│   ├── hooks/
│   │   └── useTheme.ts
│   ├── i18n/
│   │   └── index.ts
│   ├── services/             # Servicios Supabase
│   │   ├── auth.ts
│   │   ├── ingredients.ts
│   │   └── recipes.ts
│   ├── theme/
│   │   └── tokens.ts         # Design tokens
│   ├── types/
│   │   └── index.ts          # Tipos TypeScript globales
│   └── utils/
│       ├── calculations.ts
│       ├── inviteCode.ts     # Generador de códigos únicos
│       ├── recipeEnrichment.ts
│       ├── toast.ts
│       └── units.ts
└── app/                      # Rutas Expo Router
    ├── _layout.tsx           # Root layout: auth guard + role redirect
    ├── index.tsx
    ├── (auth)/               # Grupo auth
    │   ├── _layout.tsx
    │   ├── login.tsx
    │   ├── register.tsx
    │   └── invite-register.tsx   # Registro con código de invitación
    ├── (chef)/               # Grupo chef (rol = 'chef')
    │   ├── _layout.tsx       # Bottom tabs: Recetas / Calendario / Perfil
    │   ├── index.tsx         # Tab oculto (href: null)
    │   ├── invite.tsx        # Tab oculto: gestión de códigos de invitación
    │   ├── profile.tsx
    │   ├── recipes/          # CRUD de recetas
    │   │   ├── _layout.tsx   # <Stack screenOptions={{ headerShown: false }}> — cada pantalla gestiona su propio header
    │   │   ├── index.tsx     # Lista de recetas
    │   │   ├── new.tsx       # Nueva receta (usa RecipeForm de _form.tsx)
    │   │   ├── _form.tsx     # Formulario compartido (crear + editar). Gestiona su propio <Stack.Screen>
    │   │   ├── [id].tsx      # EDITAR receta (no es un detalle — navega desde index con router.push)
    │   │   └── edit/
    │   │       └── [id].tsx  # Re-export de [id].tsx — mantiene compatibilidad de URL antigua
    │   └── calendar/         # Calendario de servicios
    │       ├── _layout.tsx
    │       ├── index.tsx
    │       └── orders.tsx    # Vista de pedidos de la semana
    ├── (consumer)/           # Grupo consumer (rol = 'consumer')
    │   ├── _layout.tsx       # Bottom tabs: Menú / Mi semana / Perfil
    │   ├── week.tsx          # Plan semanal del consumer
    │   ├── profile.tsx
    │   └── menu/
    │       ├── _layout.tsx
    │       ├── index.tsx     # Menú de recetas publicadas del chef
    │       └── [id].tsx      # Detalle de receta (vista consumer)
    └── invite/
        └── [code].tsx        # Deep link handler: chefapp://invite/[CODE]
```

## Arquitectura de roles

### Flujo de autenticación y roles (`app/_layout.tsx`)
1. `initialize()` — obtiene sesión activa y llama `fetchRole()`
2. `onAuthStateChange` — reacciona a login/logout; evita llamadas redundantes a `fetchRole()` cuando el usuario no cambió (e.g. token refresh)
3. Redirect por rol:
   - Sin sesión → `/login`
   - `role = 'chef'` → `/(chef)/recipes`
   - `role = 'consumer'` → `/(consumer)/menu`
4. Deep link de invitación: `chefapp://invite/[CODE]` → si no hay sesión, guarda el código en `SecureStore` y redirige a `/invite-register`

### `onAuthStateChange` — lógica de rol preservado
```tsx
supabase.auth.onAuthStateChange((event, nextSession) => {
  const currentState = useAuthStore.getState();
  const prevUserId = currentState.session?.user?.id ?? null;
  const nextUserId = nextSession?.user?.id ?? null;
  const userChanged = prevUserId !== nextUserId;

  if (!nextUserId) {
    useAuthStore.setState({ session: null, role: null, isLoading: false });
    return;
  }

  useAuthStore.setState({
    session: nextSession,
    role: userChanged ? null : currentState.role, // preserva rol si es el mismo usuario
  });

  if (userChanged || !currentState.role) {
    void fetchRole(); // solo fetcha si el usuario cambió o no hay rol
    return;
  }

  useAuthStore.setState({ isLoading: false }); // token refresh → no hace nada extra
});
```

### Stores Zustand

**`authStore`** (`lib/stores/authStore.ts`)
```ts
session: Session | null
role: 'chef' | 'consumer' | null
isLoading: boolean
initialize()   // getSession + fetchRole — con try/catch/finally; isLoading: false garantizado
fetchRole()    // SELECT role FROM user_roles WHERE user_id = uid — con try/catch/finally
signOut()
setSession() / setRole()
```
Todos los métodos tienen `try/catch/finally` para garantizar que `isLoading` siempre vuelve a `false`, incluso si Supabase lanza un error. Logs con prefijo `[AUTH]`.

**`consumerStore`** (`lib/stores/consumerStore.ts`)
```ts
chefId / chefName / linkedAt
recipes: Recipe[]          // recetas publicadas del chef vinculado
currentPlan: WeeklyPlan
planItems: PlanItemWithRecipe[]
selectedWeekStart: Date
initialize(consumerId)       // busca chef vinculado en chef_consumers, carga recetas + plan
fetchChefRecipes(chefId)
fetchOrCreatePlan(weekStart) // upsert weekly_plans
fetchPlanItems(planId)
upsertPlanItem(recipeId, servings, days[])
removePlanItem(id)
navigateWeek('prev' | 'next')
clear()                      // resetea el store al cerrar sesión
```

**`chefDashboardStore`** (`lib/stores/chefDashboardStore.ts`)
```ts
consumers: ConsumerWithProfile[]
weekOrders: WeekOrderGroup[]    // pedidos agrupados por consumer
selectedWeekStart: Date
fetchConsumers()
fetchWeekOrders(weekStart)
computeAggregate(weekOrders)    // agrega porciones totales por receta
navigateWeek('prev' | 'next')
```

**`inviteStore`** (`lib/stores/inviteStore.ts`)
```ts
codes: InviteCode[]
fetchCodes()
createCode(maxUses, expiresAt?)  // genera código único, reintenta hasta 4 veces si hay colisión
deleteCode(id)
validateCode(code)   // usa anonSupabase (sin sesión) para validar
redeemCode(code, userId)  // RPC redeem_invite_code en Supabase
```

## Schema de Supabase

### `recipes`
```sql
id          bigint PK
user_id     uuid → auth.users
name        text
cat         text default 'Principal'
emoji       text default '🍽'
description text
time        text
difficulty  text default 'Media'
servings    int  default 4
ingredients jsonb  -- [{ id, name, source, ingredient_id?, fdc_id?, quantity, unit, grams, calories_per_100g?, ... }]
steps       jsonb  -- [string]
tags        jsonb  -- [string]
photo_url   text
is_published bool
```
RLS: cada chef solo ve/edita sus propias recetas. Consumers ven solo `is_published = true` del chef vinculado.

### `ingredients_catalog`
```sql
id                bigint PK
name              text
display_name      text
fdc_id            bigint UNIQUE
calories_per_100g double precision
protein_per_100g  double precision
fat_per_100g      double precision
carbs_per_100g    double precision
```
Seeded con USDA (`npm run seed:ingredients`). También accesible vía edge function `usda-search`. RLS: cualquier usuario autenticado puede leer/insertar.

### `user_roles`
```sql
user_id  uuid → auth.users
role     text  ('chef' | 'consumer')
```

### `chef_consumers`
```sql
chef_id      uuid → auth.users
consumer_id  uuid → auth.users
created_at   timestamptz
```

### `consumer_profiles`
```sql
user_id       uuid → auth.users
display_name  text
```

### `weekly_plans`
```sql
id           bigint PK
consumer_id  uuid
chef_id      uuid
week_start   date   (lunes ISO)
```

### `plan_items`
```sql
id         bigint PK
plan_id    bigint → weekly_plans
recipe_id  bigint → recipes
servings   int
days       text[]  -- ['lunes', 'miércoles', ...]
notes      text
```

### `invite_codes`
```sql
id          bigint PK
chef_id     uuid
code        text UNIQUE
max_uses    int
uses_count  int
expires_at  timestamptz
```
RPC `redeem_invite_code(p_code, p_consumer_id)` — atomicamente incrementa `uses_count` y crea la fila en `chef_consumers`.

### Storage
Bucket `recipe-photos` (público). Fotos subidas como `{recipeId}.{ext}`.

## Tipos clave (`lib/types/index.ts`)
```ts
Recipe          // id, user_id, title, description, image_url, servings, prep_time_minutes, difficulty, category, ingredients, steps
IngredientItem  // id, name, grams, unit, caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g, pricePer100g
NutritionSummary / CostSummary / RecipeMetrics
IngredientCatalogItem / IngredientPriceItem
```
Nota: `consumerStore` define sus propios tipos locales (`Recipe`, `WeeklyPlan`, `PlanItem`, `PlanItemWithRecipe`) distintos de los de `lib/types/index.ts`.

## Formulario de recetas (`app/(chef)/recipes/_form.tsx`)

Componente central compartido por `new.tsx` (crear) y `[id].tsx` (editar).

### Exports
```ts
export type RecipeFormIngredient { id, name, source, catalogIngredientId?, fdcId?, quantity, unit, grams, caloriesPer100g?, ... }
export type RecipeFormData { name, cat, emoji, description, time, difficulty, servings, photo_url, photoUri?, ingredients, steps, is_published }
export function RecipeForm({ initialValues?, onSave, onCancel })
export default RecipeFormRoute  // componente vacío (null) para satisfacer Expo Router
```

### Patrón de header con Stack.Screen
El formulario gestiona su propio header con `<Stack.Screen>` dentro del JSX (no `useNavigation` + `useLayoutEffect`). Esto es necesario porque `recipes/_layout.tsx` tiene `headerShown: false` globalmente.

```tsx
<Stack.Screen
  options={{
    headerShown: true,
    title,
    headerBlurEffect: 'systemMaterial',
    headerTransparent: Platform.OS === 'ios',
    contentStyle: { backgroundColor: colors.groupedBg }, // evita fondo negro detrás del header transparente
    headerLeft: () => <Pressable onPress={handleCancel}><Text>Cancelar</Text></Pressable>,
    headerRight: () => <Pressable onPress={handleSave}><Text>Guardar</Text></Pressable>,
  }}
/>
```

`contentStyle: { backgroundColor }` es crítico: sin él, el fondo detrás del header translúcido aparece negro.

### Secciones del formulario
1. Hero de foto (ImagePicker + BlurView overlay)
2. Info básica: nombre, tiempo de preparación, descripción (modal)
3. Categoría (chips horizontales)
4. Dificultad: Fácil / Media / Difícil (chips)
5. Porciones: 1–8 (chips)
6. Ingredientes (swipeable para eliminar, modal de búsqueda catálogo/USDA)
7. Grilla de nutrición (condicional: solo si hay ingredientes con datos)
8. Pasos (swipeable para eliminar, modal para agregar)
9. Visibilidad: switch publicar/despublicar

### Colores iOS (light mode)
```ts
groupedBg:    '#f2f2f7'   // systemGroupedBackground
cardBg:       '#ffffff'   // secondarySystemGroupedBackground
label:        '#000000'
secondLabel:  'rgba(60,60,67,0.6)'
tertiaryLabel:'rgba(60,60,67,0.3)'
separator:    'rgba(60,60,67,0.29)'
systemBlue:   '#007AFF'
systemGreen:  '#34C759'
systemOrange: '#FF9500'
systemRed:    '#FF3B30'
systemGray:   'rgba(60,60,67,0.3)'
```

## Funcionalidades implementadas

### Chef
- CRUD completo de recetas con foto, ingredientes (con catálogo USDA), pasos, categoría, tiempo, dificultad
- Formulario iOS rediseñado en `app/(chef)/recipes/_form.tsx` (usado por `new.tsx` y `[id].tsx`)
- Nutrición calculada inline en el formulario (kcal, proteínas, grasas, carbos)
- Publicar/despublicar recetas para consumers
- Calendario de servicios semanal
- Vista de pedidos agregados por semana (cuántas porciones de cada receta)
- Gestión de códigos de invitación (crear, listar, eliminar, con expiración y límite de usos)
- Lista de consumers vinculados

### Consumer
- Registro con código de invitación (deep link o manual)
- Vista del menú publicado de su chef con detalle de receta (`menu/[id].tsx`)
- Planner semanal: asignar recetas a días de la semana con cantidad de porciones
- Navegación semana anterior/siguiente

### Auth
- Login, registro, logout
- Registro con invite code (guarda pendingInviteCode en SecureStore, lo redime al completar registro)
- Dark mode: iOS usa `PlatformColor` (sistema); Android usa `useColorScheme`

## Decisiones técnicas importantes

- **`<Stack.Screen>` en JSX vs `useNavigation().setOptions()`:** Para sobrescribir el `headerShown: false` del layout padre, se debe usar `<Stack.Screen options={...}>` renderizado dentro del componente. `useNavigation().setOptions()` + `useLayoutEffect` no es confiable cuando el layout padre tiene `headerShown: false`.
- **`contentStyle` en `<Stack.Screen>`:** Necesario para setear el color de fondo visible detrás de un header transparente/blur. Sin esto, el Stack Navigator muestra fondo negro.
- **`app/(chef)/recipes/[id].tsx` es editar, no detalle:** La lista de recetas navega a `/(chef)/recipes/${recipe.id}` para editar. No hay pantalla de detalle separada en el flujo del chef.
- **`app/(chef)/recipes/edit/[id].tsx`:** Solo re-exporta `[id].tsx` (`export { default } from '../[id]'`). Mantiene compatibilidad con URLs antiguas.
- **`try/catch/finally` en authStore:** Todos los métodos async garantizan `isLoading: false` en el bloque `finally`. Sin esto, cualquier error de Supabase deja el spinner infinito.
- **`src/` eliminado:** todo el código compartido migró a `lib/`. No existe `src/` en el proyecto actual.
- **Expo Router + grupos de rutas:** la lógica de rol/auth está centralizada en `app/_layout.tsx`. Los grupos `(chef)` y `(consumer)` son completamente independientes.
- **Rutas planas en consumer y chef:** `profile`, `week` e `invite` son archivos `.tsx` directos, no subdirectorios con `index.tsx`.
- **`anonSupabase` en inviteStore:** `validateCode` necesita funcionar sin sesión activa. Se crea un cliente Supabase separado con `persistSession: false`.
- **`startOfWeekMonday` y `toISODate` exportadas desde `consumerStore`:** `chefDashboardStore` las importa directamente de ese módulo para mantener consistencia.
- **BlurView en tab bars:** ambos layouts de tabs usan `expo-blur` + `backgroundColor: transparent` para la barra nativa de iOS.
- **Tab `invite` e `index` ocultos en chef:** en `(chef)/_layout.tsx`, ambos tienen `href: null` para que no aparezcan en la barra pero las rutas sigan siendo navegables.
- **`consumerStore.clear()`:** llamado en el layout del grupo consumer cuando no hay sesión, evita que datos del usuario anterior persistan.

## Comandos

```bash
npx expo start           # Servidor de desarrollo (Expo Go / simulador)
npx expo run:ios         # Build nativo iOS
npx expo run:android     # Build nativo Android
npx expo start --web     # Web (Metro bundler)
npm run typecheck        # Verificar TypeScript
npm run seed:ingredients # Poblar ingredients_catalog con datos USDA
```
