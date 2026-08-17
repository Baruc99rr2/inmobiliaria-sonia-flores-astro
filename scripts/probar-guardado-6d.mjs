/**
 * Verifica qué queda en la base para dirección, servicios y adicionales.
 *
 * Trabaja SOLO sobre una propiedad de prueba que crea y borra. No toca ninguna
 * fila existente.
 *
 * Correr con:
 *   node --env-file=.env scripts/probar-guardado-6d.mjs
 */
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const SLUG = 'zz-prueba-6d';

const contar = async (tabla) =>
  (await sb.from(tabla).select('*', { count: 'exact', head: true })).count;

const limpiar = async () => {
  const { data } = await sb.from('properties').select('id').like('slug', 'zz-prueba-%');
  for (const p of data ?? []) {
    // property_services cae solo por la clave foránea en cascada, pero se borra
    // explícito para no depender de eso en una prueba.
    await sb.from('property_services').delete().eq('property_id', p.id);
    await sb.from('properties').delete().eq('id', p.id);
  }
};

const propsAntes = await contar('properties');
const svcAntes = await contar('property_services');
console.log('antes -> properties:', propsAntes, '| property_services:', svcAntes);
await limpiar();

// --- Alta con dirección, adicionales y servicios ---------------------------
const { data: creada, error } = await sb
  .from('properties')
  .insert({
    slug: SLUG,
    name: 'ZZ prueba 6d',
    operation: 'alquiler',
    published: false,
    calle: 'Belgrano',
    numero: '800',
    show_exact_address: true,
    hide_location: false,
    adicionales: ['Asador', 'Balcón', 'Cerca del centro'],
  })
  .select('id, calle, numero, show_exact_address, hide_location, adicionales')
  .single();

if (error) {
  console.log('ERROR al insertar:', error.message);
  await limpiar();
  process.exit(1);
}

const { data: servicios } = await sb.from('services').select('id, label').in('slug', ['agua', 'luz', 'gas']);
await sb.from('property_services').insert(servicios.map((s) => ({ property_id: creada.id, service_id: s.id })));

let fallos = 0;
const chequear = (etiqueta, obtenido, esperado) => {
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) fallos++;
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${etiqueta.padEnd(42)} ${JSON.stringify(obtenido)}`);
};

console.log('\n=== DIRECCIÓN Y ADICIONALES EN LA BASE ===');
chequear('calle', creada.calle, 'Belgrano');
chequear('numero', creada.numero, '800');
chequear('show_exact_address', creada.show_exact_address, true);
chequear('hide_location', creada.hide_location, false);
chequear('adicionales (text[])', creada.adicionales, ['Asador', 'Balcón', 'Cerca del centro']);

const { data: svcGuardados } = await sb
  .from('property_services')
  .select('services ( slug )')
  .eq('property_id', creada.id);
console.log('\n=== SERVICIOS ===');
chequear('los 3 marcados', (svcGuardados ?? []).map((r) => r.services.slug).sort(), ['agua', 'gas', 'luz']);

// --- Diferencia: quitar uno y agregar otro ---------------------------------
const { data: pav } = await sb.from('services').select('id').eq('slug', 'pavimento').single();
const { data: gas } = await sb.from('services').select('id').eq('slug', 'gas').single();
await sb.from('property_services').insert({ property_id: creada.id, service_id: pav.id });
await sb.from('property_services').delete().eq('property_id', creada.id).in('service_id', [gas.id]);

const { data: svcDespues } = await sb
  .from('property_services')
  .select('services ( slug )')
  .eq('property_id', creada.id);
console.log('\n=== DESPUÉS DE DESMARCAR GAS Y MARCAR PAVIMENTO ===');
chequear('quedan agua, luz, pavimento', (svcDespues ?? []).map((r) => r.services.slug).sort(), ['agua', 'luz', 'pavimento']);

// --- Ubicación reservada ---------------------------------------------------
await sb.from('properties').update({ hide_location: true }).eq('id', creada.id);
const { data: oculta } = await sb
  .from('properties')
  .select('hide_location, calle, numero, lat, lon')
  .eq('id', creada.id)
  .single();
console.log('\n=== UBICACIÓN RESERVADA ===');
chequear('hide_location', oculta.hide_location, true);
chequear('la calle NO se borra de la base', oculta.calle, 'Belgrano');
console.log('       (se oculta al mostrar, no se pierde el dato: si lo desmarca, vuelve)');

// --- Limpieza --------------------------------------------------------------
await limpiar();
const propsDespues = await contar('properties');
const svcDespuesTotal = await contar('property_services');
console.log('\n=== LIMPIEZA ===');
console.log('  properties        :', propsDespues, propsDespues === propsAntes ? '(igual que antes, OK)' : '<- NO COINCIDE');
console.log('  property_services :', svcDespuesTotal, svcDespuesTotal === svcAntes ? '(igual que antes, OK)' : '<- NO COINCIDE');
if (propsDespues !== propsAntes || svcDespuesTotal !== svcAntes) fallos++;

console.log('\n' + (fallos === 0 ? 'TODO OK' : fallos + ' PROBLEMAS'));
process.exit(fallos === 0 ? 0 : 1);
