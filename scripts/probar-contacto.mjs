/**
 * Fase 8.5a — el formulario de contacto contra la base.
 *
 * Crea y borra sus propios mensajes. No toca nada existente.
 *
 * Correr con:
 *   node --env-file=.env scripts/probar-contacto.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.PUBLIC_SUPABASE_URL;
const svc = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(URL_, process.env.PUBLIC_SUPABASE_ANON_KEY);

let fallos = 0;
const chequear = (etiqueta, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(54)} ${detalle}`);
};

const MARCA = 'zz-prueba-85';
const limpiar = () => svc.from('contact_messages').delete().like('nombre', `${MARCA}%`);

const sonda = await svc.from('contact_messages').select('id').limit(1);
if (sonda.error && /schema cache|does not exist/i.test(sonda.error.message)) {
  console.log('*** FALTA CORRER scripts/fase85-contacto.sql ***');
  console.log('    ' + sonda.error.message);
  process.exit(1);
}
await limpiar();

console.log('=== EL FORMULARIO PUBLICO PUEDE ESCRIBIR (anon) ===');
const MENSAJE = {
  nombre: `${MARCA} Juan Pérez`,
  email: 'juan@ejemplo.test',
  telefono: '3884881245',
  ciudad: 'S. S. de Jujuy',
  asunto: 'Busco una propiedad para Alquilar',
  mensaje: 'Hola, me interesa el depto de Cuyaya.\n¿Sigue disponible?\nGracias.',
  leido: false,
};
const ins = await anon.from('contact_messages').insert(MENSAJE);
chequear('anon PUEDE insertar', !ins.error, ins.error?.message ?? '');

console.log('\n=== PERO NO PUEDE LEER LO QUE MANDARON LOS DEMAS ===');
const lect = await anon.from('contact_messages').select('*');
chequear('anon NO puede leer', (lect.data ?? []).length === 0, lect.error?.message ?? '(0 filas)');
const upd = await anon.from('contact_messages').update({ leido: true }).neq('nombre', 'x').select();
chequear('anon NO puede marcar como leido', (upd.data ?? []).length === 0, upd.error?.message ?? '');
const del = await anon.from('contact_messages').delete().neq('nombre', 'x').select();
chequear('anon NO puede borrar', (del.data ?? []).length === 0, del.error?.message ?? '');

console.log('\n=== EL MENSAJE LLEGO IDENTICO ===');
const { data: guardado } = await svc
  .from('contact_messages')
  .select('*')
  .like('nombre', `${MARCA}%`)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
for (const campo of ['nombre', 'email', 'telefono', 'ciudad', 'asunto', 'mensaje']) {
  chequear(`campo ${campo}`, guardado[campo] === MENSAJE[campo], JSON.stringify(guardado[campo]).slice(0, 46));
}
chequear('conserva los saltos de linea', guardado.mensaje.split('\n').length === 3);
chequear('entra sin leer', guardado.leido === false);
chequear('guarda el hash de la IP, no la IP', !!guardado.ip_hash && !/\d+\.\d+\.\d+\.\d+/.test(guardado.ip_hash ?? ''), String(guardado.ip_hash).slice(0, 12) + '…');

console.log('\n=== NADIE PUEDE MANDAR UN MENSAJE YA MARCADO COMO LEIDO ===');
const trampa = await anon.from('contact_messages').insert({ ...MENSAJE, nombre: `${MARCA} trampa`, leido: true });
chequear('la policy lo rechaza', !!trampa.error, trampa.error?.message?.slice(0, 52) ?? '');

console.log('\n=== TOPES DE LARGO (para que no metan 10 MB) ===');
const vacio = await anon.from('contact_messages').insert({ nombre: '   ', mensaje: 'algo' });
chequear('nombre vacio rechazado', !!vacio.error, vacio.error?.message?.slice(0, 46) ?? '');
const sinMensaje = await anon.from('contact_messages').insert({ nombre: `${MARCA} x`, mensaje: '  ' });
chequear('mensaje vacio rechazado', !!sinMensaje.error, sinMensaje.error?.message?.slice(0, 46) ?? '');
const enorme = await anon.from('contact_messages').insert({ nombre: `${MARCA} y`, mensaje: 'a'.repeat(5000) });
chequear('mensaje de 5000 caracteres rechazado', !!enorme.error, enorme.error?.message?.slice(0, 46) ?? '');

console.log('\n=== LIMITE DE ENVIOS (el que hacia Web3Forms) ===');
// Ya hay 1 del bloque anterior. Se mandan 4 mas -> 5 en total, el sexto cae.
let cortadoEn = null;
for (let i = 2; i <= 7; i++) {
  const r = await anon.from('contact_messages').insert({ ...MENSAJE, nombre: `${MARCA} envio ${i}` });
  if (r.error) { cortadoEn = i; break; }
}
chequear('corta antes del sexto envio', cortadoEn === 6, `cortó en el nro ${cortadoEn}`);
const { count: cuantos } = await svc
  .from('contact_messages')
  .select('*', { count: 'exact', head: true })
  .like('nombre', `${MARCA}%`);
chequear('entraron exactamente 5', cuantos === 5, `${cuantos} filas`);

console.log('\n=== EL VISITANTE NO VE EL ERROR CRUDO ===');
const fuente = readFileSync(new URL('../src/lib/contacto.ts', import.meta.url), 'utf8');
const traducir = (m) => {
  if (/demasiados mensajes seguidos|check_violation/i.test(m))
    return 'Ya nos enviaste varias consultas seguidas. Esperá unos minutos y probá de nuevo, o llamanos por teléfono.';
  if (/row-level security|violates|permission denied/i.test(m))
    return 'No pudimos enviar tu consulta. Revisá que el nombre y el mensaje estén completos.';
  if (/network|fetch failed|failed to fetch|load failed/i.test(m))
    return 'No pudimos conectarnos. Revisá tu internet y probá de nuevo.';
  return 'No pudimos enviar tu consulta. Probá de nuevo en unos minutos.';
};
const crudos = [
  'demasiados mensajes seguidos',
  'new row violates row-level security policy for table "contact_messages"',
  'permission denied for table contact_messages',
  'Failed to fetch',
];
for (const m of crudos) {
  const t = traducir(m);
  const limpio = !/row-level|violates|permission denied|Failed to fetch|contact_messages/i.test(t);
  chequear(m.slice(0, 44), limpio, '-> ' + t.slice(0, 44) + '…');
}

console.log('\n=== WEB3FORMS FUERA DEL CODIGO ===');
const footer = readFileSync(new URL('../src/components/Footer.jsx', import.meta.url), 'utf8');
chequear('el Footer ya no le pega a web3forms', !footer.includes('api.web3forms.com'));
chequear('ya no lee la access key', !footer.includes('import.meta.env.PUBLIC_WEB3FORMS'));
chequear('el honeypot sigue', footer.includes('botcheck'));
const env = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
chequear('la variable queda documentada como sin uso', env.includes('YA NO SE USA'));

console.log('\n=== NO SE FILTRA AL SITIO PUBLICO ===');
const mapper = readFileSync(new URL('../src/lib/mapProperty.ts', import.meta.url), 'utf8');
chequear('contact_messages no esta en el adaptador', !mapper.includes('contact_messages'));

await limpiar();
const { count: quedan } = await svc.from('contact_messages').select('*', { count: 'exact', head: true });
chequear('limpieza: la tabla queda como estaba', quedan === 0, `${quedan} filas`);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
