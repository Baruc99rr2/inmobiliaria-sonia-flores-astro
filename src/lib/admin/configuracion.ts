/**
 * Lectura y guardado de los datos de contacto desde el panel (Fase 6.6).
 *
 * La tabla `site_settings` tiene UNA sola fila, garantizado por un
 * `check (id = 1)` en la base. Acá no se inserta ni se borra nunca: solo se
 * actualiza esa fila. El panel no tiene permiso para lo otro (ver
 * `scripts/fase66-configuracion-sitio.sql`).
 */
import { supabase } from '../supabase';
import type { ConfiguracionSitio } from '../configuracion-sitio';

export type { ConfiguracionSitio };

export const CONFIGURACION_VACIA: ConfiguracionSitio = {
  telefono: '',
  horario: '',
  matricula: '',
  email: '',
};

export async function obtenerConfiguracion(): Promise<
  { ok: true; configuracion: ConfiguracionSitio } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const { data, error } = await supabase
    .from('site_settings')
    .select('telefono, horario, matricula, email')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('[admin] obtenerConfiguracion:', error.message);
    // Caso concreto y distinto: la migración todavía no se corrió. Sin este
    // mensaje, "no pudimos traer los datos" manda a buscar un problema de red
    // que no existe.
    if (/could not find the table|does not exist|PGRST205/i.test(error.message)) {
      return {
        ok: false,
        error:
          'Todavía no está creada la tabla de configuración. Avisale al desarrollador que ' +
          'falta correr la migración “fase66-configuracion-sitio.sql”. Mientras tanto, en la ' +
          'web se muestran los datos de contacto de siempre.',
      };
    }
    return { ok: false, error: 'No pudimos traer los datos de contacto.' };
  }
  if (!data) {
    return {
      ok: false,
      error:
        'Falta la fila de configuración en la base. Avisale al desarrollador: hay que correr la migración.',
    };
  }

  return {
    ok: true,
    configuracion: {
      telefono: data.telefono ?? '',
      horario: data.horario ?? '',
      matricula: data.matricula ?? '',
      email: data.email ?? '',
    },
  };
}

export async function guardarConfiguracion(c: ConfiguracionSitio) {
  if (!supabase) return { ok: false as const, error: 'No hay conexión con la base de datos.' };

  // El teléfono es el único obligatorio: es lo que hace que la ficha sirva de
  // algo. El resto puede quedar vacío, que es una decisión válida (§2.3).
  if (!c.telefono.trim()) {
    return { ok: false as const, error: 'Poné un teléfono: es lo que ve quien quiere consultar.' };
  }

  const { error } = await supabase
    .from('site_settings')
    .update({
      telefono: c.telefono.trim(),
      horario: c.horario.trim(),
      matricula: c.matricula.trim(),
      email: c.email.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1);

  if (error) {
    console.error('[admin] guardarConfiguracion:', error.message);
    return { ok: false as const, error: 'No pudimos guardar los datos de contacto.' };
  }

  return { ok: true as const };
}
