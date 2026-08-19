/**
 * Fase 6.6 — saca el bloque de requisitos de adentro de las descripciones.
 *
 * En 10 propiedades el texto de requisitos venía pegado al final de la
 * descripción, con el "⚠️" y todo. Ahora que la ficha renderiza la columna
 * `requisitos`, quedaría duplicado. Este script lo mueve.
 *
 * >>> HAY QUE TOCAR TRES LUGARES, NO DOS. <<<
 *
 *   1. La base de datos.
 *   2. `src/data.jsx`, o la próxima corrida de la migración lo revierte (ya pasó
 *      con los títulos).
 *   3. `scripts/migrate-data.mjs`, que escribía `requisitos: null` a mano. Sin
 *      esto, la próxima migración vaciaría la columna aunque data.jsx esté bien.
 *
 * El 3 se corrige en el archivo de la migración; este script hace 1 y 2.
 *
 * Uso:
 *   node --env-file=.env scripts/fase66-separar-requisitos.mjs           (en seco)
 *   node --env-file=.env scripts/fase66-separar-requisitos.mjs --aplicar
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const APLICAR = process.argv.includes('--aplicar');
const RUTA_DATA = new URL('../src/data.jsx', import.meta.url);
const MARCADOR = '⚠️ REQUISITOS PARA ALQUILAR:';

/**
 * Separa la descripción de los requisitos.
 *
 * El bloque va SIEMPRE al final, salvo en la id 18, que después de los
 * requisitos tiene un bloque de contacto ("📞 Para más información…"). Ese
 * bloque NO es un requisito y tiene que quedarse en la descripción.
 */
export function separarRequisitos(descripcion) {
  const i = descripcion.indexOf(MARCADOR);
  if (i === -1) return { descripcion, requisitos: null };

  const antes = descripcion.slice(0, i);
  const resto = descripcion.slice(i + MARCADOR.length);

  const corte = resto.indexOf('\n\n📞');
  const cuerpo = corte === -1 ? resto : resto.slice(0, corte);
  const despues = corte === -1 ? '' : resto.slice(corte);

  return {
    descripcion: (antes.replace(/\s+$/, '') + despues).trim(),
    requisitos: cuerpo.trim() || null,
  };
}

// --- 1. data.jsx -----------------------------------------------------------
// Se trabaja sobre el texto del archivo y no sobre el módulo importado, para no
// reescribir 1500 líneas con un serializador y perder los comentarios.
function arreglarDataJsx() {
  const original = readFileSync(RUTA_DATA, 'utf8');
  let texto = original;
  let cambios = 0;

  // Las descripciones son literales de una sola línea con \n escapados.
  // `\r?$` porque el archivo está en CRLF: sin eso, `$` no matchea.
  const reDesc = /^([ \t]*)description: '((?:[^'\\]|\\.)*)',[ \t]*\r?$/gm;

  texto = texto.replace(reDesc, (linea, sangria, cuerpoEscapado) => {
    if (!cuerpoEscapado.includes(MARCADOR)) return linea;

    // Se desescapa, se separa, y se vuelve a escapar igual que estaba.
    const real = cuerpoEscapado.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    const { descripcion, requisitos } = separarRequisitos(real);
    if (!requisitos) return linea;

    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    cambios++;
    // Marcador temporal: en este paso solo se acorta la descripción. El valor se
    // deposita en la línea siguiente y el paso de abajo lo mete en `detalles`.
    // Ojo con los finales de línea: el archivo está en CRLF y el match se comió
    // el `\r`, así que hay que reponerlo. Sin esto quedan mezclados.
    return `${sangria}description: '${esc(descripcion)}',\r\n${sangria}__REQ__: '${esc(requisitos)}',\r`;
  });

  // El campo va DENTRO de `detalles`, porque el sitio lo lee como
  // `product.detalles?.requisitos` y el fallback de data.jsx no pasa por el
  // adaptador (es el objeto crudo). Se mueve la línea marcada adentro del
  // bloque `detalles: {` que le sigue.
  // `\r?$` queda FUERA del grupo capturado: si entra, el `\r` viaja con el texto
  // y al reponer el salto quedaría `\r\r\n`.
  texto = texto.replace(
    /^[ \t]*__REQ__: ('(?:[^'\\]|\\.)*'),[ \t]*\r?\n([\s\S]*?^([ \t]*)detalles: \{)[ \t]*\r?$/gm,
    (_m, valor, hastaDetalles, sangria) =>
      `${hastaDetalles}\r\n${sangria}    requisitos: ${valor},\r`
  );

  return { original, texto, cambios };
}

const { original, texto, cambios } = arreglarDataJsx();
console.log('=== data.jsx ===');
console.log('  descripciones con bloque de requisitos:', cambios);
console.log('  quedan marcadores tras el cambio      :', (texto.match(/⚠️ REQUISITOS/g) ?? []).length);
console.log('  campos `requisitos:` agregados        :', (texto.match(/^[ \t]*requisitos: '/gm) ?? []).length);
console.log('  marcadores __REQ__ sin mover          :', (texto.match(/__REQ__/g) ?? []).length);
console.log('  de esos, dentro de `detalles`         :',
  (texto.match(/detalles: \{[ \t]*\r?\n[ \t]*requisitos: '/g) ?? []).length);

if (APLICAR && texto !== original) {
  writeFileSync(RUTA_DATA, texto, 'utf8');
  console.log('  -> data.jsx ESCRITO');
} else {
  console.log('  -> en seco, no se escribió');
}

// --- 2. La base ------------------------------------------------------------
const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: filas, error } = await sb
  .from('properties')
  .select('id, codigo, description, requisitos')
  .order('codigo');

if (error) {
  console.log('\nERROR al leer la base:', error.message);
  process.exit(1);
}

console.log('\n=== base de datos ===');
const aCambiar = [];
for (const f of filas) {
  const { descripcion, requisitos } = separarRequisitos(f.description ?? '');
  if (requisitos) aCambiar.push({ ...f, nuevaDesc: descripcion, requisitos });
}
console.log('  filas a cambiar:', aCambiar.length, '->', aCambiar.map((f) => f.codigo).join(', '));

for (const f of aCambiar.slice(0, 2)) {
  console.log(`\n  --- ejemplo id ${f.codigo} ---`);
  console.log('    descripcion queda:', JSON.stringify('…' + f.nuevaDesc.slice(-70)));
  console.log('    requisitos       :', JSON.stringify(f.requisitos));
}

if (APLICAR) {
  let ok = 0;
  for (const f of aCambiar) {
    const { error: e } = await sb
      .from('properties')
      .update({ description: f.nuevaDesc, requisitos: f.requisitos })
      .eq('id', f.id);
    if (e) console.log('    ERROR id', f.codigo, e.message);
    else ok++;
  }
  console.log(`\n  -> ${ok}/${aCambiar.length} filas actualizadas`);
} else {
  console.log('\n  -> en seco, no se escribió');
}
