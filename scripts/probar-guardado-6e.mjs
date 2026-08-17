/**
 * Fase 6e — qué queda REALMENTE en la base para lat/lon.
 *
 * Trabaja SOLO sobre una propiedad de prueba que crea y borra. No toca ninguna
 * fila existente (regla acordada desde 6c: nada de escrituras contra los datos
 * de producción).
 *
 * Correr con:
 *   node --env-file=.env scripts/probar-guardado-6e.mjs
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const contar = async (t) => (await sb.from(t).select('*', { count: 'exact', head: true })).count;
const limpiar = async () => {
  const { data } = await sb.from('properties').select('id').like('slug', 'zz-prueba-%');
  for (const p of data ?? []) {
    await sb.from('property_services').delete().eq('property_id', p.id);
    await sb.from('properties').delete().eq('id', p.id);
  }
};

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(46)} ${JSON.stringify(obtenido)}` +
      (ok ? '' : `   <- se esperaba ${JSON.stringify(esperado)}`)
  );
};

const propsAntes = await contar('properties');
console.log('antes -> properties:', propsAntes);
await limpiar();

// --- Estado de las filas reales, sin tocarlas -------------------------------
const { data: reales } = await sb.from('properties').select('slug, lat, lon');
const conPunto = reales.filter((p) => p.lat !== null && p.lon !== null).length;
const sinPunto = reales.filter((p) => p.lat === null && p.lon === null).length;
const aMedias = reales.filter((p) => (p.lat === null) !== (p.lon === null));
console.log('\n=== COORDENADAS DE LAS FILAS EXISTENTES (solo lectura) ===');
console.log('  con las dos coordenadas :', conPunto);
console.log('  sin ninguna             :', sinPunto);
console.log('  con media coordenada    :', aMedias.length, aMedias.map((p) => p.slug).join(', '));
console.log('  tipo que devuelve la API:', typeof reales.find((p) => p.lat !== null)?.lat);

// --- Alta sin punto --------------------------------------------------------
const { data: creada, error } = await sb
  .from('properties')
  .insert({ slug: 'zz-prueba-6e', name: 'ZZ prueba 6e', operation: 'venta', published: false })
  .select('id, lat, lon')
  .single();

if (error) {
  console.log('ERROR al insertar:', error.message);
  await limpiar();
  process.exit(1);
}

console.log('\n=== ALTA SIN PUNTO ===');
chequear('lat', creada.lat, null);
chequear('lon', creada.lon, null);
console.log('       (el mapa público cae al centro de San Salvador)');

const leer = async () =>
  (await sb.from('properties').select('lat, lon').eq('id', creada.id).single()).data;

// --- Poner un punto (lo que hace arrastrar el marcador) ---------------------
await sb.from('properties').update({ lat: -24.194512, lon: -65.297338 }).eq('id', creada.id);
let fila = await leer();
console.log('\n=== MARCADOR COLOCADO ===');
chequear('lat', Number(fila.lat), -24.194512);
chequear('lon', Number(fila.lon), -65.297338);
chequear('sobreviven los 6 decimales', String(fila.lat).split('.')[1]?.length, 6);

// --- Escribir coordenadas a mano y volver a leer ----------------------------
await sb.from('properties').update({ lat: -24.1858, lon: -65.2995 }).eq('id', creada.id);
fila = await leer();
console.log('\n=== COORDENADAS ESCRITAS A MANO ===');
chequear('lat', Number(fila.lat), -24.1858);
chequear('lon', Number(fila.lon), -65.2995);

// --- Quitar el punto -------------------------------------------------------
await sb.from('properties').update({ lat: null, lon: null }).eq('id', creada.id);
fila = await leer();
console.log('\n=== "QUITAR EL PUNTO" ===');
chequear('lat vuelve a NULL', fila.lat, null);
chequear('lon vuelve a NULL', fila.lon, null);

// --- Limpieza --------------------------------------------------------------
await limpiar();
const propsDespues = await contar('properties');
console.log('\n=== LIMPIEZA ===');
console.log(
  '  properties:',
  propsDespues,
  propsDespues === propsAntes ? '(igual que antes, OK)' : '<- NO COINCIDE'
);
if (propsDespues !== propsAntes) fallos++;

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
