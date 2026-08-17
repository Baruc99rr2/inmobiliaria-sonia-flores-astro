-- ===========================================================================
-- FASE 6a — Estado comercial de la propiedad
-- ===========================================================================
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE ANTES DE USAR EL FILTRO DE ESTADO.
--
-- Por qué hace falta:
--
-- Hoy no hay forma de marcar una propiedad como alquilada o vendida. Lo único
-- que existe es `published`, que es otra cosa: sirve para ocultarla del sitio,
-- no para decir qué pasó con ella.
--
-- En la práctica ya se está usando el título para eso: las propiedades con
-- legacy_id 2 y 7 tienen el prefijo "-ALQUILADA-" escrito a mano en el nombre.
-- Eso ensucia el título en la web, en los resultados de búsqueda y en lo que se
-- comparte por WhatsApp.
--
-- Con esta columna, la dueña puede marcar el estado sin tocar el título, y más
-- adelante se puede decidir si una alquilada se sigue mostrando como referencia
-- o se esconde.
--
-- OJO: este archivo NO cambia qué se ve en el sitio público. El sitio sigue
-- filtrando solo por `published`. Mostrar u ocultar las alquiladas es una
-- decisión aparte, para tomar con la dueña.
-- ===========================================================================

-- 1. El tipo -----------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'property_status') then
    create type public.property_status as enum ('disponible', 'alquilada', 'vendida');
  end if;
end $$;

-- 2. La columna --------------------------------------------------------------
alter table public.properties
  add column if not exists estado public.property_status not null default 'disponible';

comment on column public.properties.estado is
  'Estado comercial. Es independiente de `published`: published decide si se ve en el sitio, estado dice qué pasó con la propiedad.';

create index if not exists properties_estado_idx on public.properties (estado);

-- 3. Migrar lo que hoy está escrito en el título ------------------------------
-- Las que tienen "ALQUILADA" en el nombre pasan a estado 'alquilada' y se les
-- limpia el prefijo. Se hace en una sola pasada y es idempotente.
update public.properties
set estado = 'alquilada'
where name ilike '%alquilada%'
  and estado = 'disponible';

update public.properties
set name = btrim(regexp_replace(name, '^\s*-?\s*ALQUILADA\s*-?\s*', '', 'i'))
where name ilike '-ALQUILADA-%'
   or name ilike 'ALQUILADA %';

-- 4. Verificación ------------------------------------------------------------
-- Tiene que devolver las 2 que estaban marcadas en el titulo, ya con el nombre
-- limpio, y el resto en 'disponible'.
select legacy_id, estado, name
from public.properties
order by estado desc, legacy_id;

-- No hace falta tocar GRANTs ni policies: `estado` es una columna mas de
-- `properties`, y los permisos de la Fase 1 son a nivel de tabla.
