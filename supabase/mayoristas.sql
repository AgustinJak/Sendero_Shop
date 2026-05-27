-- =============================================
-- MAYORISTAS — Listas de precios
-- Ejecutar en Supabase SQL Editor
-- =============================================
--
-- También crear en Storage > Buckets:
--   Nombre: mayoristas
--   Public: true
-- =============================================

create table if not exists mayorista_listas (
  id      uuid    default gen_random_uuid() primary key,
  codigo  text    unique not null,
  nombre  text    not null,
  activa  boolean default true,
  created_at timestamptz default now()
);

create table if not exists mayorista_secciones (
  id       uuid    default gen_random_uuid() primary key,
  lista_id uuid    references mayorista_listas(id) on delete cascade not null,
  titulo   text    not null,
  orden    int     default 0
);

create table if not exists mayorista_items (
  id             uuid    default gen_random_uuid() primary key,
  seccion_id     uuid    references mayorista_secciones(id) on delete cascade not null,
  titulo         text    not null,
  codigo_ref     text    not null default '',
  precio_ars     numeric,
  makerworld_url text,
  orden          int     default 0
);

create table if not exists mayorista_imagenes (
  id           uuid default gen_random_uuid() primary key,
  item_id      uuid references mayorista_items(id) on delete cascade not null,
  url          text not null,
  storage_path text,
  orden        int  default 0
);

-- ---- RLS ----
alter table mayorista_listas    enable row level security;
alter table mayorista_secciones enable row level security;
alter table mayorista_items     enable row level security;
alter table mayorista_imagenes  enable row level security;

-- Listas: solo activas son públicas; admin puede todo
create policy "mayorista_listas_public_select"   on mayorista_listas    for select using (activa = true);
create policy "mayorista_listas_admin_all"        on mayorista_listas    for all    using (auth.role() = 'authenticated');
create policy "mayorista_secciones_public_select" on mayorista_secciones for select using (true);
create policy "mayorista_secciones_admin_all"     on mayorista_secciones for all    using (auth.role() = 'authenticated');
create policy "mayorista_items_public_select"     on mayorista_items     for select using (true);
create policy "mayorista_items_admin_all"         on mayorista_items     for all    using (auth.role() = 'authenticated');
create policy "mayorista_imagenes_public_select"  on mayorista_imagenes  for select using (true);
create policy "mayorista_imagenes_admin_all"      on mayorista_imagenes  for all    using (auth.role() = 'authenticated');
