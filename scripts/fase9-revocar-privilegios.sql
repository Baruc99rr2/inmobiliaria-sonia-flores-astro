-- ============================================================================
-- FASE 9 — Quitarle a `anon` privilegios que nunca necesitó
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE.
--
-- Es el ítem 12 del §12, detectado en la Fase 0 y postergado hasta acá.
--
-- QUÉ TAN GRAVE ES, CON PRECISIÓN
-- `anon` tiene TRUNCATE, REFERENCES y TRIGGER sobre todas las tablas de
-- `public`, incluidas `admins` y `property_notes`. Vienen de los privilegios
-- por defecto del proyecto de Supabase, no de nuestros scripts.
--
-- La exposición REAL es menor de lo que suena, y conviene decirlo con todas las
-- letras en vez de exagerar: la clave pública se usa contra PostgREST, y
-- PostgREST solo emite SELECT, INSERT, UPDATE, DELETE y RPC. No puede emitir
-- TRUNCATE. Comprobado además que RLS ya bloquea lo que sí puede intentar:
--
--   anon SELECT sobre admins -> permission denied for table admins
--   anon DELETE sobre admins -> permission denied for table admins
--
-- O sea: hoy no hay un camino conocido para explotarlo. Pero TRUNCATE **no
-- pasa por RLS**, así que si mañana aparece cualquier vía que ejecute SQL como
-- `anon` —una función `security invoker` mal escrita, una extensión, un cambio
-- de PostgREST— la única barrera sería este privilegio. Se quita porque no se
-- usa para nada, no porque haya un incendio.
-- ============================================================================

-- Lo que anon SÍ necesita y NO se toca:
--   SELECT sobre properties, property_types, localidades, neighborhoods,
--          property_media, services, property_services, site_settings
--   INSERT sobre contact_messages
revoke truncate, references, trigger
  on all tables in schema public
  from anon;

-- `authenticated` es la sesión de la dueña. Tampoco crea tablas ni triggers:
-- edita filas. Mismo criterio.
revoke truncate, references, trigger
  on all tables in schema public
  from authenticated;

-- Sin esto, la PRÓXIMA tabla que se cree vuelve a nacer con los mismos
-- privilegios y el arreglo dura hasta la siguiente migración.
alter default privileges in schema public
  revoke truncate, references, trigger on tables from anon;
alter default privileges in schema public
  revoke truncate, references, trigger on tables from authenticated;

-- ---------------------------------------------------------------------------
-- Verificación
--
-- La primera consulta tiene que devolver CERO filas.
-- La segunda muestra lo que queda, que es lo que el sitio necesita para andar.
-- ---------------------------------------------------------------------------
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')
order by grantee, table_name;

select grantee, table_name, string_agg(privilege_type, ', ' order by privilege_type) as privilegios
from information_schema.role_table_grants
where table_schema = 'public' and grantee = 'anon'
group by grantee, table_name
order by table_name;
