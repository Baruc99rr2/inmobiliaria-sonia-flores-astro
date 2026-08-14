-- ===========================================================================
-- FASE 1 — GRANTs que faltaron. Correr en el SQL Editor de Supabase.
-- ===========================================================================
--
-- POR QUÉ HACE FALTA
-- ------------------
-- RLS y GRANT son dos capas distintas y las dos tienen que estar:
--
--   GRANT  = "este rol puede tocar esta tabla"      (privilegio de Postgres)
--   RLS    = "y solo ve/modifica estas filas"       (policy)
--
-- Las policies de la Fase 1 están bien, pero sin GRANT los roles de la API
-- (`anon`, `authenticated`, `service_role`) no tienen privilegio base sobre las
-- tablas, así que PostgREST corta antes de evaluar ninguna policy y devuelve:
--
--   42501  permission denied for table <tabla>
--
-- Se nota en que fallaba incluso con la secret key, que saltea RLS: si el
-- problema fuera RLS, la secret key habría funcionado y `anon` habría recibido
-- cero filas en vez de un error.
--
-- SEGURIDAD
-- ---------
-- Los GRANT de abajo son deliberadamente acotados, no un `grant all on all
-- tables`. En particular:
--   - `anon` NO recibe ningún privilegio sobre `property_notes` ni `admins`.
--     Doble candado: sin GRANT y sin policy de select.
--   - `anon` solo recibe SELECT. Nunca insert, update ni delete.
--   - quién puede escribir de verdad lo sigue decidiendo `public.is_admin()`
--     dentro de las policies.
-- ===========================================================================

-- 1. Acceso al esquema -------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

-- 2. Catálogos: lectura pública (tienen policy `using (true)`) ---------------
grant select on table public.property_types to anon, authenticated;
grant select on table public.localidades    to anon, authenticated;
grant select on table public.neighborhoods  to anon, authenticated;
grant select on table public.services       to anon, authenticated;

-- 3. Sitio público: lectura. RLS filtra por published = true -----------------
grant select on table public.properties        to anon, authenticated;
grant select on table public.property_media    to anon, authenticated;
grant select on table public.property_services to anon, authenticated;

-- 4. Panel (Fase 6): escritura para usuarios logueados.
--    La policy exige public.is_admin(), así que un autenticado que no esté en
--    `admins` sigue sin poder hacer nada.
grant insert, update, delete on table public.properties        to authenticated;
grant insert, update, delete on table public.property_media    to authenticated;
grant insert, update, delete on table public.property_services to authenticated;
grant insert, update, delete on table public.property_types    to authenticated;
grant insert, update, delete on table public.localidades       to authenticated;
grant insert, update, delete on table public.neighborhoods     to authenticated;
grant insert, update, delete on table public.services          to authenticated;

-- 5. Notas privadas: NADA para anon. Solo authenticated + is_admin() ---------
grant select, insert, update, delete on table public.property_notes to authenticated;

-- 6. admins: cada uno se lee a sí mismo --------------------------------------
grant select on table public.admins to authenticated;

-- 7. Secuencias. Los catálogos son `serial`: sin esto, el panel no puede
--    agregar un barrio o un servicio nuevo.
grant usage, select on all sequences in schema public to authenticated, service_role;

-- 8. service_role: todo. Es el rol de la secret key, que usa el script de
--    migración local.
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- 9. Que las tablas futuras hereden esto y no repitamos este problema --------
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;


-- ===========================================================================
-- VERIFICACIÓN — correr después y revisar a ojo
-- ===========================================================================
select
  table_name                                                  as tabla,
  string_agg(distinct grantee || ':' || privilege_type, ', '
             order by grantee || ':' || privilege_type)       as privilegios
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_name
order by table_name;

-- Esperado:
--   property_notes / admins  -> SIN ninguna fila de `anon`
--   el resto                 -> anon:SELECT presente
--   todas                    -> service_role con todo

-- Y que RLS siga activa en las 9 tablas:
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
-- Esperado: rowsecurity = true en las 9.
