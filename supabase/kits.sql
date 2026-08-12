-- =============================================
-- KITS — Combos de productos del catálogo
-- Aplicada en Supabase el 2026-08-12
-- (migración: kits_entidad_propia)
-- =============================================
--
-- Un kit es una entidad propia que agrupa productos del catálogo con sus
-- cantidades. Reemplaza a los kits que vivían dentro de las listas mayoristas:
-- misma lógica de precio, pero sin depender de una lista y tomando los
-- componentes de `productos` en vez de un catálogo paralelo (`mayorista_items`),
-- que se desincronizaba.
--
-- Precio: cada componente aplica el tramo por cantidad que corresponda
-- (configurable en `configuracion.descuento_tramos`, ej "5:10, 10:20, 20:30")
-- y al subtotal se le resta `descuento_extra_pct` del kit.
--
-- `tipo` define en qué apartado de /kits aparece: minorista o mayorista.
-- =============================================

create table if not exists kits (
  id            uuid        primary key default gen_random_uuid(),
  nombre        text        not null,
  slug          text        not null unique,
  descripcion   text,
  tipo          text        not null default 'minorista'
                            check (tipo in ('minorista','mayorista')),
  descuento_extra_pct numeric not null default 0
                            check (descuento_extra_pct >= 0 and descuento_extra_pct <= 100),
  activo        boolean     not null default true,
  orden         integer     not null default 0,
  imagen_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table kits is
  'Combos de productos del catálogo. El precio se calcula: cada componente aplica el tramo por cantidad y al subtotal se le resta `descuento_extra_pct`.';

create table if not exists kit_items (
  id          uuid        primary key default gen_random_uuid(),
  kit_id      uuid        not null references kits(id) on delete cascade,
  producto_id uuid        not null references productos(id) on delete restrict,
  cantidad    integer     not null default 1,
  orden       integer     not null default 0,

  constraint kit_items_cantidad_positiva check (cantidad > 0),
  -- Un producto va una sola vez por kit; para llevar más, se sube cantidad.
  constraint kit_items_unicos unique (kit_id, producto_id)
);

comment on table kit_items is
  'Productos que integran cada kit. `producto_id` usa on delete restrict: borrar un producto que integra un kit cambiaría en silencio lo que el cliente compra.';

create index if not exists kit_items_kit_id_idx      on kit_items (kit_id);
create index if not exists kit_items_producto_id_idx on kit_items (producto_id);
create index if not exists kits_tipo_activo_idx      on kits (tipo, orden) where activo;

alter table kits      enable row level security;
alter table kit_items enable row level security;

create policy kits_public_read on kits
  for select using (true);
create policy kits_admin_all on kits
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy kit_items_public_read on kit_items
  for select using (true);
create policy kit_items_admin_all on kit_items
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =============================================
-- Migración de los kits que vivían en las listas mayoristas.
-- Los 2 existentes eran packs de reventa (50-55 u) → tipo mayorista.
-- Quedan inactivos para revisarlos antes de publicarlos.
-- =============================================
--
-- with nuevos as (
--   insert into kits (nombre, slug, descripcion, tipo, descuento_extra_pct, activo, orden)
--   select k.nombre,
--          lower(regexp_replace(regexp_replace(k.nombre, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
--          k.descripcion, 'mayorista', k.descuento_extra_pct, false, k.orden
--   from mayorista_kits k
--   returning id, nombre
-- )
-- insert into kit_items (kit_id, producto_id, cantidad, orden)
-- select n.id, i.producto_id, ki.cantidad,
--        row_number() over (partition by n.id order by i.titulo) - 1
-- from nuevos n
-- join mayorista_kits mk on mk.nombre = n.nombre
-- join mayorista_kit_items ki on ki.kit_id = mk.id
-- join mayorista_items i on i.id = ki.item_id
-- where i.producto_id is not null;
