-- ─────────────────────────────────────────────────────────────────────────────
-- CHEF PERSONAL — Setup de Supabase
-- Ejecutá este SQL en el SQL Editor de tu proyecto (supabase.com → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabla de recetas
create table if not exists recipes (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text        not null,
  cat         text        default 'Principal',
  emoji       text        default '🍽',
  description text,
  time        text,
  difficulty  text        default 'Media',
  servings    int         default 4,
  ingredients jsonb       default '[]',  -- [{ name: string, grams: number, ingredient_id: number }]
  steps       jsonb       default '[]',  -- [string]
  tags        jsonb       default '[]',  -- [string]
  photo_url   text
);

-- 2. Índice para acelerar las consultas por usuario
create index if not exists recipes_user_id_idx on recipes(user_id);

-- 3. Row Level Security — cada usuario solo ve y edita sus propias recetas
alter table recipes enable row level security;

create policy "ver_propias" on recipes
  for select using (auth.uid() = user_id);

create policy "insertar_propias" on recipes
  for insert with check (auth.uid() = user_id);

create policy "editar_propias" on recipes
  for update using (auth.uid() = user_id);

create policy "borrar_propias" on recipes
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- CATÁLOGO DE INGREDIENTES (cache USDA)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists ingredients_catalog (
  id                 bigint generated always as identity primary key,
  name               text not null,
  display_name       text not null,
  fdc_id             bigint unique not null,
  calories_per_100g  double precision default 0,
  protein_per_100g   double precision default 0,
  fat_per_100g       double precision default 0,
  carbs_per_100g     double precision default 0,
  created_at         timestamptz default now()
);

create index if not exists ingredients_catalog_name_idx on ingredients_catalog(name);
create index if not exists ingredients_catalog_name_lower_idx on ingredients_catalog(lower(name));

alter table ingredients_catalog enable row level security;

create policy "ver_ingredientes_catalogo" on ingredients_catalog
  for select using (auth.uid() is not null);

create policy "insertar_ingredientes_catalogo" on ingredients_catalog
  for insert with check (auth.uid() is not null);

create policy "editar_ingredientes_catalogo" on ingredients_catalog
  for update using (auth.uid() is not null);

-- 4. Bucket de fotos (público para leer, restringido para escribir)
insert into storage.buckets (id, name, public)
values ('recipe-photos', 'recipe-photos', true)
on conflict do nothing;

-- Solo el dueño puede subir/eliminar sus fotos
create policy "subir_fotos" on storage.objects
  for insert with check (
    bucket_id = 'recipe-photos' and auth.uid() is not null
  );

create policy "actualizar_fotos" on storage.objects
  for update using (
    bucket_id = 'recipe-photos' and auth.uid() is not null
  );

create policy "ver_fotos" on storage.objects
  for select using (bucket_id = 'recipe-photos');

-- ─────────────────────────────────────────────────────────────────────────────
-- ¡Listo! Ahora:
-- 1. Copiá .env.example como .env y completá tus credenciales
-- 2. Habilitá "Email confirmations" en Authentication → Settings si querés
--    que los usuarios confirmen su email antes de entrar
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- CLIENTES
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists clients (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade,
  name        text not null,
  phone       text,
  email       text,
  allergies   jsonb default '[]',
  preferences text,
  notes       text
);

create index if not exists clients_user_id_idx on clients(user_id);

alter table clients enable row level security;

create policy "ver_propios_clientes" on clients
  for select using (auth.uid() = user_id);

create policy "insertar_propios_clientes" on clients
  for insert with check (auth.uid() = user_id);

create policy "editar_propios_clientes" on clients
  for update using (auth.uid() = user_id);

create policy "borrar_propios_clientes" on clients
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SERVICIOS (calendario)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists services (
  id          bigint generated always as identity primary key,
  created_at  timestamptz default now(),
  user_id     uuid references auth.users(id) on delete cascade,
  client_id   bigint references clients(id) on delete set null,
  date        date not null,
  time_start  time,
  time_end    time,
  location    text,
  menu_notes  text,
  status      text default 'pendiente' check (status in ('pendiente', 'confirmado', 'completado', 'cancelado')),
  price       numeric,
  notes       text
);

create index if not exists services_user_id_idx on services(user_id);
create index if not exists services_date_idx on services(date);

alter table services enable row level security;

create policy "ver_propios_servicios" on services
  for select using (auth.uid() = user_id);

create policy "insertar_propios_servicios" on services
  for insert with check (auth.uid() = user_id);

create policy "editar_propios_servicios" on services
  for update using (auth.uid() = user_id);

create policy "borrar_propios_servicios" on services
  for delete using (auth.uid() = user_id);
