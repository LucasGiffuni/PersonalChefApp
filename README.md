# Chef Mobile (Expo + React Native)

App mobile para gestión de recetas migrada desde PWA a React Native + Expo.

## Stack

- Expo SDK 54 (managed workflow)
- React Native + TypeScript
- Supabase (auth + postgres + storage)
- React Navigation (stack + tabs)
- Zustand (estado global)
- StyleSheet + theming light/dark

## Estructura

```
/src
  /components
  /screens
  /navigation
  /hooks
  /services
  /store
  /types
  /utils
  /theme
```

## Variables de entorno

Copiar `.env.example` a `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_USDA_API_KEY=...
```

## Ejecutar

```bash
npm install
npx expo install --fix
npx expo-doctor
npm run start
```

Para iOS/Android nativo:

```bash
npm run ios
npm run android
```

## Funcionalidades base implementadas

- Auth stack (`Login`, `Register`)
- App tabs (`Home`, `Create`, `Profile`)
- Stack interno (`RecipeDetail`, `EditRecipe`)
- CRUD de recetas vía Supabase
- Catálogo y precios de ingredientes con cache offline básico
- Cálculo de nutrición y costos por receta/porción
- Escalado dinámico de ingredientes por porciones
- Skeleton loading y feedback con toasts
- Soporte light/dark automático

## Notas

- `EditRecipeScreen` reutiliza la base de `CreateRecipeScreen` como scaffold inicial.
- Para producción, extraer formulario compartido (`RecipeForm`) y completar validaciones avanzadas.
