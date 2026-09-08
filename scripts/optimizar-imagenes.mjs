/**
 * Genera versiones WebP en varios anchos de las fotos LEGACY que viven en
 * `public/`, y deja un manifiesto con las que logró generar.
 *
 * ---
 * POR QUÉ PRE-GENERADAS Y COMMITEADAS, Y NO EN EL BUILD
 *
 * En el build de Vercel no hay ffmpeg, así que no se pueden generar allá. Y no
 * se puede simplemente renombrar los archivos originales a .webp porque las
 * rutas están guardadas en la base (`property_media.url` tiene 81 filas con
 * rutas tipo `/propiedades/foo.png`): cambiarlas exigiría escribir contra
 * producción, que es justo lo que no queremos.
 *
 * La salida va a `public/optim/` con el mismo árbol de carpetas y el ancho en el
 * nombre, así que el original queda intacto y sigue sirviendo de respaldo.
 *
 * ---
 * POR QUÉ SOLO LAS REFERENCIADAS
 *
 * En `public/propiedades` hay 177 imágenes pero la base solo usa 63: el resto
 * son sobras de antes (la limpieza de `public/` quedó postergada). Generar las
 * 177 sumaría unos 10 MB al repo sin que nadie los pida.
 *
 * ---
 * USO
 *
 *   node --env-file=.env scripts/optimizar-imagenes.mjs
 *   node --env-file=.env scripts/optimizar-imagenes.mjs --forzar   (rehace todo)
 *
 * Hay que volver a correrlo si alguna vez se agregan fotos nuevas a `public/`.
 * Las que sube la dueña desde el panel NO pasan por acá: esas ya salen en WebP
 * del navegador y se sirven redimensionadas por el endpoint de Supabase.
 */
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, extname } from 'node:path';

const ejecutar = promisify(execFile);

/** Los anchos que se generan. Ver `src/lib/imagen.js` para cómo se eligen. */
export const ANCHOS = [480, 800, 1600];

const CALIDAD = { 480: 72, 800: 74, 1600: 76 };

const RAIZ_PUBLICA = 'public';
const CARPETA_SALIDA = 'public/optim';
const MANIFIESTO = 'src/lib/imagenes-optimizadas.json';

const forzar = process.argv.includes('--forzar');

const existe = async (p) => {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
};

/** Las rutas locales de imagen que usa el sitio, sacadas de la base. */
async function rutasReferenciadas() {
  const sb = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const rutas = new Set();

  const { data: media, error } = await sb.from('property_media').select('url').limit(5000);
  if (error) throw new Error(`No se pudo leer property_media: ${error.message}`);
  for (const { url } of media) if (url?.startsWith('/')) rutas.add(url);

  // `data.jsx` sigue siendo el respaldo si Supabase se cae, así que sus fotos
  // también tienen que tener versión optimizada.
  //
  // Se lee como TEXTO y no con `import`: Node no sabe cargar `.jsx`. Sacar las
  // rutas con una expresión regular alcanza y de paso no ejecuta el archivo.
  const texto = await readFile('src/data.jsx', 'utf8');
  for (const [, ruta] of texto.matchAll(/["'](\/propiedades\/[^"']+)["']/g)) rutas.add(ruta);

  return [...rutas].filter((r) => ['.png', '.jpg', '.jpeg'].includes(extname(r).toLowerCase()));
}

/** `/propiedades/foo.png` + 480  ->  `public/optim/propiedades/foo-480.webp` */
function destino(ruta, ancho) {
  const sinExt = ruta.replace(/\.[^.]+$/, '');
  return join(CARPETA_SALIDA, `${sinExt}-${ancho}.webp`);
}

const rutas = await rutasReferenciadas();
console.log(`Imágenes locales referenciadas: ${rutas.length}`);

const logradas = [];
let generadas = 0;
let salteadas = 0;
let faltantes = 0;
let bytesOriginal = 0;
let bytesNuevos = 0;

for (const ruta of rutas) {
  const origen = join(RAIZ_PUBLICA, ruta);
  if (!(await existe(origen))) {
    console.warn(`  FALTA el archivo original, se saltea: ${ruta}`);
    faltantes++;
    continue;
  }

  bytesOriginal += (await stat(origen)).size;
  let todoBien = true;

  for (const ancho of ANCHOS) {
    const salida = destino(ruta, ancho);
    if (!forzar && (await existe(salida))) {
      salteadas++;
      bytesNuevos += (await stat(salida)).size;
      continue;
    }

    await mkdir(dirname(salida), { recursive: true });
    try {
      await ejecutar('ffmpeg', [
        '-y', '-v', 'error',
        '-i', origen,
        // `min(ancho,iw)` para no agrandar una foto que ya es más chica.
        '-vf', `scale='min(${ancho},iw)':-2`,
        '-c:v', 'libwebp',
        '-quality', String(CALIDAD[ancho]),
        '-compression_level', '6',
        salida,
      ]);
      generadas++;
      bytesNuevos += (await stat(salida)).size;
    } catch (e) {
      console.error(`  ERROR con ${ruta} @${ancho}: ${e.message?.slice(0, 120)}`);
      todoBien = false;
    }
  }

  if (todoBien) logradas.push(ruta);
}

// El manifiesto es lo que evita los 404: `src/lib/imagen.js` solo reescribe una
// URL si figura acá. Si algo no se pudo generar, se sigue sirviendo el original.
await writeFile(
  MANIFIESTO,
  JSON.stringify({ anchos: ANCHOS, rutas: logradas.sort() }, null, 2) + '\n',
  'utf8'
);

console.log(`
  generadas .......... ${generadas}
  ya estaban ......... ${salteadas}
  sin archivo ........ ${faltantes}
  en el manifiesto ... ${logradas.length}

  originales ......... ${(bytesOriginal / 1048576).toFixed(1)} MB
  optimizadas (x${ANCHOS.length}) ... ${(bytesNuevos / 1048576).toFixed(1)} MB
`);
