-- ============================================================================
-- FASE 7b — Permisos del bucket `propiedades` y medidor de uso
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE.
--
-- Estado de partida (verificado con la API antes de escribir esto):
--   - El bucket `propiedades` existe, es público, tope 50 MB por archivo y
--     acepta image/jpeg, image/png, image/webp y video/mp4.
--   - RLS ya bloquea a `anon`: subir un PNG válido devuelve
--     "new row violates row-level security policy".
--   - PERO no hay ninguna policy para `authenticated`, así que hoy la dueña
--     tampoco puede subir. Eso es lo que arregla este script.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Lectura
--
-- El bucket es público, así que las URLs públicas se sirven sin pasar por acá.
-- Igual se declara el SELECT para que `list()` funcione desde el panel.
-- ---------------------------------------------------------------------------
drop policy if exists "propiedades lectura publica" on storage.objects;
create policy "propiedades lectura publica"
  on storage.objects for select
  using (bucket_id = 'propiedades');

-- ---------------------------------------------------------------------------
-- 2. Escritura: SOLO admins
--
-- Igual que en el resto del proyecto, lo que protege es RLS y no el guard del
-- router. Un `authenticated` que no esté en `admins` no puede subir ni borrar.
-- ---------------------------------------------------------------------------
drop policy if exists "propiedades sube un admin" on storage.objects;
create policy "propiedades sube un admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'propiedades'
    and exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists "propiedades actualiza un admin" on storage.objects;
create policy "propiedades actualiza un admin"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'propiedades'
    and exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

drop policy if exists "propiedades borra un admin" on storage.objects;
create policy "propiedades borra un admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'propiedades'
    and exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3. Medidor de uso
--
-- El plan gratuito da 1 GB de storage en total. Queremos avisar ANTES de que
-- falle una subida, no después.
--
-- Se hace con una función y no sumando desde el cliente porque listar el bucket
-- entero por HTTP para sumar tamaños es lento y pagina de a 100. Acá es un
-- `sum()` sobre una tabla indexada.
--
-- OJO CON EL NOMBRE. La primera versión se llamaba `uso_de_storage`, y al
-- probarla apareció que en esta base YA EXISTE una función con ese nombre: al
-- llamarla, Postgres responde "permission denied for function uso_de_storage"
-- en vez del "Could not find the function ... in the schema cache" que devuelve
-- una que no existe. Como el script usaba `create or replace`, la habría
-- pisado sin avisar. Se renombró a `uso_bucket_propiedades`.
-- >>> Queda pendiente que el dev averigüe qué es la otra y de dónde salió. <<<
--
-- `security definer` porque `storage.objects` no es consultable directamente
-- por `authenticated`; la función expone SOLO el total, no los archivos. El
-- `search_path` fijo es la precaución estándar para `security definer`.
-- ---------------------------------------------------------------------------
create or replace function public.uso_bucket_propiedades()
returns table (archivos bigint, bytes bigint)
language sql
security definer
set search_path = storage, public
as $$
  select count(*)::bigint,
         coalesce(sum((metadata->>'size')::bigint), 0)::bigint
  from storage.objects
  where bucket_id = 'propiedades';
$$;

comment on function public.uso_bucket_propiedades is
  'Cuántos archivos y cuántos bytes ocupa el bucket propiedades. Para avisar antes de llegar al límite del plan gratuito (1 GB).';

revoke all on function public.uso_bucket_propiedades() from public, anon;
grant execute on function public.uso_bucket_propiedades() to authenticated;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select * from public.uso_bucket_propiedades();

select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'propiedades%'
order by policyname;
