/**
 * Fase 8a — privacidad y round-trip de las notas de propiedad.
 *
 * Crea y borra su propia nota. No toca datos existentes.
 *
 * Correr con:
 *   node --env-file=.env scripts/probar-notas.mjs
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const URL_ = process.env.PUBLIC_SUPABASE_URL;
const svc = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(URL_, process.env.PUBLIC_SUPABASE_ANON_KEY);

let fallos = 0;
const chequear = (etiqueta, ok, detalle = '') => {
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(52)} ${detalle}`);
};

console.log('=== PRIVACIDAD: ANON NO TOCA property_notes ===');
const lect = await anon.from('property_notes').select('*');
chequear('anon NO puede leer', (lect.data ?? []).length === 0, lect.error?.message ?? '(0 filas)');
const esc = await anon.from('property_notes').insert({ body: 'zz' }).select();
chequear('anon NO puede escribir', (esc.data ?? []).length === 0, esc.error?.message ?? '');
const del = await anon.from('property_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
chequear('anon NO puede borrar', !!del.error || (del.data ?? []).length === 0, del.error?.message ?? '');

console.log('\n=== ROUND-TRIP CONTRA LA BASE ===');
const { data: prop } = await svc.from('properties').select('id, codigo').eq('codigo', 1).single();
await svc.from('property_notes').delete().eq('property_id', prop.id).like('body', 'zz-prueba-8a%');

const TEXTO = 'zz-prueba-8a — el dueño acepta hasta $50.000 menos.\nLlamar antes de las 18.\n"Comillas", tildes y ñ.';
const { data: creada, error: eIns } = await svc
  .from('property_notes')
  .insert({ property_id: prop.id, body: TEXTO })
  .select('id, body, updated_at')
  .single();
chequear('se crea la nota', !eIns, eIns?.message ?? '');

const { data: leida } = await svc
  .from('property_notes')
  .select('body, updated_at')
  .eq('id', creada.id)
  .single();
chequear('el texto vuelve IDENTICO', leida.body === TEXTO);
chequear('sobreviven los saltos de linea', (leida.body.match(/\n/g) ?? []).length === 2);
chequear('sobreviven tildes, ñ y comillas', /ñ/.test(leida.body) && /"Comillas"/.test(leida.body));

const antes = leida.updated_at;
await new Promise((r) => setTimeout(r, 1100));
const NUEVO = TEXTO + '\nSegunda edición.';
await svc.from('property_notes').update({ body: NUEVO }).eq('id', creada.id);
const { data: tras } = await svc
  .from('property_notes')
  .select('body, updated_at')
  .eq('id', creada.id)
  .single();
chequear('la edicion se guarda', tras.body === NUEVO);
chequear('updated_at lo mueve el trigger solo', tras.updated_at !== antes, `${antes} -> ${tras.updated_at}`);

console.log('\n=== NO SE FILTRA AL SITIO PUBLICO ===');
const mapper = readFileSync(new URL('../src/lib/mapProperty.ts', import.meta.url), 'utf8');
chequear('property_notes NO esta en PROPERTY_SELECT', !mapper.includes('property_notes'));
const libPublica = readFileSync(new URL('../src/lib/properties.ts', import.meta.url), 'utf8');
chequear('ni en la capa de datos publica', !libPublica.includes('property_notes'));

// Ningun componente publico puede importar el modulo de notas.
const { execSync } = await import('node:child_process');
const usos = execSync('git grep -l "admin/notas" -- src/ || true', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);
const fueraDeAdmin = usos.filter((f) => !f.includes('/admin/'));
chequear('solo lo importa el panel', fueraDeAdmin.length === 0, usos.join(' '));

// --- Limpieza --------------------------------------------------------------
await svc.from('property_notes').delete().eq('id', creada.id);
const { count } = await svc.from('property_notes').select('*', { count: 'exact', head: true });
chequear('la tabla vuelve a como estaba', count === 0, `${count} filas`);

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
