/**
 * Cliente de Supabase para el BROWSER.
 *
 * Usa la publishable key (lo que Supabase antes llamaba "anon key"). Esa clave
 * es publica por diseno: viaja dentro del bundle del cliente. Lo que protege los
 * datos NO es la clave, es RLS: las policies de la Fase 1 solo dejan leer
 * propiedades con published = true, y `property_notes` no tiene ninguna policy
 * de lectura publica.
 *
 * Para leer datos desde el servidor (paginas con `prerender = false`) usar
 * `supabase-server.ts`, que aplica las mismas policies pero no depende de que
 * exista un browser.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY. ' +
      'Revisá el .env local y las Environment Variables de Vercel.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
