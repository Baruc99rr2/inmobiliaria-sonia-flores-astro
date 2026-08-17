-- ===========================================================================
-- FASE 6a — Archivar en vez de borrar
-- ===========================================================================
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE.
--
-- Qué hace:
--
-- Agrega `archived_at`. Cuando la dueña toca "Eliminar", la fila NO se borra:
-- se le pone una fecha ahí. Desaparece del panel y de la web, pero el dato queda
-- entero y se puede recuperar.
--
-- Por qué no un DELETE de verdad:
--
-- Va a usar el panel desde el celular, donde un toque mal dado es cuestión de
-- tiempo. Un DELETE se lleva puesta la propiedad, sus fotos, sus servicios y sus
-- notas privadas por las claves foráneas en cascada, y no hay vuelta atrás sin
-- backup. Con esto, recuperar es un UPDATE de una línea (al final del archivo).
--
-- IMPORTANTE — esto también cambia las policies:
--
-- No alcanza con filtrar en la consulta del sitio. Si una propiedad archivada
-- sigue con `published = true`, cualquiera que arme la consulta a mano la vería.
-- Por eso el filtro va en RLS, que es lo que de verdad protege.
-- ===========================================================================

-- 1. La columna --------------------------------------------------------------
alter table public.properties
  add column if not exists archived_at timestamptz;

comment on column public.properties.archived_at is
  'Si tiene fecha, la propiedad esta archivada: no se ve ni en el panel ni en la web. Nunca se borra la fila. Para recuperar: update ... set archived_at = null.';

-- Indice parcial: las consultas del sitio piden siempre `archived_at is null`.
create index if not exists properties_activas_idx
  on public.properties (published, sort_order)
  where archived_at is null;

-- 2. Las policies de lectura pública ------------------------------------------
-- Se recrean sumando `archived_at is null`. El admin sigue viendo todo, que es
-- lo que permite recuperar una propiedad archivada.

drop policy if exists "lectura publica propiedades" on public.properties;
create policy "lectura publica propiedades" on public.properties
  for select to anon, authenticated
  using ((published = true and archived_at is null) or public.is_admin());

drop policy if exists "lectura publica media" on public.property_media;
create policy "lectura publica media" on public.property_media
  for select to anon, authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.properties p
      where p.id = property_id and p.published = true and p.archived_at is null));

drop policy if exists "lectura publica servicios prop" on public.property_services;
create policy "lectura publica servicios prop" on public.property_services
  for select to anon, authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.properties p
      where p.id = property_id and p.published = true and p.archived_at is null));

-- 3. Verificación ------------------------------------------------------------
select
  count(*) filter (where archived_at is null) as activas,
  count(*) filter (where archived_at is not null) as archivadas
from public.properties;

-- ===========================================================================
-- PARA RECUPERAR UNA PROPIEDAD ARCHIVADA
--
--   select legacy_id, name, archived_at
--   from public.properties
--   where archived_at is not null
--   order by archived_at desc;
--
--   update public.properties set archived_at = null where legacy_id = <numero>;
--
-- Vuelve a aparecer en el panel al instante. Si ademas estaba publicada, vuelve
-- a la web.
-- ===========================================================================
