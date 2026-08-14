-- ===========================================================================
-- Criterio de aceptación de la Fase 2 — plan v5 §5.5
-- Pegar entero en el SQL Editor de Supabase y correr.
-- ===========================================================================
--
-- Compara lo migrado contra la tabla §5.5, fila por fila. La columna `estado`
-- dice 'ok' o lista exactamente qué campo no coincide.
--
-- La id 19 NO está en §5.5 (se agregó después de escribir el plan): aparece al
-- final, en el bloque 2, con sus valores para revisar a ojo contra data.jsx.
-- ===========================================================================

-- ------------------------------------------------------------------
-- BLOQUE 1 — las 18 propiedades originales contra §5.5
-- ------------------------------------------------------------------
with esperado (legacy_id, price, tipo, localidad, barrio, servicios) as (
  values
    ( 1, 480000::numeric, 'departamento', 'san-salvador-de-jujuy', 'los-perales',     array[]::text[]),
    ( 2, null,            'casa',         'san-salvador-de-jujuy', 'centro',          array[]::text[]),
    ( 3, 650000,          'local',        'palpala',               null,              array[]::text[]),
    ( 4, null,            'oficina',      'san-salvador-de-jujuy', 'centro',          array['agua','cloaca','luz']),
    ( 5, null,            'galpon',       'san-salvador-de-jujuy', 'alto-comedero',   array['agua','cloaca','luz','pavimento']),
    ( 6, null,            'departamento', 'san-salvador-de-jujuy', 'centro',          array['agua','cloaca','gas','luz','pavimento']),
    ( 7, 400000,          'departamento', 'san-salvador-de-jujuy', 'cuyaya',          array['agua','cloaca','gas','luz','pavimento']),
    ( 8, 350000,          'oficina',      'san-salvador-de-jujuy', 'centro',          array['agua','luz','wifi']),
    ( 9, 700000,          'departamento', 'san-salvador-de-jujuy', 'los-perales',     array['agua','cloaca','gas','luz','pavimento']),
    (10, null,            'casa',         'san-salvador-de-jujuy', 'chijra',          array['agua','cloaca','gas','luz','pavimento']),
    (11, null,            'terreno',      'san-antonio',           null,              array[]::text[]),
    (12, 580000,          'casa',         'san-salvador-de-jujuy', null,              array['agua','gas','luz']),
    (13, null,            'local',        'san-salvador-de-jujuy', 'almirante-brown', array['agua','luz']),
    (14, null,            'nave',         'san-salvador-de-jujuy', 'san-pedrito',     array['agua']),
    (15, 620000,          'departamento', 'san-salvador-de-jujuy', 'gorriti',         array[]::text[]),
    (16, null,            'departamento', 'san-salvador-de-jujuy', 'centro',          array['agua','cloaca','gas','luz','pavimento','wifi']),
    (17, null,            'departamento', 'san-salvador-de-jujuy', 'los-perales',     array['agua','cloaca','gas','luz','pavimento','wifi']),
    (18, 200000,          'local',        'palpala',               null,              array['agua','cloaca','luz','pavimento'])
),
real as (
  select
    p.legacy_id,
    p.price,
    pt.slug                                        as tipo,
    l.slug                                         as localidad,
    n.slug                                         as barrio,
    coalesce(
      (select array_agg(s.slug order by s.slug)
         from property_services ps
         join services s on s.id = ps.service_id
        where ps.property_id = p.id),
      array[]::text[]
    )                                              as servicios,
    p.hide_location,
    p.price_from,
    p.superficie_m2,
    p.cocheras, p.dormitorios, p.banos, p.expensas,
    (select count(*) from property_media m where m.property_id = p.id)                    as media,
    (select m.kind from property_media m where m.property_id = p.id order by m.sort_order limit 1) as portada
  from properties p
  left join property_types pt on pt.id = p.property_type_id
  left join localidades    l  on l.id  = p.localidad_id
  left join neighborhoods  n  on n.id  = p.neighborhood_id
)
select
  e.legacy_id                                                as id,
  coalesce(r.price::text, 'NULL')                            as precio,
  r.tipo,
  r.localidad,
  coalesce(r.barrio, '—')                                    as barrio,
  array_to_string(r.servicios, ', ')                         as servicios,
  r.media                                                    as archivos,
  r.portada,
  case
    when r.legacy_id is null then '❌ FALTA en la base'
    else nullif(trim(both ' | ' from concat_ws(' | ',
      case when r.price      is distinct from e.price     then 'precio'    end,
      case when r.tipo       is distinct from e.tipo      then 'tipo'      end,
      case when r.localidad  is distinct from e.localidad then 'localidad' end,
      case when r.barrio     is distinct from e.barrio    then 'barrio'    end,
      case when r.servicios  is distinct from e.servicios then 'servicios' end,
      case when e.legacy_id = 12 and not r.hide_location  then 'hide_location' end,
      case when e.legacy_id = 18 and not r.price_from     then 'price_from'    end,
      case when r.portada is distinct from 'image'        then 'portada NO es imagen' end
    )), '')
  end                                                        as estado
from esperado e
left join real r using (legacy_id)
order by e.legacy_id;
-- Esperado: 18 filas, todas con `estado` vacío (NULL).


-- ------------------------------------------------------------------
-- BLOQUE 2 — resumen de las reglas que §5.5 enuncia en prosa
-- ------------------------------------------------------------------
select 'superficies con valor (esperado: 3, 5, 11)' as regla,
       array_agg(legacy_id order by legacy_id)::text as ids
  from properties where superficie_m2 is not null and legacy_id <= 18
union all
select 'cocheras = 0 (esperado: 3,8,12,13,14,15,16,18)',
       array_agg(legacy_id order by legacy_id)::text
  from properties where cocheras = 0 and legacy_id <= 18
union all
select 'dormitorios = 0 (esperado: 4,8,13,14,18)',
       array_agg(legacy_id order by legacy_id)::text
  from properties where dormitorios = 0 and legacy_id <= 18
union all
select 'banos = 0 (esperado: 14)',
       array_agg(legacy_id order by legacy_id)::text
  from properties where banos = 0 and legacy_id <= 18
union all
select 'expensas NOT NULL (esperado: ninguna)',
       coalesce(array_agg(legacy_id order by legacy_id)::text, '{}')
  from properties where expensas is not null
union all
select 'hide_location = true (esperado: 12 y 19)',
       array_agg(legacy_id order by legacy_id)::text
  from properties where hide_location
union all
select 'price = 0 (esperado: ninguna — regla dura 11)',
       coalesce(array_agg(legacy_id order by legacy_id)::text, '{}')
  from properties where price = 0
union all
select 'portada que NO es imagen (esperado: ninguna)',
       coalesce(array_agg(p.legacy_id order by p.legacy_id)::text, '{}')
  from properties p
  where (select m.kind from property_media m
          where m.property_id = p.id order by m.sort_order limit 1) <> 'image'
union all
select 'total de propiedades (esperado: 19)', count(*)::text from properties
union all
select 'calle con el centinela "A consultar" (esperado: ninguna)',
       coalesce(array_agg(legacy_id order by legacy_id)::text, '{}')
  from properties where calle ilike 'a consultar';


-- ------------------------------------------------------------------
-- BLOQUE 3 — la id 19, que no está en §5.5. Revisar contra data.jsx.
-- ------------------------------------------------------------------
select
  p.legacy_id, p.name,
  coalesce(p.price::text,'NULL')  as precio,
  pt.legacy_label                 as tipo_legacy,
  l.slug                          as localidad,
  coalesce(n.slug,'—')            as barrio,
  p.hide_location, p.calle,
  p.cocheras, p.ambientes, p.dormitorios, p.banos,
  coalesce(p.superficie_m2::text,'NULL') as superficie,
  coalesce(p.frente_m::text,'NULL')      as frente,
  coalesce(p.fondo_m::text,'NULL')       as fondo,
  coalesce(p.expensas::text,'NULL')      as expensas,
  p.lat, p.lon,
  (select array_agg(s.slug order by s.slug) from property_services ps
     join services s on s.id = ps.service_id where ps.property_id = p.id) as servicios,
  (select array_agg(m.kind order by m.sort_order) from property_media m
     where m.property_id = p.id) as media
from properties p
left join property_types pt on pt.id = p.property_type_id
left join localidades    l  on l.id  = p.localidad_id
left join neighborhoods  n  on n.id  = p.neighborhood_id
where p.legacy_id = 19;
-- Esperado según data.jsx: precio NULL, tipo_legacy 'Casa', localidad
-- san-salvador-de-jujuy, barrio —, hide_location true, calle vacía,
-- cocheras 2, ambientes 4, dormitorios 2, banos 2,
-- superficie/frente/fondo en NULL, expensas NULL, lat/lon NULL,
-- servicios {agua,cloaca,gas,luz,pavimento}, media {image,video}.
