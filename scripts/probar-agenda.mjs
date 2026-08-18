/**
 * Fase 8b — fechas, grilla del mes y privacidad de la agenda.
 *
 * La parte de fechas corre sin base. La de la base crea y borra sus propias
 * filas; si todavía no se corrió `scripts/fase8-agenda.sql`, lo dice y sale.
 *
 * Correr con:
 *   node --env-file=.env scripts/probar-agenda.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Copias de src/lib/admin/agenda.ts
const claveDia = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const desdeClave = (c) => {
  const [a, m, d] = c.split('-').map(Number);
  return new Date(a, m - 1, d);
};
const celdasDelMes = (anio, mes) => {
  const primero = new Date(anio, mes, 1);
  const desp = (primero.getDay() + 6) % 7;
  const dias = new Date(anio, mes + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < desp; i++) celdas.push(null);
  for (let d = 1; d <= dias; d++) celdas.push(new Date(anio, mes, d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
};

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(52)} ${JSON.stringify(obtenido)}`);
  if (!ok) console.log(`       se esperaba ${JSON.stringify(esperado)}`);
};

console.log('=== LA TRAMPA DE UTC (el bug que esto evita) ===');
const d18 = new Date(2026, 7, 18); // 18 de agosto de 2026, local
chequear('claveDia da el dia LOCAL', claveDia(d18), '2026-08-18');
// El atajo tipico: parsear 'AAAA-MM-DD' con `new Date(texto)`. Eso lo toma como
// medianoche UTC, que en Jujuy (UTC-3) es el dia ANTERIOR a las 21:00. Leerle
// getDate() devuelve 17 en vez de 18.
const conNewDate = new Date('2026-08-18');
chequear('el atajo `new Date(texto)` CORRE EL DIA', conNewDate.getDate(), 17);
chequear('desdeClave() no lo corre', desdeClave('2026-08-18').getDate(), 18);
console.log(`       (huso local: UTC${-d18.getTimezoneOffset() / 60})`);
chequear('ida y vuelta sin desfase', claveDia(desdeClave('2026-08-18')), '2026-08-18');
chequear('primero de mes', claveDia(desdeClave('2026-01-01')), '2026-01-01');
chequear('ultimo de mes', claveDia(desdeClave('2026-12-31')), '2026-12-31');
// Un dia de cambio de hora en el hemisferio sur, por las dudas.
chequear('mediados de febrero', claveDia(desdeClave('2027-02-14')), '2027-02-14');

console.log('\n=== GRILLA DEL MES ===');
const ago = celdasDelMes(2026, 7); // agosto 2026
chequear('siempre semanas completas', ago.length % 7, 0);
chequear('tiene los 31 dias', ago.filter(Boolean).length, 31);
// El 1 de agosto de 2026 cae sabado -> 5 huecos antes (lun..vie)
chequear('huecos antes del dia 1', ago.findIndex(Boolean), 5);
chequear('el dia 1 va en la columna del sabado', ago.findIndex(Boolean) % 7, 5);

const feb = celdasDelMes(2027, 1); // febrero 2027, no bisiesto
chequear('febrero 2027 tiene 28', feb.filter(Boolean).length, 28);
const bis = celdasDelMes(2028, 1); // 2028 es bisiesto
chequear('febrero 2028 tiene 29', bis.filter(Boolean).length, 29);

// La semana arranca en lunes: un mes que empieza lunes no lleva huecos.
const mesQueEmpiezaLunes = celdasDelMes(2026, 5); // junio 2026 empieza lunes
chequear('junio 2026 empieza lunes, sin huecos', mesQueEmpiezaLunes.findIndex(Boolean), 0);

console.log('\n=== NAVEGACION ENTRE MESES ===');
const irA = (a, m, delta) => {
  const d = new Date(a, m + delta, 1);
  return [d.getFullYear(), d.getMonth()];
};
chequear('de enero para atras -> diciembre anterior', irA(2026, 0, -1), [2025, 11]);
chequear('de diciembre para adelante -> enero', irA(2026, 11, 1), [2027, 0]);

// --- Base de datos ---------------------------------------------------------
const svc = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.PUBLIC_SUPABASE_ANON_KEY);

const sonda = await svc.from('agenda_notes').select('dia').limit(1);
if (sonda.error && /schema cache|does not exist/i.test(sonda.error.message)) {
  console.log('\n*** FALTA CORRER scripts/fase8-agenda.sql ***');
  console.log('    ' + sonda.error.message);
  console.log('\n' + (fallos === 0 ? 'La logica de fechas: TODO OK' : fallos + ' PROBLEMAS'));
  process.exit(fallos === 0 ? 0 : 1);
}

console.log('\n=== PRIVACIDAD: ANON NO TOCA agenda_notes ===');
const l = await anon.from('agenda_notes').select('*');
chequear('anon NO puede leer', (l.data ?? []).length === 0, true);
console.log('       ' + (l.error?.message ?? '(0 filas)'));
const e = await anon.from('agenda_notes').insert({ dia: '2026-01-01', body: 'zz' }).select();
chequear('anon NO puede escribir', (e.data ?? []).length === 0, true);
console.log('       ' + (e.error?.message ?? ''));

console.log('\n=== ROUND-TRIP ===');
const DIA = '2099-12-31'; // lejos de cualquier dato real
await svc.from('agenda_notes').delete().eq('dia', DIA);

const TEXTO = 'Llamó el dueño de Cuyaya\nVisita 17 hs en Alto Comedero\nLlevar las llaves';
const { error: eUp } = await svc.from('agenda_notes').upsert({ dia: DIA, body: TEXTO }, { onConflict: 'dia' });
chequear('se guarda', !eUp, true);
const { data: leida } = await svc.from('agenda_notes').select('dia, body, updated_at').eq('dia', DIA).single();
chequear('el texto vuelve identico', leida.body === TEXTO, true);
chequear('conserva los 3 renglones', leida.body.split('\n').length, 3);
chequear('el dia se guarda sin correrse', String(leida.dia).slice(0, 10), DIA);

const antes = leida.updated_at;
await new Promise((r) => setTimeout(r, 1100));
await svc.from('agenda_notes').upsert({ dia: DIA, body: TEXTO + '\nY una cuarta' }, { onConflict: 'dia' });
const { data: tras } = await svc.from('agenda_notes').select('body, updated_at').eq('dia', DIA).single();
chequear('el upsert ACTUALIZA, no duplica', tras.body.split('\n').length, 4);
chequear('updated_at lo mueve el trigger', tras.updated_at !== antes, true);
const { count: cuantas } = await svc.from('agenda_notes').select('*', { count: 'exact', head: true }).eq('dia', DIA);
chequear('hay UNA sola fila para ese dia', cuantas, 1);

console.log('\n=== VACIAR BORRA LA FILA (para que no quede punto sin nota) ===');
await svc.from('agenda_notes').delete().eq('dia', DIA);
const { count: trasBorrar } = await svc.from('agenda_notes').select('*', { count: 'exact', head: true }).eq('dia', DIA);
chequear('la fila se fue', trasBorrar, 0);

console.log('\n=== NO SE FILTRA AL SITIO PUBLICO ===');
const mapper = readFileSync(new URL('../src/lib/mapProperty.ts', import.meta.url), 'utf8');
const publica = readFileSync(new URL('../src/lib/properties.ts', import.meta.url), 'utf8');
chequear('agenda_notes no esta en el adaptador', !mapper.includes('agenda_notes'), true);
chequear('ni en la capa de datos publica', !publica.includes('agenda_notes'), true);
const { execSync } = await import('node:child_process');
const usos = execSync('git grep -l "admin/agenda" -- src/ || true', { encoding: 'utf8' }).split('\n').filter(Boolean);
chequear('solo lo importa el panel', usos.every((f) => f.includes('/admin/')), true);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
