/**
 * Cliente de Supabase para el SERVIDOR.
 *
 * Se usa desde páginas y endpoints con `export const prerender = false`.
 *
 * >>> IMPORTANTE: usa la MISMA publishable key que el cliente del browser. <<<
 *
 * Eso es a propósito. El sitio público solo necesita leer propiedades
 * publicadas, y de eso ya se encarga RLS. Usar la secret key acá sería saltear
 * RLS en todas las consultas del sitio público y exponer, entre otras cosas,
 * las propiedades sin publicar y la tabla privada `property_notes`.
 *
 * La secret key (`SUPABASE_SERVICE_ROLE_KEY`) vive únicamente en
 * `scripts/migrate-data.mjs`, que corre en la máquina del dev y nunca se
 * despliega.
 *
 * Las variables se leen de `import.meta.env` y de `process.env`. Las dos hacen
 * falta: Vite inlinea `import.meta.env.PUBLIC_*` en tiempo de BUILD, así que un
 * build hecho antes de cargar las variables las deja en `undefined`; en ese caso
 * `process.env` las levanta en tiempo de EJECUCIÓN, que es como las inyecta
 * Vercel.
 *
 * ---
 *
 * POR QUÉ ESTE MÓDULO NO TIRA SI FALTAN LAS VARIABLES
 *
 * La primera versión hacía `throw` acá arriba. Eso rompía el sitio entero: el
 * throw ocurre al importar el módulo, o sea ANTES de que corra cualquier lógica
 * de fallback, así que las tres páginas devolvían 500 en vez de caer a
 * `data.jsx`. Justo lo contrario de lo que el fallback existe para evitar.
 *
 * Ahora, si faltan las variables, `supabaseServer` queda en `null` y las
 * funciones de `properties.ts` lo tratan como "la consulta falló": el sitio
 * sirve `data.jsx` y sigue en pie.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { diagnosticarCredenciales } from './debug-env';

const urlBuild = import.meta.env.PUBLIC_SUPABASE_URL;
const urlRuntime = process.env.PUBLIC_SUPABASE_URL;
const keyBuild = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const keyRuntime = process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = urlBuild ?? urlRuntime;
const supabaseAnonKey = keyBuild ?? keyRuntime;

// Permanente, detrás de DEBUG_SUPABASE=1. Ver el porqué en debug-env.ts.
diagnosticarCredenciales({
  contexto: 'cliente de servidor (supabase-server.ts)',
  urlBuild,
  urlRuntime,
  keyBuild,
  keyRuntime,
});

/** `null` si faltan las credenciales. Nunca tira. */
export const supabaseServer: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

if (!supabaseServer) {
  console.error(
    '[supabase-server] Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY. ' +
      'El sitio va a servir el fallback de data.jsx. ' +
      'Cargalas en Vercel > Project Settings > Environment Variables.'
  );
}
