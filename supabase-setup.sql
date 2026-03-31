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
  ingredients jsonb       default '[]',  -- [{ name: string, qty: string }]
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
