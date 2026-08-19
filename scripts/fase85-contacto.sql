-- ============================================================================
-- FASE 8.5a — Mensajes de contacto en la base, en vez de Web3Forms
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE.
--
-- Esta tabla es distinta de todas las demás del proyecto: `anon` PUEDE
-- insertar. Es la única forma de que el formulario público siga funcionando sin
-- que el visitante inicie sesión. Por eso todo lo que sigue está pensado
-- asumiendo que cualquiera puede escribir acá.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- LOS CAMPOS SON LOS QUE EL FORMULARIO YA PIDE
--
-- El plan v5 hablaba de "nombre, contacto, mensaje". El formulario real
-- (`Footer.jsx`) pide seis cosas: nombre, email, teléfono, ciudad, asunto y
-- mensaje. El asunto es un select de cuatro opciones que separa propietarios de
-- buscadores, que es lo que le sirve a la dueña para saber a quién llamar
-- primero. Colapsarlos en un campo "contacto" tiraría datos que ya se están
-- recolectando hoy.
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null,
  email      text not null default '',
  telefono   text not null default '',
  ciudad     text not null default '',
  asunto     text not null default '',
  mensaje    text not null,

  -- De qué propiedad venía, si el visitante estaba en una ficha.
  -- `on delete set null`: si después se borra la propiedad, el mensaje se
  -- queda. Es una consulta de una persona real y no se tira porque la
  -- publicación haya cambiado.
  property_id        uuid references public.properties(id) on delete set null,
  -- El id visible de esa propiedad, guardado aparte para que el mensaje siga
  -- diciendo "preguntó por la 14" aunque la fila ya no exista.
  property_legacy_id integer,

  leido      boolean not null default false,
  -- Hash de la IP, NO la IP. Alcanza para contar cuántos mensajes mandó el
  -- mismo origen en los últimos minutos, y no guarda un identificador de una
  -- persona que solo quiso preguntar por un alquiler.
  ip_hash    text,
  created_at timestamptz not null default now()
);

comment on table public.contact_messages is
  'Consultas del formulario público. anon puede insertar; solo admin puede leer.';

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);
create index if not exists contact_messages_leido_idx
  on public.contact_messages (leido, created_at desc);

-- ---------------------------------------------------------------------------
-- LÍMITE DE ENVÍOS, DEL LADO DEL SERVIDOR
--
-- Web3Forms hacía esto por nosotros. Hacerlo en JavaScript no sirve: se saltea
-- abriendo la consola del navegador. Tiene que estar acá.
--
-- Supabase expone las cabeceras de la petición en `request.headers`, así que se
-- puede leer el `x-forwarded-for` y contar cuántos mensajes llegaron de ese
-- mismo origen. Se guarda el hash y nunca la IP.
--
-- El tope es deliberadamente holgado: una pareja mirando propiedades desde la
-- misma casa comparte IP, y dos consultas seguidas por dos inmuebles distintos
-- son un uso legítimo. Lo que corta es el envío automatizado.
-- ---------------------------------------------------------------------------
create or replace function public.contact_messages_guardia()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cabeceras json;
  ip        text;
  recientes integer;
begin
  begin
    cabeceras := current_setting('request.headers', true)::json;
  exception when others then
    cabeceras := null;
  end;

  ip := coalesce(
    split_part(cabeceras->>'x-forwarded-for', ',', 1),
    cabeceras->>'cf-connecting-ip',
    ''
  );

  if ip <> '' then
    -- `md5` con una sal fija: no es criptografía, es para no guardar la IP en
    -- claro pudiendo igual agrupar por origen.
    new.ip_hash := md5('sf-contacto-v1|' || ip);

    select count(*) into recientes
    from public.contact_messages m
    where m.ip_hash = new.ip_hash
      and m.created_at > now() - interval '10 minutes';

    if recientes >= 5 then
      raise exception 'demasiados mensajes seguidos'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists contact_messages_guardia_trg on public.contact_messages;
create trigger contact_messages_guardia_trg
  before insert on public.contact_messages
  for each row execute function public.contact_messages_guardia();

-- ---------------------------------------------------------------------------
-- RLS
--
-- INSERT abierto a anon, pero con condiciones: sin ellas, cualquiera podría
-- meter un mensaje de 10 MB o un millón de filas vacías. Los topes de largo son
-- parte de la barrera, no una validación de formulario.
--
-- SIN policy de SELECT para anon: quien manda un mensaje no puede leer los de
-- los demás. Es la misma regla que en `property_notes` y `agenda_notes`.
-- ---------------------------------------------------------------------------
alter table public.contact_messages enable row level security;

drop policy if exists "contacto inserta cualquiera" on public.contact_messages;
create policy "contacto inserta cualquiera"
  on public.contact_messages for insert
  to anon, authenticated
  with check (
    length(trim(nombre))  between 1 and 120
    and length(trim(mensaje)) between 1 and 4000
    and length(email)    <= 200
    and length(telefono) <= 60
    and length(ciudad)   <= 120
    and length(asunto)   <= 200
    -- Nadie puede insertar un mensaje ya marcado como leído: si no, un bot
    -- podría mandarlos "leídos" y la dueña no los vería nunca.
    and leido = false
  );

drop policy if exists "contacto lo lee un admin" on public.contact_messages;
create policy "contacto lo lee un admin"
  on public.contact_messages for select
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "contacto lo marca un admin" on public.contact_messages;
create policy "contacto lo marca un admin"
  on public.contact_messages for update
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "contacto lo borra un admin" on public.contact_messages;
create policy "contacto lo borra un admin"
  on public.contact_messages for delete
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

revoke all on public.contact_messages from anon, public;
grant insert on public.contact_messages to anon;
grant select, insert, update, delete on public.contact_messages to authenticated;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'contact_messages'
order by policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_name = 'contact_messages'
order by grantee, privilege_type;
