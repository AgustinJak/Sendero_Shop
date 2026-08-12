-- =============================================
-- KITS — Combos como producto del catálogo
-- Aplicada en Supabase el 2026-08-12
-- (migración: kits_es_kit_y_componentes)
-- =============================================
--
-- Un kit ES un producto con `es_kit = true` y una lista de componentes.
-- Así hereda carrito, checkout, SEO, reseñas, galería, filtros, feed de
-- Google Shopping y el admin de productos que ya existen, en vez de
-- duplicarlos como hacían las listas mayoristas.
--
-- El precio del kit es propio y fijo. Los componentes solo describen qué
-- incluye y permiten calcular el "ahorrás $X" contra la suma a precio de lista.
-- =============================================

alter table productos
  add column if not exists es_kit boolean not null default false;

comment on column productos.es_kit is
  'Marca el producto como kit/combo. Su precio es propio y fijo; los componentes solo describen qué incluye.';

create table if not exists kit_componentes (
  id          uuid        primary key default gen_random_uuid(),
  kit_id      uuid        not null references productos(id) on delete cascade,
  producto_id uuid        not null references productos(id) on delete restrict,
  cantidad    integer     not null default 1,
  orden       integer     not null default 0,
  created_at  timestamptz not null default now(),

  -- Un kit no puede contenerse a sí mismo.
  constraint kit_componentes_no_autoreferencia check (kit_id <> producto_id),
  constraint kit_componentes_cantidad_positiva check (cantidad > 0),
  -- Un producto aparece una sola vez por kit; para llevar más, se sube cantidad.
  constraint kit_componentes_unicos unique (kit_id, producto_id)
);

comment on table kit_componentes is
  'Qué productos trae cada kit. `producto_id` usa on delete restrict a propósito: borrar un producto que integra un kit cambiaría en silencio lo que el cliente compró.';

create index if not exists kit_componentes_kit_id_idx      on kit_componentes (kit_id);
create index if not exists kit_componentes_producto_id_idx on kit_componentes (producto_id);

-- Índice parcial: solo interesa filtrar cuando es_kit es true (son pocos).
create index if not exists productos_es_kit_idx on productos (es_kit) where es_kit;

alter table kit_componentes enable row level security;

create policy kit_componentes_public_read on kit_componentes
  for select using (true);

create policy kit_componentes_admin_all on kit_componentes
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
