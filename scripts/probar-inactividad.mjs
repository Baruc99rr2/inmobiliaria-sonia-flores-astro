/**
 * Fase 6f — la aritmética del cierre por inactividad, sin browser ni base.
 *
 * Correr con:
 *   node scripts/probar-inactividad.mjs
 */
const MIN = 60 * 1000;
const INACTIVIDAD_MS = 20 * MIN;
const AVISO_MS = 5 * MIN;

// Copias de las funciones de src/lib/admin/inactividad.ts. Se replican acá para
// poder correr esto con node sin compilar TypeScript; si cambian allá, cambian
// acá (son cinco líneas y el script las verifica contra el archivo real abajo).
const faseDeSesion = (ultima, ahora) => {
  const inactiva = ahora - ultima;
  if (inactiva >= INACTIVIDAD_MS) return 'cerrada';
  if (inactiva >= INACTIVIDAD_MS - AVISO_MS) return 'por-cerrar';
  return 'activa';
};
const restanteMs = (ultima, ahora) => Math.max(0, ultima + INACTIVIDAD_MS - ahora);
const formatearRestante = (ms) => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(48)} ${JSON.stringify(obtenido)}` +
      (ok ? '' : `  <- se esperaba ${JSON.stringify(esperado)}`)
  );
};

const T0 = 1_000_000_000_000;

console.log('=== FASES SEGÚN CUÁNTO HACE QUE NO TOCA NADA ===');
for (const [min, esperado] of [
  [0, 'activa'],
  [5, 'activa'],
  [14, 'activa'],
  [14.9, 'activa'],
  [15, 'por-cerrar'],
  [17, 'por-cerrar'],
  [19.9, 'por-cerrar'],
  [20, 'cerrada'],
  [45, 'cerrada'],
]) {
  chequear(`a los ${min} min`, faseDeSesion(T0, T0 + min * MIN), esperado);
}

console.log('\n=== EL AVISO DURA EXACTAMENTE 5 MINUTOS ===');
chequear('aparece a los 15 min', faseDeSesion(T0, T0 + 15 * MIN), 'por-cerrar');
chequear('cierra a los 20 min', faseDeSesion(T0, T0 + 20 * MIN), 'cerrada');
chequear('restante al aparecer', formatearRestante(restanteMs(T0, T0 + 15 * MIN)), '5:00');

console.log('\n=== CUENTA REGRESIVA ===');
chequear('a los 15:00', formatearRestante(restanteMs(T0, T0 + 15 * MIN)), '5:00');
chequear('a los 17:30', formatearRestante(restanteMs(T0, T0 + 17.5 * MIN)), '2:30');
chequear('a los 19:59', formatearRestante(restanteMs(T0, T0 + 19 * MIN + 59_000)), '0:01');
chequear('pasado el cierre no da negativo', restanteMs(T0, T0 + 30 * MIN), 0);

console.log('\n=== UN GESTO REINICIA EL RELOJ ===');
// A los 18 min está por cerrar; toca algo y vuelve a estar tranquila.
const tocaA18 = T0 + 18 * MIN;
chequear('antes de tocar (18 min)', faseDeSesion(T0, tocaA18), 'por-cerrar');
chequear('justo después de tocar', faseDeSesion(tocaA18, tocaA18), 'activa');
chequear('19 min después de tocar', faseDeSesion(tocaA18, tocaA18 + 19 * MIN), 'por-cerrar');
chequear('21 min después de tocar', faseDeSesion(tocaA18, tocaA18 + 21 * MIN), 'cerrada');

console.log('\n=== EL TELÉFONO QUE DURMIÓ ===');
// El caso que rompe un setTimeout largo: el teléfono se suspende 40 minutos.
// Como se compara contra el reloj, el tiempo dormido cuenta como inactividad.
chequear('despierta a los 40 min -> cerrada', faseDeSesion(T0, T0 + 40 * MIN), 'cerrada');

console.log('\n=== EL TELÉFONO QUE QUEDÓ SOBRE EL MOSTRADOR ===');
// Alguien lo agarra 30 minutos después y abre /admin. Al arrancar se lee la
// última actividad guardada, así que lo encuentra cerrado y no en cero.
chequear('abrir /admin 30 min después', faseDeSesion(T0, T0 + 30 * MIN), 'cerrada');

// --- El script no puede quedar desincronizado del archivo real ---------------
import { readFileSync } from 'node:fs';
const fuente = readFileSync(new URL('../src/lib/admin/inactividad.ts', import.meta.url), 'utf8');
console.log('\n=== LOS NÚMEROS COINCIDEN CON EL ARCHIVO REAL ===');
chequear(
  'INACTIVIDAD_MS = 20 min',
  /INACTIVIDAD_MS\s*=\s*20 \* 60 \* 1000/.test(fuente),
  true
);
chequear('AVISO_MS = 5 min', /AVISO_MS\s*=\s*5 \* 60 \* 1000/.test(fuente), true);
chequear(
  'los eventos son gestos humanos',
  ['keydown', 'pointerdown', 'touchstart', 'wheel', 'scroll'].every((e) =>
    fuente.includes(`'${e}'`)
  ),
  true
);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
