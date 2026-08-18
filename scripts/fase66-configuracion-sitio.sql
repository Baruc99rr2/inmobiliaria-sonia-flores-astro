-- ============================================================================
-- FASE 6.6 — Datos de contacto del sitio
--
-- CORRÉ ESTO EN EL SQL EDITOR DE SUPABASE.
--
-- Por qué existe: el teléfono, el horario y la matrícula estaban escritos a
-- mano en cuatro lugares del código (el texto de compartir de la ficha, el
-- `description` del Layout, el de index.astro, y adentro de la descripción de
-- la propiedad 18). La dueña no podía cambiar su propio teléfono sin un
-- desarrollador, y al compartir la 18 los datos salían duplicados.
--
-- Es UNA SOLA FILA. El `check (id = 1)` lo garantiza a nivel de base: no hay
-- forma de terminar con dos configuraciones y que el sitio elija mal.
-- ============================================================================

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  telefono   text not null default '',
  horario    text not null default '',
  matricula  text not null default '',
  email      text not null default '',
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is
  'Datos de contacto del sitio. Una sola fila (id = 1). Los edita la dueña desde Catálogos.';

-- Valores actuales, tomados de lo que hoy está hardcodeado en el código.
-- No son datos inventados: son los que ya se muestran en producción.
insert into public.site_settings (id, telefono, horario, matricula, email)
values (
  1,
  '3884881245',
  'de 9 a 13 y de 16 a 18 hs',
  'MP 177',
  ''
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
--
-- Lectura pública: son datos de contacto, están para que los vean. El sitio los
-- lee con la publishable key.
-- Escritura: solo quien esté en `admins`.
-- ---------------------------------------------------------------------------
alter table public.site_settings enable row level security;

drop policy if exists "configuracion lectura publica" on public.site_settings;
create policy "configuracion lectura publica"
  on public.site_settings for select
  using (true);

drop policy if exists "configuracion la edita un admin" on public.site_settings;
create policy "configuracion la edita un admin"
  on public.site_settings for update
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
  with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

-- No se otorga INSERT ni DELETE a propósito: la fila ya existe y no tiene que
-- poder borrarse ni duplicarse desde el panel.
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select id, telefono, horario, matricula, email from public.site_settings;
