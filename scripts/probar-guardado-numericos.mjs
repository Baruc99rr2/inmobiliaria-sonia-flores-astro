/**
 * Verifica QUÉ QUEDA EN LA BASE para cada estado de cada campo numérico.
 *
 * No describe lo que hace el código: guarda de verdad y vuelve a leer la fila.
 *
 * Trabaja SOLO sobre una propiedad de prueba que crea y borra. No toca ninguna
 * fila existente.
 *
 * Correr con:
 *   node --env-file=.env --experimental-strip-types scripts/probar-guardado-numericos.mjs
 */
import { createClient } from '@supabase/supabase-js';
import {
  contableDesdeDb,
  contableADb,
  montoADb,
  medidaDesdeDb,
  medidaADb,
} from '../src/lib/admin/tri-estado.ts';

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SLUG = 'zz-prueba-numericos-6c';

const contarTodas = async () =>
  (await sb.from('properties').select('*', { count: 'exact', head: true })).count;

const limpiar = async () => {
  await sb.from('properties').delete().like('slug', 'zz-prueba-%');
};

const antes = await contarTodas();
console.log('propiedades antes:', antes);
await limpiar(); // por si quedó algo de una corrida anterior

// --- Lo que "carga" la dueña en el formulario -------------------------------
// Un caso de cada estado, en cada grupo.
const formulario = {
  ambientes: { noTiene: false, valor: '3' },      // cargado
  dormitorios: { noTiene: false, valor: '' },     // vacío  -> A consultar
  banos: { noTiene: true, valor: '' },            // No tiene
  cocheras: { noTiene: true, valor: '' },         // No tiene
  expensas: { noTiene: false, valor: '15000.50' },// cargado con decimales
  superficie_m2: '180',                            // cargada
  frente_m: '',                                    // vacía  -> A consultar
  fondo_m: '0',                                    // 0 -> tiene que quedar NULL
};

const aGuardar = {
  ambientes: contableADb(formulario.ambientes),
  dormitorios: contableADb(formulario.dormitorios),
  banos: contableADb(formulario.banos),
  cocheras: contableADb(formulario.cocheras),
  expensas: montoADb(formulario.expensas),
  superficie_m2: medidaADb(formulario.superficie_m2),
  frente_m: medidaADb(formulario.frente_m),
  fondo_m: medidaADb(formulario.fondo_m),
};

const { data: creada, error } = await sb
  .from('properties')
  .insert({ slug: SLUG, name: 'ZZ prueba numericos 6c', operation: 'alquiler', published: false, ...aGuardar })
  .select('id, ambientes, dormitorios, banos, cocheras, expensas, superficie_m2, frente_m, fondo_m')
  .single();

if (error) {
  console.log('ERROR al insertar:', error.message);
  await limpiar();
  process.exit(1);
}

// --- La fila real, tal como quedó -------------------------------------------
console.log('\n=== LO QUE QUEDÓ EN LA BASE ===');
console.log('campo           | lo que hizo ella      | en la base | tipo    | web');
console.log('----------------+-----------------------+------------+---------+--------------');

const describir = (f) =>
  typeof f === 'string'
    ? f === '' ? 'dejó vacío' : `escribió "${f}"`
    : f.noTiene ? 'marcó "No tiene"' : f.valor === '' ? 'dejó vacío' : `escribió "${f.valor}"`;

const enWeb = (v, esMedida) =>
  v === null ? 'A consultar' : v === 0 ? (esMedida ? '(imposible)' : 'No tiene') : String(v);

let fallos = 0;
for (const clave of ['ambientes','dormitorios','banos','cocheras','expensas','superficie_m2','frente_m','fondo_m']) {
  const v = creada[clave];
  const esMedida = ['superficie_m2','frente_m','fondo_m'].includes(clave);
  console.log(
    `${clave.padEnd(15)} | ${describir(formulario[clave]).padEnd(21)} | ` +
    `${String(v === null ? 'NULL' : v).padEnd(10)} | ${(v === null ? 'null' : typeof v).padEnd(7)} | ${enWeb(v, esMedida)}`
  );
  if (esMedida && v === 0) { console.log('   ^^ FALLA: una medida nunca debe quedar en 0'); fallos++; }
}

// --- Lo esperado ------------------------------------------------------------
console.log('\n=== CONTRA LO ESPERADO ===');
const esperado = { ambientes: 3, dormitorios: null, banos: 0, cocheras: 0, expensas: 15000.5, superficie_m2: 180, frente_m: null, fondo_m: null };
for (const [k, esp] of Object.entries(esperado)) {
  const real = creada[k] === null ? null : Number(creada[k]);
  const ok = real === esp;
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${k.padEnd(15)} base=${real}  esperado=${esp}`);
}

// --- Round-trip: reabrir y volver a guardar sin tocar nada ------------------
console.log('\n=== ROUND-TRIP: abrir a editar y guardar sin tocar nada ===');
console.log('    (acá aparecería el bug silencioso de confundir 0 con NULL)');
const recargado = {
  ambientes: contableDesdeDb(creada.ambientes),
  dormitorios: contableDesdeDb(creada.dormitorios),
  banos: contableDesdeDb(creada.banos),
  cocheras: contableDesdeDb(creada.cocheras),
  expensas: contableDesdeDb(creada.expensas),
  superficie_m2: medidaDesdeDb(creada.superficie_m2),
  frente_m: medidaDesdeDb(creada.frente_m),
  fondo_m: medidaDesdeDb(creada.fondo_m),
};
console.log('  cómo se ve el formulario al reabrir:');
for (const k of ['ambientes','dormitorios','banos','cocheras','expensas']) {
  const c = recargado[k];
  console.log(`    ${k.padEnd(13)} casilla "No tiene" ${c.noTiene ? 'MARCADA  ' : 'sin marcar'} | campo: ${c.valor === '' ? '(vacío)' : c.valor}`);
}

const reGuardado = {
  ambientes: contableADb(recargado.ambientes),
  dormitorios: contableADb(recargado.dormitorios),
  banos: contableADb(recargado.banos),
  cocheras: contableADb(recargado.cocheras),
  expensas: montoADb(recargado.expensas),
  superficie_m2: medidaADb(recargado.superficie_m2),
  frente_m: medidaADb(recargado.frente_m),
  fondo_m: medidaADb(recargado.fondo_m),
};

await sb.from('properties').update(reGuardado).eq('id', creada.id);
const { data: despues } = await sb
  .from('properties')
  .select('ambientes, dormitorios, banos, cocheras, expensas, superficie_m2, frente_m, fondo_m')
  .eq('id', creada.id)
  .single();

console.log('\n  campo           | antes  | después | cambió?');
for (const k of Object.keys(esperado)) {
  const a = creada[k] === null ? null : Number(creada[k]);
  const d = despues[k] === null ? null : Number(despues[k]);
  const cambio = a !== d;
  if (cambio) fallos++;
  console.log(`  ${k.padEnd(15)} | ${String(a ?? 'NULL').padEnd(6)} | ${String(d ?? 'NULL').padEnd(7)} | ${cambio ? 'SÍ  <- BUG SILENCIOSO' : 'no'}`);
}

// --- Limpieza ---------------------------------------------------------------
await limpiar();
const despuesDeLimpiar = await contarTodas();
console.log('\n=== LIMPIEZA ===');
console.log('  propiedades ahora:', despuesDeLimpiar, despuesDeLimpiar === antes ? '(igual que antes, OK)' : '<- NO COINCIDE');
if (despuesDeLimpiar !== antes) fallos++;

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
