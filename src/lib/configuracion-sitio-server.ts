/**
 * Lectura de los datos de contacto desde el SERVIDOR (Fase 6.6).
 *
 * >>> Solo se importa desde `.astro` con `prerender = false`. NUNCA desde un
 * componente de React que corra en el browser. <<<
 *
 * `supabase-server` arrastra `debug-env.ts`, que lee `process.env`. En el
 * browser `process` no existe, y con eso se rompe la hidratación de la isla
 * entera: la ficha se quedó sin descripción, sin requisitos y sin contacto.
 * Por eso la parte pura —el tipo, los valores por defecto y los armadores de
 * texto— vive en `configuracion-sitio.ts`, que sí puede importarse desde el
 * cliente.
 */
import { supabaseServer } from './supabase-server';
import { CONFIGURACION_POR_DEFECTO, type ConfiguracionSitio } from './configuracion-sitio';

/**
 * Nunca tira y nunca devuelve vacío donde el default tiene algo.
 *
 * El fallback no es un detalle: si Supabase no responde, o si todavía no se
 * corrió la migración que crea `site_settings`, la ficha tiene que seguir
 * mostrando un teléfono. Una inmobiliaria sin forma de contacto es peor que una
 * sin fotos.
 */
export async function getConfiguracionSitio(): Promise<ConfiguracionSitio> {
  if (!supabaseServer) return CONFIGURACION_POR_DEFECTO;

  try {
    const { data, error } = await supabaseServer
      .from('site_settings')
      .select('telefono, horario, matricula, email')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      if (error) console.error('[configuracion-sitio]', error.message);
      return CONFIGURACION_POR_DEFECTO;
    }

    // Campo por campo: si la dueña vacía el horario pero deja el teléfono,
    // queremos su teléfono y el horario por defecto, no todo el default.
    return {
      telefono: data.telefono?.trim() || CONFIGURACION_POR_DEFECTO.telefono,
      horario: data.horario?.trim() || CONFIGURACION_POR_DEFECTO.horario,
      matricula: data.matricula?.trim() || CONFIGURACION_POR_DEFECTO.matricula,
      email: data.email?.trim() ?? '',
    };
  } catch (e) {
    console.error('[configuracion-sitio]', e);
    return CONFIGURACION_POR_DEFECTO;
  }
}
