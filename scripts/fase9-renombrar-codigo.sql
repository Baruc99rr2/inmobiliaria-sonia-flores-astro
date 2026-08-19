-- ============================================================================
-- FASE 9 — `legacy_id` pasa a llamarse `codigo`
--
-- >>> ORDEN IMPORTANTE: correr ESTE SQL Y DESPLEGAR EL CÓDIGO JUNTOS. <<<
--
-- Entre el `alter` y el deploy hay una ventana en la que el sitio publicado
-- pide una columna que ya no existe. NO se rompe con pantalla en blanco: la
-- consulta falla, `getProperties` devuelve null y el sitio cae al fallback de
-- `data.jsx` — se ven las 20 originales y desaparecen las cargadas después.
-- Igual conviene que la ventana dure segundos, no horas.
--
-- POR QUÉ SE RENOMBRA
-- La columna se llamaba así porque la generaba la migración desde `data.jsx`.
-- Desde que hay una secuencia que la asigna sola, es la identidad pública
-- permanente de la propiedad: lo que se ve en /propiedades/N y lo que la dueña
-- usa para buscar una propiedad en el panel. Seguir llamándola "legacy" iba a
-- confundir para siempre.
--
-- POR QUÉ `codigo` Y NO `numero`
-- `properties.numero` YA EXISTE: es la altura de la calle. `codigo` está libre y
-- es la palabra que usa el rubro ("código de ficha").
-- ============================================================================

alter table public.properties rename column legacy_id to codigo;

-- El nombre de la restricción y el de la secuencia no se renombran solos.
-- Dejarlos con el nombre viejo funciona, pero el próximo que lea un error de
-- clave duplicada va a buscar una columna que no existe.
alter index if exists properties_legacy_id_key rename to properties_codigo_key;
alter sequence if exists public.properties_legacy_id_seq
  rename to properties_codigo_seq;

comment on column public.properties.codigo is
  'Número público de la propiedad: lo que va en la URL /propiedades/N y lo que se busca desde el panel. Lo asigna la secuencia properties_codigo_seq. Antes se llamaba legacy_id.';

-- La copia que guarda cada mensaje de contacto, por el mismo motivo.
alter table public.contact_messages rename column property_legacy_id to property_codigo;

comment on column public.contact_messages.property_codigo is
  'Copia del código de la propiedad por la que preguntaban. Se guarda aparte de property_id para que el mensaje siga diciendo por cuál preguntó aunque la propiedad se borre.';

-- ---------------------------------------------------------------------------
-- Verificación
-- ---------------------------------------------------------------------------
select column_name
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'properties' and column_name in ('codigo', 'legacy_id', 'numero'))
    or (table_name = 'contact_messages' and column_name in ('property_codigo', 'property_legacy_id')));

-- Tiene que devolver: codigo, numero, property_codigo. Ninguna con "legacy".

select last_value from public.properties_codigo_seq;
