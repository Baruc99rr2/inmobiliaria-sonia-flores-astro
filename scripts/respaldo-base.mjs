/**
 * Respaldo completo de la base, a archivos JSON locales.
 *
 * >>> CORRERLO ANTES DE BORRAR `data.jsx`. <<<
 *
 * Hasta ahora `data.jsx` funcionaba de red de seguridad: si Supabase se caía o
 * alguien borraba algo, el archivo tenía las 20 propiedades originales. Esa red
 * se retira en la Fase 9 porque generaba el conflicto de las dos fuentes de
 * verdad —correr la migración pisaba lo cargado desde el panel, y ya mordió dos
 * veces—. Pero retirarla sin poner otra en su lugar sería peor que el problema
 * que resuelve.
 *
 * Este respaldo NO reemplaza a los backups automáticos de Supabase, que son los
 * que sirven para restaurar de verdad. Es el respaldo de mano: un archivo que se
 * puede abrir, leer y del que se puede reinsertar una fila puntual sin
 * restaurar toda la base.
 *
 * Uso:
 *   node --env-file=.env scripts/respaldo-base.mjs
 *
 * Deja los archivos en `respaldos/AAAA-MM-DD-HHmm/`, que está en .gitignore:
 * son datos reales de una persona y no van al repositorio.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Todo lo que no se puede volver a generar desde el código.
const TABLAS = [
  'properties',
  'property_media',
  'property_services',
  'property_types',
  'localidades',
  'neighborhoods',
  'services',
  'site_settings',
  'property_notes',
  'agenda_notes',
  'contact_messages',
  'admins',
];

const ahora = new Date();
const sello =
  `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-` +
  `${String(ahora.getDate()).padStart(2, '0')}-${String(ahora.getHours()).padStart(2, '0')}` +
  `${String(ahora.getMinutes()).padStart(2, '0')}`;

const carpeta = new URL(`../respaldos/${sello}/`, import.meta.url);
mkdirSync(carpeta, { recursive: true });

console.log('=== RESPALDO DE LA BASE ===');
console.log('destino:', decodeURIComponent(carpeta.pathname.replace(/^\//, '')));
console.log('');

let fallos = 0;
const resumen = {};

for (const tabla of TABLAS) {
  // Se pagina: `select()` sin rango trae 1000 filas como mucho, y un respaldo
  // que corta en silencio a las 1000 es peor que no tener respaldo.
  const filas = [];
  let desde = 0;
  const paso = 1000;

  for (;;) {
    const { data, error } = await sb.from(tabla).select('*').range(desde, desde + paso - 1);
    if (error) {
      console.log(`  FALLA ${tabla.padEnd(20)} ${error.message}`);
      fallos++;
      break;
    }
    filas.push(...(data ?? []));
    if ((data ?? []).length < paso) break;
    desde += paso;
  }

  writeFileSync(new URL(`${tabla}.json`, carpeta), JSON.stringify(filas, null, 2), 'utf8');
  resumen[tabla] = filas.length;
  console.log(`  OK   ${tabla.padEnd(20)} ${String(filas.length).padStart(5)} filas`);
}

writeFileSync(
  new URL('_resumen.json', carpeta),
  JSON.stringify({ fecha: ahora.toISOString(), tablas: resumen }, null, 2),
  'utf8'
);

console.log('');
console.log(fallos === 0 ? 'RESPALDO COMPLETO' : `${fallos} TABLAS FALLARON — revisar antes de seguir`);
console.log('');
console.log('RECORDATORIO: esto NO reemplaza los backups automáticos de Supabase.');
console.log('Verificalos en el panel: Project Settings > Database > Backups.');
console.log('En el plan gratuito hay backups diarios con retención corta; si el');
console.log('proyecto es importante, conviene el plan que los conserva más tiempo.');

process.exit(fallos === 0 ? 0 : 1);
