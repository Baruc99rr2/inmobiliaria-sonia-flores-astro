-- ============================================================================
-- Numeración automática de propiedades
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE.
--
-- EL BUG QUE ARREGLA
-- Las URLs públicas son /propiedades/<legacy_id>. Ese número lo ponía la
-- migración desde `data.jsx`, así que solo lo tenían las 20 propiedades
-- migradas. Una propiedad creada desde el panel nacía con `legacy_id` en NULL y
-- todos los enlaces del sitio salían `/propiedades/null`: aparecía en el
-- listado pero su ficha no existía.
--
-- LA SOLUCIÓN
-- Una secuencia que le pone el número sola. La dueña no tiene que pensar en
-- eso, y no hay forma de que se olvide de cargarlo ni de que dos altas
-- simultáneas choquen: `nextval()` es atómico y además la columna ya tiene una
-- restricción `unique` (comprobado: insertar un legacy_id repetido devuelve
-- "duplicate key value violates unique constraint properties_legacy_id_key").
--
-- Arranca en 21 porque el máximo actual es 20.
-- ============================================================================

-- `owned by` ata la secuencia a la columna: si la columna se renombra en la
-- Fase 9, la secuencia la sigue sin quedar huérfana.
create sequence if not exists public.properties_legacy_id_seq
  as integer
  owned by public.properties.legacy_id;

-- Se posiciona en el máximo que ya existe, así el próximo `nextval()` da 21.
-- `greatest(..., 20)` cubre el caso de correr esto sobre una base vacía.
select setval(
  'public.properties_legacy_id_seq',
  greatest(coalesce((select max(legacy_id) from public.properties), 20), 20),
  true
);

-- Las que ya nacieron sin número (hoy: la que cargó el dev desde el panel).
update public.properties
set legacy_id = nextval('public.properties_legacy_id_seq')
where legacy_id is null;

alter table public.properties
  alter column legacy_id set default nextval('public.properties_legacy_id_seq');

-- Con el default puesto y las viejas completadas, "propiedad sin número" pasa a
-- ser imposible. Es la garantía de que no vuelva a aparecer un /propiedades/null.
alter table public.properties
  alter column legacy_id set not null;

comment on column public.properties.legacy_id is
  'Número público de la propiedad. Es lo que va en la URL /propiedades/N. Lo asigna la secuencia properties_legacy_id_seq. El nombre queda por historia: se renombra a `codigo` en la Fase 9.';

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select count(*) as total,
       count(legacy_id) as con_numero,
       min(legacy_id) as menor,
       max(legacy_id) as mayor
from public.properties;

select last_value as proximo_numero from public.properties_legacy_id_seq;
