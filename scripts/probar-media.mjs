/**
 * Fase 7a — deteccion de video y eleccion de portada, sin browser ni base.
 *
 * Correr con:
 *   node scripts/probar-media.mjs
 */
import { readFileSync } from 'node:fs';

// Copia de src/lib/media.ts. Se replica para poder correr con node sin compilar
// TypeScript; al final se verifica contra el archivo real.
const SIN_FOTO = '/propiedades/sin-foto.svg';
const EXTENSIONES_DE_VIDEO = ['.mp4', '.mov', '.webm', '.m4v'];

const esVideo = (url, kind) => {
  if (kind === 'video') return true;
  if (kind === 'image') return false;
  const sinQuery = String(url ?? '').split('?')[0].split('#')[0].toLowerCase();
  return EXTENSIONES_DE_VIDEO.some((ext) => sinQuery.endsWith(ext));
};
const kindDe = (p, i) => p?.detalles?.media?.[i]?.kind ?? null;
const portadaDe = (p) => {
  const imgs = p?.images ?? [];
  for (let i = 0; i < imgs.length; i++) {
    if (imgs[i] && !esVideo(imgs[i], kindDe(p, i))) return imgs[i];
  }
  return SIN_FOTO;
};
const soloImagenes = (p) => {
  const imgs = p?.images ?? [];
  const out = imgs.filter((u, i) => u && !esVideo(u, kindDe(p, i)));
  return out.length > 0 ? out : [SIN_FOTO];
};

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(56)} ${JSON.stringify(obtenido)}` +
      (ok ? '' : `  <- se esperaba ${JSON.stringify(esperado)}`)
  );
};

console.log('=== EL BUG REPORTADO: URL DE STORAGE CON QUERYSTRING ===');
const conToken = 'https://xyz.supabase.co/storage/v1/object/public/propiedades/a/v.mp4?token=abc123';
chequear('endsWith crudo NO lo detecta (asi estaba antes)', conToken.endsWith('.mp4'), false);
chequear('esVideo por pathname SI lo detecta', esVideo(conToken, null), true);
chequear('y con kind, sin depender de la URL', esVideo(conToken, 'video'), true);
chequear('imagen con querystring no se confunde', esVideo('https://x/f.webp?w=800', null), false);
chequear('fragmento tambien se ignora', esVideo('https://x/v.mp4#t=5', null), true);

console.log('\n=== EL KIND MANDA SOBRE LA EXTENSION ===');
// Un .mp4 marcado como imagen en la base: gana la base.
chequear('kind=image sobre una url .mp4', esVideo('/x/raro.mp4', 'image'), false);
// Una imagen sin extension (URL firmada, CDN): sin kind no se sabe, con kind si.
chequear('sin extension y sin kind -> no es video', esVideo('https://cdn/x/abc123', null), false);
chequear('sin extension y kind=video -> es video', esVideo('https://cdn/x/abc123', 'video'), true);

console.log('\n=== PORTADA: NUNCA UN VIDEO ===');
const conVideoPrimero = {
  images: ['/a/v.mp4', '/a/foto.jpg'],
  detalles: { media: [{ kind: 'video' }, { kind: 'image' }] },
};
chequear('video primero -> devuelve la foto', portadaDe(conVideoPrimero), '/a/foto.jpg');

const soloVideos = { images: ['/a/v.mp4'], detalles: { media: [{ kind: 'video' }] } };
chequear('solo videos -> placeholder', portadaDe(soloVideos), SIN_FOTO);
chequear('sin nada -> placeholder', portadaDe({ images: [] }), SIN_FOTO);
chequear('images undefined -> placeholder', portadaDe({}), SIN_FOTO);
chequear('producto null -> placeholder', portadaDe(null), SIN_FOTO);

const normal = { images: ['/a/1.jpg', '/a/2.jpg'], detalles: { media: [{ kind: 'image' }, { kind: 'image' }] } };
chequear('caso normal -> la primera', portadaDe(normal), '/a/1.jpg');

console.log('\n=== FALLBACK DE data.jsx (strings sueltos, sin kind) ===');
const legacy = { images: ['/propiedades/x.mp4', '/propiedades/x.png'] };
chequear('detecta el video por extension', portadaDe(legacy), '/propiedades/x.png');

console.log('\n=== soloImagenes (tarjeta de busqueda) ===');
chequear('saca los videos', soloImagenes(conVideoPrimero), ['/a/foto.jpg']);
chequear('sin imagenes -> placeholder', soloImagenes(soloVideos), [SIN_FOTO]);
chequear('conserva el orden', soloImagenes(normal), ['/a/1.jpg', '/a/2.jpg']);

console.log('\n=== COHERENCIA CON EL CODIGO REAL ===');
const fuente = readFileSync(new URL('../src/lib/media.ts', import.meta.url), 'utf8');
chequear('SIN_FOTO coincide', fuente.includes(`'${SIN_FOTO}'`), true);
chequear('las extensiones coinciden', EXTENSIONES_DE_VIDEO.every((e) => fuente.includes(`'${e}'`)), true);
chequear('se parte por ? antes de mirar la extension', /split\('\?'\)/.test(fuente), true);

// El placeholder tiene que existir de verdad: ese era el bug original.
const svg = readFileSync(new URL('../public/propiedades/sin-foto.svg', import.meta.url), 'utf8');
chequear('el archivo del placeholder existe', svg.startsWith('<svg'), true);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
