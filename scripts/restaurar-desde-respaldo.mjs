#!/usr/bin/env node
/**
 * RESTAURACIÓN DE EMERGENCIA desde un respaldo de `scripts/respaldo-base.mjs`.
 *
 * >>> ESTO PISA DATOS. No se corre "por las dudas". <<<
 *
 * Reemplaza al viejo modo escritura de `migrate-data.mjs`, con dos diferencias
 * que son la razón de existir de este archivo:
 *
 *   1. Se alimenta del RESPALDO, que es el estado real que tenía la base —con
 *      todo lo que cargó la dueña desde el panel—, y no de `data.jsx`, que es
 *      la foto congelada de las 20 originales. Restaurar desde `data.jsx` era
 *      lo que borraba su trabajo.
 *
 *   2. Pide confirmación explícita. `--dry-run` es el modo por defecto: sin
 *      `--aplicar` no toca nada.
 *
 * Uso:
 *   node --env-file=.env scripts/restaurar-desde-respaldo.mjs respaldos/2026-08-18-2133
 *   node --env-file=.env scripts/restaurar-desde-respaldo.mjs respaldos/2026-08-18-2133 --aplicar
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const APLICAR = process.argv.includes('--aplicar');
const carpeta = process.argv[2];

if (!carpeta || carpeta.startsWith('--')) {
  console.error('Falta la carpeta del respaldo.\n');
  console.error('  node --env-file=.env scripts/restaurar-desde-respaldo.mjs respaldos/<carpeta>');
  if (existsSync('respaldos')) {
    const hay = readdirSync('respaldos').sort().reverse().slice(0, 5);
    if (hay.length) console.error('\nRespaldos disponibles:\n  ' + hay.join('\n  '));
  }
  process.exit(1);
}

if (!existsSync(carpeta)) {
  console.error(`No existe la carpeta ${carpeta}`);
  process.exit(1);
}

/**
 * El ORDEN IMPORTA: primero las tablas de las que dependen las otras.
 * `properties` referencia a tipos, localidades y barrios; `property_media` y
 * `property_services` referencian a `properties`. Restaurar al revés falla por
 * clave foránea a mitad de camino y deja la base peor que antes.
 */
const ORDEN = [
  'property_types',
  'localidades',
  'neighborhoods',
  'services',
  'site_settings',
  'properties',
  'property_media',
  'property_services',
  'property_notes',
  'agenda_notes',
  'contact_messages',
];

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== RESTAURACIÓN DESDE RESPALDO ===');
console.log('origen:', carpeta);
console.log('modo  :', APLICAR ? '*** APLICAR: VA A PISAR DATOS ***' : 'en seco (sin --aplicar no toca nada)');
console.log('');

let fallos = 0;

for (const tabla of ORDEN) {
  const archivo = path.join(carpeta, `${tabla}.json`);
  if (!existsSync(archivo)) {
    console.log(`  --   ${tabla.padEnd(20)} sin archivo en el respaldo, se saltea`);
    continue;
  }

  const filas = JSON.parse(readFileSync(archivo, 'utf8'));
  const { count: actuales } = await sb.from(tabla).select('*', { count: 'exact', head: true });

  console.log(
    `  ${tabla.padEnd(20)} respaldo: ${String(filas.length).padStart(5)}  |  ahora en la base: ${String(actuales ?? 0).padStart(5)}`
  );

  if (!APLICAR || filas.length === 0) continue;

  // `upsert` y no `delete` + `insert`: borrar primero deja una ventana en la
  // que, si el insert falla, la tabla queda VACÍA. Con upsert, en el peor caso
  // quedan filas viejas conviviendo con las restauradas, que es recuperable.
  const { error } = await sb.from(tabla).upsert(filas);
  if (error) {
    console.log(`       ERROR: ${error.message}`);
    fallos++;
  }
}

console.log('');
if (!APLICAR) {
  console.log('Nada se modificó. Para restaurar de verdad, repetí con --aplicar.');
} else {
  console.log(fallos === 0 ? 'RESTAURACIÓN TERMINADA' : `${fallos} tablas fallaron`);
  console.log('Verificá con: node --env-file=.env scripts/migrate-data.mjs --verify');
}
process.exit(fallos === 0 ? 0 : 1);
