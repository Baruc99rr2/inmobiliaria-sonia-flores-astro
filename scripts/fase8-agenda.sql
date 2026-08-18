-- ============================================================================
-- FASE 8b — Agenda: recordatorios sueltos por día
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE.
--
-- Son las notas que NO son de una propiedad puntual: "llamó tal dueño",
-- "visitar la casa de Cuyaya el jueves". Mismo criterio de privacidad que
-- `property_notes`: ninguna policy de lectura para `anon`, solo admin.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- UNA NOTA POR DÍA, GARANTIZADO POR LA BASE
--
-- `dia` es la clave primaria. No es un detalle de estilo: `property_notes` no
-- tiene esa restricción y por eso el código de la Fase 8a tiene que leer "la
-- más reciente" y arreglárselas si aparecieran dos filas. Acá el problema no
-- puede existir, y el guardado se resuelve con un `upsert` limpio.
--
-- Es `date` y no `timestamptz`: un recordatorio es de un día, no de un
-- instante. Con `timestamptz` habría que decidir en qué huso cae el día, y en
-- Jujuy eso significaría notas que "saltan" de día según la hora en que se
-- escribieron.
-- ---------------------------------------------------------------------------
create table if not exists public.agenda_notes (
  dia        date primary key,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.agenda_notes is
  'Recordatorios sueltos por día, privados. Una sola nota por día; los renglones los separa quien escribe.';

-- Reusa el trigger de la Fase 1, que ya existe.
drop trigger if exists agenda_notes_touch on public.agenda_notes;
create trigger agenda_notes_touch before update on public.agenda_notes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: solo admin, en TODO
--
-- Sin ninguna policy para `anon`. Al no haber policy de select, `anon` no ve
-- ni una fila — y como además no se le otorga el privilegio de tabla, la
-- respuesta es "permission denied", igual que con `property_notes`.
-- ---------------------------------------------------------------------------
alter table public.agenda_notes enable row level security;

drop policy if exists "agenda solo admin" on public.agenda_notes;
create policy "agenda solo admin"
  on public.agenda_notes for all
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

revoke all on public.agenda_notes from anon, public;
grant select, insert, update, delete on public.agenda_notes to authenticated;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select tablename, rowsecurity from pg_tables where tablename = 'agenda_notes';

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'agenda_notes';

-- Tiene que devolver 0 filas y ninguna policy para anon.
select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'agenda_notes'
order by grantee, privilege_type;
