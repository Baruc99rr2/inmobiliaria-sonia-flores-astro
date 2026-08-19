/**
 * Fase 6.6 — saca el bloque de contacto de la descripción de la propiedad 18.
 *
 * Esa descripción terminaba con:
 *
 *   📞 Para más información comunicarse al 3884881245 de 9 a 13 y de 16 a 18 hs.
 *   Martillera Sonia Flores MP 177.
 *
 * Era la única de las 20 que lo tenía adentro del texto. Ahora los datos de
 * contacto salen de `site_settings` y se muestran en TODAS las fichas, así que
 * acá quedaba duplicado: en pantalla y, sobre todo, en el texto que arma el
 * botón de compartir, que ya agrega esa misma línea al final.
 *
 * Toca los DOS lugares (la base y `data.jsx`). El tercero, `migrate-data.mjs`,
 * no necesita cambio: pasa la descripción tal cual viene de `data.jsx`.
 *
 * Uso:
 *   node --env-file=.env scripts/fase66-sacar-contacto-id18.mjs            (en seco)
 *   node --env-file=.env scripts/fase66-sacar-contacto-id18.mjs --aplicar
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APLICAR = process.argv.includes('--aplicar');
const RUTA_DATA = new URL('../src/data.jsx', import.meta.url);

/** Corta desde el teléfono hasta el final. Devuelve el texto sin el bloque. */
export function sacarContacto(descripcion) {
  const i = descripcion.search(/\n*📞\s*Para más información/i);
  if (i === -1) return { descripcion, saco: false };
  return { descripcion: descripcion.slice(0, i).trimEnd(), saco: true };
}

let fallos = 0;
const chequear = (etiqueta, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta}${detalle ? '  ' + detalle : ''}`);
};

// --- data.jsx --------------------------------------------------------------
const original = readFileSync(RUTA_DATA, 'utf8');
let texto = original;
let tocadas = 0;

texto = texto.replace(
  /^([ \t]*)description: '((?:[^'\\]|\\.)*)',[ \t]*\r?$/gm,
  (linea, sangria, cuerpo) => {
    if (!cuerpo.includes('📞')) return linea;
    const real = cuerpo.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    const { descripcion, saco } = sacarContacto(real);
    if (!saco) return linea;
    tocadas++;
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    return `${sangria}description: '${esc(descripcion)}',\r`;
  }
);

console.log('=== data.jsx ===');
chequear('descripciones con bloque de contacto', tocadas === 1, `(${tocadas})`);
chequear('no queda ningun 📞', !texto.includes('📞'));
chequear('no queda el telefono suelto', !/3884881245/.test(texto));
chequear('finales de linea intactos', !/\r\r/.test(texto) && !/(?<!\r)\n/.test(texto));

if (APLICAR && texto !== original) {
  writeFileSync(RUTA_DATA, texto, 'utf8');
  console.log('  -> data.jsx ESCRITO');
} else {
  console.log('  -> en seco, no se escribió');
}

// --- base ------------------------------------------------------------------
const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: filas, error } = await sb
  .from('properties')
  .select('id, codigo, description')
  .order('codigo');

if (error) {
  console.log('\nERROR al leer la base:', error.message);
  process.exit(1);
}

console.log('\n=== base de datos ===');
const aCambiar = filas
  .map((f) => ({ ...f, ...sacarContacto(f.description ?? '') }))
  .filter((f) => f.saco);

chequear('filas con bloque de contacto', aCambiar.length === 1, `(${aCambiar.length}) -> ids ${aCambiar.map((f) => f.codigo).join(', ') || '—'}`);

for (const f of aCambiar) {
  console.log(`\n  id ${f.codigo} queda:`);
  console.log('   ', JSON.stringify('…' + f.descripcion.slice(-95)));
}

if (APLICAR) {
  for (const f of aCambiar) {
    const { error: e } = await sb
      .from('properties')
      .update({ description: f.descripcion })
      .eq('id', f.id);
    if (e) { console.log('   ERROR id', f.codigo, e.message); fallos++; }
  }
  const { data: rev } = await sb.from('properties').select('codigo, description');
  const quedan = rev.filter((p) => /📞|3884881245|Martillera/i.test(p.description ?? ''));
  console.log('\n  tras aplicar, filas con datos de contacto en la descripcion:', quedan.length);
  if (quedan.length) fallos++;
} else {
  console.log('\n  -> en seco, no se escribió');
}

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
