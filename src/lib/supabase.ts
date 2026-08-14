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
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * `null` si faltan las credenciales. NO tira a nivel de módulo: un throw acá
 * rompe cualquier isla que lo importe, antes de que corra nada. Quien lo use
 * tiene que contemplar el `null`.
 *
 * Nota: acá la variable se lee SOLO de `import.meta.env`, porque este cliente
 * corre en el browser y ahí no existe `process.env`. Vite la inlinea en tiempo
 * de build, así que **un build hecho sin las variables no las recupera después**
 * — a diferencia del cliente de servidor, que puede caer a `process.env`.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
