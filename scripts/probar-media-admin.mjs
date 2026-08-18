/**
 * Fase 7b — logica de media del panel, sin browser.
 *
 * Correr con:
 *   node --env-file=.env scripts/probar-media-admin.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const LIMITE = 1024 * 1024 * 1024;
const UMBRAL = Math.round(LIMITE * 0.8);

const esLegacy = (m) => !m.storage_path;
const formatearBytes = (b) => {
  if (!Number.isFinite(b) || b <= 0) return '0 KB';
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  const mb = b / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0).replace('.', ',')} MB`;
  return `${(mb / 1024).toFixed(2).replace('.', ',')} GB`;
};

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(50)} ${JSON.stringify(obtenido)}` +
      (ok ? '' : `  <- se esperaba ${JSON.stringify(esperado)}`)
  );
};

console.log('=== LEGACY vs SUBIDO (decide si hay que borrar del bucket) ===');
chequear('storage_path null -> legacy', esLegacy({ storage_path: null }), true);
chequear('storage_path vacio -> legacy', esLegacy({ storage_path: '' }), true);
chequear('storage_path con ruta -> subido', esLegacy({ storage_path: 'abc/1.webp' }), false);

console.log('\n=== TAMAÑOS EN CASTELLANO ===');
chequear('0', formatearBytes(0), '0 KB');
chequear('negativo (dato corrupto)', formatearBytes(-5), '0 KB');
chequear('NaN', formatearBytes(NaN), '0 KB');
chequear('820 KB', formatearBytes(820 * 1024), '820 KB');
chequear('1,4 MB con coma decimal', formatearBytes(1.44 * 1024 * 1024), '1,4 MB');
chequear('340 MB sin decimales', formatearBytes(340 * 1024 * 1024), '340 MB');
chequear('el limite se lee 1,00 GB', formatearBytes(LIMITE), '1,00 GB');

console.log('\n=== EL AVISO SALTA ANTES DE QUE FALLE UNA SUBIDA ===');
const cerca = (b) => b >= UMBRAL;
chequear('vacio', cerca(0), false);
chequear('a la mitad', cerca(LIMITE * 0.5), false);
chequear('79%', cerca(LIMITE * 0.79), false);
chequear('80% -> avisa', cerca(UMBRAL), true);
chequear('95% -> avisa', cerca(LIMITE * 0.95), true);
console.log('       (el umbral son ' + formatearBytes(UMBRAL) + ', deja ' + formatearBytes(LIMITE - UMBRAL) + ' de margen)');

console.log('\n=== ESTADO REAL DE LA BASE ===');
const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: media } = await sb.from('property_media').select('storage_path, kind');
const legacy = (media ?? []).filter(esLegacy).length;
const subidos = (media ?? []).length - legacy;
console.log('  filas de media :', media?.length);
console.log('  legacy (repo)  :', legacy);
console.log('  subidas al bucket:', subidos);
chequear('hoy son todas legacy', subidos, 0);

// Ninguna propiedad puede tener un video primero: rompe la portada.
const { data: props } = await sb.from('property_media').select('property_id, kind, sort_order');
const porProp = {};
for (const m of props ?? []) (porProp[m.property_id] ??= []).push(m);
const videoPrimero = Object.values(porProp).filter(
  (ms) => ms.sort((a, b) => a.sort_order - b.sort_order)[0].kind === 'video'
).length;
chequear('ninguna con video en primera posicion', videoPrimero, 0);

console.log('\n=== COHERENCIA CON EL CODIGO REAL ===');
const fuente = readFileSync(new URL('../src/lib/admin/media.ts', import.meta.url), 'utf8');
chequear('el limite es 1 GB', /LIMITE_STORAGE = 1024 \* 1024 \* 1024/.test(fuente), true);
chequear('el umbral es el 80%', /LIMITE_STORAGE \* 0\.8/.test(fuente), true);
chequear('llama a la RPC renombrada', fuente.includes("rpc('uso_bucket_propiedades')"), true);
chequear('NO quedo el nombre viejo', !fuente.includes("'uso_de_storage'"), true);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
