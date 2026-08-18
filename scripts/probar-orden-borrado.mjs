/**
 * Fase 7d — regla de la portada, reordenamiento y borrado.
 *
 * La parte contra la base crea su propia propiedad de prueba y la borra. No
 * toca ninguna fila existente.
 *
 * Correr con:
 *   node --env-file=.env scripts/probar-orden-borrado.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Copias de src/lib/admin/media.ts
const validarPortada = (items) => {
  if (items.length === 0) return null;
  if (items[0].kind !== 'video') return null;
  if (!items.some((m) => m.kind === 'image')) return null;
  return 'La primera tiene que ser una foto, porque es la que se ve en el listado y en la página principal. Poné una foto adelante y el video después.';
};
const reordenar = (items, desde, hasta) => {
  const c = [...items];
  const [m] = c.splice(desde, 1);
  c.splice(hasta, 0, m);
  return c.map((x, i) => ({ ...x, sort_order: i }));
};

const img = (n) => ({ id: 'i' + n, kind: 'image', sort_order: n });
const vid = (n) => ({ id: 'v' + n, kind: 'video', sort_order: n });

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(50)} ${JSON.stringify(obtenido)}`);
  if (!ok) console.log(`       se esperaba ${JSON.stringify(esperado)}`);
};

console.log('=== LA REGLA: LA PRIMERA TIENE QUE SER FOTO ===');
chequear('foto, video, foto -> valido', validarPortada([img(0), vid(1), img(2)]), null);
chequear('lista vacia -> valido', validarPortada([]), null);
chequear('una sola foto -> valido', validarPortada([img(0)]), null);
const conVideoPrimero = validarPortada([vid(0), img(1)]);
chequear('video primero -> se rechaza', conVideoPrimero !== null, true);
console.log('       mensaje: ' + JSON.stringify(conVideoPrimero));
// Si SOLO hay videos no se puede cumplir, y bloquear no ayudaria a nadie.
chequear('solo videos -> no se bloquea', validarPortada([vid(0), vid(1)]), null);

console.log('\n=== EL PATRON DE ELLA: PORTADA, VIDEO, DETALLE ===');
// Tiene que poder armarlo, pero no se le impone.
chequear('foto,video,foto,foto -> valido', validarPortada([img(0), vid(1), img(2), img(3)]), null);
chequear('foto,foto,foto (sin video) -> valido', validarPortada([img(0), img(1), img(2)]), null);
chequear('foto,foto,video al final -> valido', validarPortada([img(0), img(1), vid(2)]), null);

console.log('\n=== REORDENAR RENUMERA SIN HUECOS ===');
const tres = [img(0), img(1), img(2)];
chequear('mover 2 -> 0', reordenar(tres, 2, 0).map((m) => m.id), ['i2', 'i0', 'i1']);
chequear('y sort_order queda 0,1,2', reordenar(tres, 2, 0).map((m) => m.sort_order), [0, 1, 2]);
chequear('mover 0 -> 2', reordenar(tres, 0, 2).map((m) => m.id), ['i1', 'i2', 'i0']);
chequear('mover a la misma posicion', reordenar(tres, 1, 1).map((m) => m.id), ['i0', 'i1', 'i2']);

console.log('\n=== BORRAR DEJANDO UN VIDEO ADELANTE ===');
// Estaba foto,video,foto. Se borra la foto de adelante -> queda video,foto.
const tras = [vid(1), img(2)];
chequear('el orden resultante seria invalido', validarPortada(tras) !== null, true);
const iFoto = tras.findIndex((m) => m.kind === 'image');
chequear('se adelanta la primera foto', reordenar(tras, iFoto, 0).map((m) => m.id), ['i2', 'v1']);
chequear('y queda valido', validarPortada(reordenar(tras, iFoto, 0)), null);

console.log('\n=== ESTADO REAL (solo lectura) ===');
const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: todos } = await sb.from('property_media').select('property_id, kind, sort_order');
const porProp = {};
for (const m of todos ?? []) (porProp[m.property_id] ??= []).push(m);
let invalidas = 0;
for (const ms of Object.values(porProp)) {
  ms.sort((a, b) => a.sort_order - b.sort_order);
  if (validarPortada(ms)) invalidas++;
}
console.log('  propiedades con media:', Object.keys(porProp).length);
chequear('ninguna viola la regla hoy', invalidas, 0);

console.log('\n=== BORRADO CONTRA EL BUCKET (propiedad de prueba) ===');
const webp = Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64');
const limpiar = async () => {
  const { data } = await sb.from('properties').select('id').like('slug', 'zz-prueba-7d%');
  for (const p of data ?? []) {
    await sb.from('property_media').delete().eq('property_id', p.id);
    await sb.from('properties').delete().eq('id', p.id);
  }
  const { data: objs } = await sb.storage.from('propiedades').list('zz-prueba-7d');
  if (objs?.length) await sb.storage.from('propiedades').remove(objs.map((o) => `zz-prueba-7d/${o.name}`));
};
await limpiar();

const { data: prop } = await sb
  .from('properties')
  .insert({ slug: 'zz-prueba-7d', name: 'ZZ prueba 7d', operation: 'venta', published: false })
  .select('id')
  .single();

const ruta = `zz-prueba-7d/${Date.now()}.webp`;
await sb.storage.from('propiedades').upload(ruta, webp, { contentType: 'image/webp' });
const { data: pub } = sb.storage.from('propiedades').getPublicUrl(ruta);
const { data: fila } = await sb
  .from('property_media')
  .insert({ property_id: prop.id, url: pub.publicUrl, storage_path: ruta, kind: 'image', sort_order: 0 })
  .select('id, storage_path')
  .single();

const existe = async (r) => {
  const { data } = await sb.storage.from('propiedades').list('zz-prueba-7d');
  return (data ?? []).some((o) => `zz-prueba-7d/${o.name}` === r);
};
chequear('el archivo esta en el bucket', await existe(ruta), true);

// Mismo orden que borrarMedia(): primero la fila, despues el objeto.
await sb.from('property_media').delete().eq('id', fila.id);
const { data: quedaFila } = await sb.from('property_media').select('id').eq('id', fila.id);
chequear('la fila se borro', (quedaFila ?? []).length, 0);
await sb.storage.from('propiedades').remove([ruta]);
chequear('el objeto tambien se borro del bucket', await existe(ruta), false);

await limpiar();
const { count } = await sb.from('property_media').select('*', { count: 'exact', head: true });
chequear('property_media vuelve a 81', count, 81);
const { data: raiz } = await sb.storage.from('propiedades').list('');
chequear('el bucket queda como estaba', (raiz ?? []).length, 0);

console.log('\n=== COHERENCIA CON EL CODIGO REAL ===');
const fuente = readFileSync(new URL('../src/lib/admin/media.ts', import.meta.url), 'utf8');
const iFila = fuente.indexOf("from('property_media').delete()");
const iObj = fuente.indexOf('.remove([item.storage_path');
chequear('borra la FILA antes que el OBJETO', iFila > 0 && iObj > iFila, true);
chequear('legacy no toca el bucket', /if \(esLegacy\(item\)\) return/.test(fuente), true);
chequear('guardarOrden valida la portada', /validarPortada\(items\)/.test(fuente), true);

const gal = readFileSync(new URL('../src/components/admin/GaleriaMedia.tsx', import.meta.url), 'utf8');
chequear('el arrastre usa pointer events', gal.includes('pointermove') && !gal.includes('onDragStart'), true);
chequear('vuelve atras si falla el guardado', gal.includes('setMedia(previo)'), true);
const tar = readFileSync(new URL('../src/components/admin/TarjetaMedia.tsx', import.meta.url), 'utf8');
chequear('el agarre lleva touch-none', tar.includes('touch-none'), true);
chequear('hay flechitas ademas del arrastre', tar.includes('ChevronLeftIcon') && tar.includes('ChevronRightIcon'), true);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
