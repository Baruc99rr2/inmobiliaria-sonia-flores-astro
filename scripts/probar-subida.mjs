/**
 * Fase 7c — validacion y mensajes de la subida, sin browser.
 *
 * Correr con:
 *   node scripts/probar-subida.mjs
 */
import { readFileSync } from 'node:fs';

const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
const TIPOS_VIDEO = ['video/mp4'];
const TOPE = 50 * 1024 * 1024;
const mb = (b) => `${Math.round(b / (1024 * 1024))} MB`;

const validarArchivo = (file) => {
  const esVideo = file.type.startsWith('video/');
  if (esVideo && !TIPOS_VIDEO.includes(file.type))
    return `“${file.name}” es un video en un formato que no aceptamos. Tiene que ser MP4.`;
  if (!esVideo && !file.type.startsWith('image/'))
    return `“${file.name}” no es una foto ni un video. Se pueden subir fotos (JPG, PNG o WebP) y videos MP4.`;
  if (esVideo && file.size > TOPE)
    return `“${file.name}” pesa ${mb(file.size)} y el máximo son ${mb(TOPE)}. Probá con un video más corto.`;
  return null;
};

const traducir = (m, status) => {
  m = String(m ?? '');
  if (/exceeded the maximum allowed size|payload too large/i.test(m) || status === 413)
    return `El archivo pesa más de ${mb(TOPE)}, que es el máximo.`;
  if (/mime type .* is not supported/i.test(m))
    return 'Ese tipo de archivo no se puede subir. Se aceptan fotos (JPG, PNG o WebP) y videos MP4.';
  if (/row-level security|not authorized|403/i.test(m) || status === 403)
    return 'No tenés permiso para subir archivos. Probá cerrando sesión y entrando de nuevo.';
  if (/already exists|duplicate/i.test(m) || status === 409)
    return 'Ya existe un archivo con ese nombre. Probá de nuevo.';
  if (/network|failed to fetch|load failed/i.test(m))
    return 'Se cortó la conexión. Revisá internet y tocá “Reintentar”.';
  if (status === 0) return 'Se cortó la conexión mientras subía. Tocá “Reintentar”.';
  return 'No pudimos subir este archivo. Tocá “Reintentar”.';
};

const f = (name, type, size) => ({ name, type, size });

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(46)} ${JSON.stringify(obtenido)}`);
  if (!ok) console.log(`       se esperaba ${JSON.stringify(esperado)}`);
};
const contiene = (etiqueta, texto, fragmento) => {
  const ok = String(texto).includes(fragmento);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(46)} ${JSON.stringify(texto)}`);
};

console.log('=== LO QUE SE ACEPTA ===');
chequear('JPG chico', validarArchivo(f('foto.jpg', 'image/jpeg', 2e6)), null);
chequear('PNG', validarArchivo(f('a.png', 'image/png', 5e6)), null);
chequear('WebP', validarArchivo(f('a.webp', 'image/webp', 1e6)), null);
chequear('MP4 de 40 MB', validarArchivo(f('v.mp4', 'video/mp4', 40 * 1024 * 1024)), null);
// Una foto enorme NO se rechaza: se comprime antes de subir.
chequear('JPG de 60 MB (se comprime)', validarArchivo(f('gigante.jpg', 'image/jpeg', 60 * 1024 * 1024)), null);
// HEIC de iPhone: pasa la validacion y el canvas lo convierte a WebP.
chequear('HEIC de iPhone', validarArchivo(f('IMG_1234.HEIC', 'image/heic', 3e6)), null);

console.log('\n=== LO QUE SE RECHAZA, Y COMO SE LO DICE ===');
contiene('video que no es MP4', validarArchivo(f('clip.avi', 'video/x-msvideo', 1e6)), 'Tiene que ser MP4');
contiene('un PDF', validarArchivo(f('plano.pdf', 'application/pdf', 1e6)), 'no es una foto ni un video');
contiene('MP4 de 68 MB', validarArchivo(f('largo.mp4', 'video/mp4', 68 * 1024 * 1024)), 'pesa 68 MB y el máximo son 50 MB');
contiene('el mensaje nombra el archivo', validarArchivo(f('plano.pdf', 'application/pdf', 1e6)), 'plano.pdf');

console.log('\n=== NINGUN MENSAJE CRUDO DE SUPABASE ===');
const crudos = [
  ['mime type application/octet-stream is not supported', 400],
  ['The object exceeded the maximum allowed size', 413],
  ['new row violates row-level security policy', 403],
  ['duplicate key value violates unique constraint', 409],
  ['Failed to fetch', undefined],
  ['', 0],
];
for (const [m, s] of crudos) {
  const t = traducir(m, s);
  const limpio = !/mime type|row-level|violates|Failed to fetch|constraint/i.test(t);
  if (!limpio) fallos++;
  console.log(`  ${limpio ? 'OK  ' : 'FALLA'} ${(m || '(vacio)').slice(0, 42).padEnd(46)} -> ${t}`);
}

console.log('\n=== TODO EN CASTELLANO, SIN JERGA ===');
const mensajes = [
  validarArchivo(f('a.pdf', 'application/pdf', 1)),
  validarArchivo(f('a.avi', 'video/x-msvideo', 1)),
  ...crudos.map(([m, s]) => traducir(m, s)),
];
const jerga = /\b(upload|failed|error|bucket|mime|policy|row|null|undefined|storage)\b/i;
for (const m of mensajes) {
  const ok = !jerga.test(m);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${m.slice(0, 70)}`);
}

console.log('\n=== COHERENCIA CON EL CODIGO REAL ===');
const fuente = readFileSync(new URL('../src/lib/admin/subir.ts', import.meta.url), 'utf8');
chequear('tope de 50 MB', /TOPE_ARCHIVO = 50 \* 1024 \* 1024/.test(fuente), true);
chequear('lado maximo 1920', /LADO_MAXIMO = 1920/.test(fuente), true);
chequear('sale WebP', fuente.includes("'image/webp', CALIDAD_WEBP"), true);
chequear('sube por XHR (progreso real)', fuente.includes('xhr.upload.onprogress'), true);
chequear('borra el huerfano si falla el insert', fuente.includes('borrarDelBucket'), true);

const comp = readFileSync(new URL('../src/components/admin/SubidorMedia.tsx', import.meta.url), 'utf8');
chequear('sube de a uno (for, no Promise.all)', !comp.includes('Promise.all'), true);
chequear('el input NO lleva capture', !/\bcapture\b\s*=/.test(comp), true);
chequear('acepta multiple', comp.includes('multiple'), true);
chequear('hay boton de reintentar', comp.includes('Reintentar'), true);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
