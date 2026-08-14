/**
 * Cliente de Supabase para el SERVIDOR.
 *
 * Se usa desde paginas y endpoints con `export const prerender = false`.
 *
 * >>> IMPORTANTE: usa la MISMA publishable key que el cliente del browser. <<<
 *
 * Eso es a proposito. El sitio publico solo necesita leer propiedades
 * publicadas, y de eso ya se encarga RLS. Usar la secret key acá seria saltear
 * RLS en todas las consultas del sitio publico y exponer, entre otras cosas,
 * las propiedades sin publicar y la tabla privada `property_notes`.
 *
 * La secret key (`SUPABASE_SERVICE_ROLE_KEY`) vive unicamente en
 * `scripts/migrate-data.mjs`, que corre en la maquina del dev y nunca se
 * despliega.
 *
 * La diferencia con `supabase.ts` es operativa, no de permisos:
 *  - lee las variables con `process.env` ademas de `import.meta.env`, porque en
 *    el runtime de Vercel las env vars llegan por `process.env`;
 *  - desactiva la persistencia de sesion, que en el servidor no tiene sentido y
 *    puede filtrar estado entre requests de distintos visitantes.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.PUBLIC_SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en el servidor. ' +
      'Revisá las Environment Variables de Vercel.'
  );
}

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
