# Chef Personal — PWA con Supabase

Recetario personal instalable, con login, fotos y sincronización en la nube.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML + CSS + JS vanilla (sin frameworks) |
| Build | Vite + vite-plugin-pwa |
| Base de datos | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email + contraseña) |
| Fotos | Supabase Storage |
| Deploy | Vercel (gratis) |

---

## Estructura

```
chef-pwa/
├── index.html              → Entry point de Vite
├── vite.config.js          → Config de Vite + PWA plugin
├── package.json
├── .env.example            → Plantilla de variables de entorno
├── supabase-setup.sql      → SQL para crear la tabla y el bucket
├── public/
│   └── icons/
│       ├── icon-192.png    → Ícono PWA (crealo vos)
│       └── icon-512.png    → Ícono PWA grande
└── src/
    ├── main.js             → Entry point JS — maneja sesión
    ├── auth.js             → Pantalla de login / registro
    ├── app.js              → UI principal (lista, detalle, formulario)
    ├── db.js               → Queries a Supabase
    ├── supabase.js         → Cliente de Supabase
    └── style.css           → Estilos globales + dark mode
```

---

## Setup local (primera vez)

### 1. Clonar / descomprimir el proyecto

```bash
cd chef-pwa
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → New project
2. Elegí una región cercana (ej: São Paulo)
3. Esperá que inicialice (~2 min)
4. Andá a **SQL Editor** y ejecutá todo el contenido de `supabase-setup.sql`
5. Andá a **Project Settings → API** y copiá:
   - `Project URL`
   - `anon public key`

### 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Editá `.env`:

```env
VITE_SUPABASE_URL=https://tuproyecto.supabase.co
VITE_SUPABASE_KEY=tu_anon_key_aqui
```

### 5. Correr en modo desarrollo

```bash
npm run dev
```

Abrí `http://localhost:5173` — tiene hot reload automático.

### 6. Build para producción

```bash
npm run build
```

Genera la carpeta `dist/` lista para deployar.

---

## Deploy en Vercel

### Opción A — CLI

```bash
npm install -g vercel
vercel
```

Cuando te pregunte por el framework, elegí **Other** (no es React).

Configurá las variables de entorno en Vercel:

```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_KEY
```

O desde el dashboard de Vercel en **Settings → Environment Variables**.

### Opción B — GitHub (recomendado para actualizaciones fáciles)

1. Subí el proyecto a un repo en GitHub
2. En Vercel: **New Project → Import** ese repo
3. Agregá las variables de entorno desde el dashboard
4. Cada `git push` redeploya automáticamente

---

## Instalar como app en el celular

### iPhone (Safari obligatorio)
1. Abrí la URL en Safari
2. Compartir → **Agregar a pantalla de inicio**

### Android (Chrome)
1. Abrí la URL en Chrome
2. Tres puntos → **Instalar app** (o aparece un banner automático)

---

## Autenticación

- Login con email + contraseña
- Registro desde la misma pantalla
- Cada usuario solo ve y edita **sus propias** recetas (Row Level Security)
- La sesión persiste en `localStorage` — no hay que loguearse cada vez

### Deshabilitar confirmación de email (opcional, para uso personal)

En Supabase → **Authentication → Settings** → desactivar **"Enable email confirmations"**. Así podés registrarte y entrar directamente sin confirmar.

---

## Cómo cargar recetas

### Ingredientes (un por línea)
```
Arroz arbóreo — 300 g
Caldo de verduras — 1 L
Manteca — 50 g
Parmesano — 80 g
```

### Pasos (uno por línea)
```
Calentar el caldo y mantenerlo a fuego bajo.
Saltear la cebolla en manteca hasta transparentar.
Agregar el arroz y nacarar 2 minutos revolviendo.
Agregar el caldo de a cucharones, revolviendo constantemente.
```

---

## Próximas mejoras posibles

- [ ] Escala automática de cantidades al ajustar porciones
- [ ] Lista de compras generada desde varias recetas
- [ ] Planificador semanal de menús
- [ ] Buscar por ingrediente
- [ ] Exportar receta como PDF
