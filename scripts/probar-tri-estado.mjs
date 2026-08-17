/**
 * Prueba de la conversión tri-estado, sin base y sin navegador.
 *
 * Lo que más importa acá es el ROUND-TRIP: cargar una propiedad y guardarla sin
 * tocar nada tiene que devolver exactamente el mismo valor. Si eso falla, entrar
 * a editar el título convertiría un "A consultar" en un "No tiene" en silencio.
 *
 * Correr con:  node --experimental-strip-types scripts/probar-tri-estado.mjs
 */
import {
  contableDesdeDb,
  contableADb,
  montoADb,
  medidaDesdeDb,
  medidaADb,
} from '../src/lib/admin/tri-estado.ts';

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(
    `  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(52)} ${JSON.stringify(obtenido)}` +
      (ok ? '' : `   esperado: ${JSON.stringify(esperado)}`)
  );
};

console.log('=== CONTABLES: base -> formulario ===');
chequear('NULL      -> casilla off, vacio', contableDesdeDb(null), { noTiene: false, valor: '' });
chequear('undefined -> casilla off, vacio', contableDesdeDb(undefined), { noTiene: false, valor: '' });
chequear('0         -> casilla ON, vacio', contableDesdeDb(0), { noTiene: true, valor: '' });
chequear('1         -> casilla off, "1"', contableDesdeDb(1), { noTiene: false, valor: '1' });
chequear('3         -> casilla off, "3"', contableDesdeDb(3), { noTiene: false, valor: '3' });

console.log('\n=== CONTABLES: formulario -> base ===');
chequear('casilla off + vacio  -> NULL', contableADb({ noTiene: false, valor: '' }), null);
chequear('casilla ON           -> 0', contableADb({ noTiene: true, valor: '' }), 0);
chequear('casilla ON + basura  -> 0 (gana la casilla)', contableADb({ noTiene: true, valor: '5' }), 0);
chequear('casilla off + "2"    -> 2', contableADb({ noTiene: false, valor: '2' }), 2);
chequear('casilla off + "  4 " -> 4', contableADb({ noTiene: false, valor: '  4 ' }), 4);
chequear('casilla off + "abc"  -> NULL', contableADb({ noTiene: false, valor: 'abc' }), null);
chequear('casilla off + "-1"   -> NULL (check no-negativos)', contableADb({ noTiene: false, valor: '-1' }), null);
chequear('casilla off + "2.7"  -> 3 (los contables son enteros)', contableADb({ noTiene: false, valor: '2.7' }), 3);

console.log('\n=== ROUND-TRIP: cargar y guardar sin tocar nada ===');
console.log('    (si esto falla, editar el titulo cambia un campo numerico en silencio)');
for (const original of [null, 0, 1, 2, 3, 8, 20]) {
  const ida = contableDesdeDb(original);
  const vuelta = contableADb(ida);
  chequear(`${String(original).padEnd(4)} -> form -> base`, vuelta, original);
}

console.log('\n=== EXPENSAS: conserva decimales ===');
chequear('"15000.50" -> 15000.5', montoADb({ noTiene: false, valor: '15000.50' }), 15000.5);
chequear('casilla ON -> 0 (sin expensas)', montoADb({ noTiene: true, valor: '' }), 0);
chequear('vacio      -> NULL', montoADb({ noTiene: false, valor: '' }), null);

console.log('\n=== MEDIDAS: dos estados, sin "No tiene" ===');
chequear('NULL  -> vacio', medidaDesdeDb(null), '');
chequear('0     -> vacio (no existe "no tiene superficie")', medidaDesdeDb(0), '');
chequear('180   -> "180"', medidaDesdeDb(180), '180');
chequear('12.5  -> "12.5"', medidaDesdeDb(12.5), '12.5');
chequear('vacio -> NULL', medidaADb(''), null);
chequear('"0"   -> NULL (check medidas_sin_cero)', medidaADb('0'), null);
chequear('"-5"  -> NULL', medidaADb('-5'), null);
chequear('"180" -> 180', medidaADb('180'), 180);
chequear('"12.5"-> 12.5', medidaADb('12.5'), 12.5);

console.log('\n=== ROUND-TRIP de medidas ===');
for (const original of [null, 180, 640, 200000, 12.5]) {
  chequear(`${String(original).padEnd(7)} -> form -> base`, medidaADb(medidaDesdeDb(original)), original);
}

console.log('\n=== LA TRAMPA: 0 es falsy en JavaScript ===');
console.log('    Un `if (valor)` trataria el 0 como "sin dato". Se verifica que no pase:');
chequear('0 NO se confunde con NULL al cargar', contableDesdeDb(0).noTiene, true);
chequear('NULL NO se confunde con 0 al cargar', contableDesdeDb(null).noTiene, false);
chequear('0 sobrevive el round-trip', contableADb(contableDesdeDb(0)), 0);
chequear('NULL sobrevive el round-trip', contableADb(contableDesdeDb(null)), null);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' FALLAS'));
process.exit(fallos === 0 ? 0 : 1);
