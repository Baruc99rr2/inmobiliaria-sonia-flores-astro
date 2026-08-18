/**
 * Notas privadas de una propiedad (Fase 8a).
 *
 * >>> ESTO NO SE PUBLICA NUNCA. <<<
 *
 * `property_notes` no tiene ninguna policy de lectura para `anon`: verificado
 * contra la base real, un fetch anónimo devuelve
 * "permission denied for table property_notes". Además la tabla no aparece en
 * `PROPERTY_SELECT` (`src/lib/mapProperty.ts`), que es lo único que consulta el
 * sitio público. Son dos barreras y las dos tienen que seguir en pie.
 *
 * ---
 * UNA NOTA POR PROPIEDAD, PERO LA TABLA ACEPTA VARIAS
 *
 * El esquema no tiene `unique (property_id)`, así que en teoría podrían existir
 * dos filas para la misma propiedad. La interfaz maneja una sola. Para que eso
 * nunca muestre una nota vieja, se lee **la más reciente por `updated_at`** y
 * se escribe siempre sobre esa. No se borran las otras: si alguna vez aparece
 * una, es un dato que alguien escribió y no me corresponde tirarlo.
 *
 * `updated_at` lo actualiza el trigger `property_notes_touch` de la Fase 1
 * —comprobado—, así que no se manda desde acá.
 */
import { supabase } from '../supabase';

export type Nota = {
  id: string;
  body: string;
  updated_at: string;
};

export async function obtenerNota(
  propiedadId: string
): Promise<{ ok: true; nota: Nota | null } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const { data, error } = await supabase
    .from('property_notes')
    .select('id, body, updated_at')
    .eq('property_id', propiedadId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[admin] obtenerNota:', error.message);
    return { ok: false, error: 'No pudimos traer las notas de esta propiedad.' };
  }

  return { ok: true, nota: data?.[0] ?? null };
}

/**
 * Guarda la nota. Crea la fila la primera vez.
 *
 * Devuelve la nota resultante para que la pantalla se quede con el `id` recién
 * creado; si no, el segundo autosave insertaría una fila nueva en vez de
 * actualizar la primera y quedarían dos.
 */
export async function guardarNota({
  propiedadId,
  notaId,
  body,
}: {
  propiedadId: string;
  notaId: string | null;
  body: string;
}): Promise<{ ok: true; nota: Nota } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  if (notaId) {
    const { data, error } = await supabase
      .from('property_notes')
      .update({ body })
      .eq('id', notaId)
      .select('id, body, updated_at')
      .single();

    if (error) {
      console.error('[admin] guardarNota update:', error.message);
      return { ok: false, error: 'No pudimos guardar la nota. Revisá tu conexión.' };
    }
    return { ok: true, nota: data };
  }

  const { data, error } = await supabase
    .from('property_notes')
    .insert({ property_id: propiedadId, body })
    .select('id, body, updated_at')
    .single();

  if (error) {
    console.error('[admin] guardarNota insert:', error.message);
    return { ok: false, error: 'No pudimos guardar la nota. Revisá tu conexión.' };
  }
  return { ok: true, nota: data };
}

/**
 * "hace un momento" / "hoy a las 14:32" / "el 12/8 a las 09:05".
 *
 * Sin "hace 3 minutos" ni cuentas relativas más finas: obligan a un temporizador
 * que refresque el texto, y para saber cuándo tomó una nota alcanza con la hora.
 */
export function cuandoSeEdito(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const segundos = (Date.now() - d.getTime()) / 1000;
  if (segundos < 60) return 'hace un momento';

  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const mismoDia =
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear();

  return mismoDia ? `hoy a las ${hora}` : `el ${d.getDate()}/${d.getMonth() + 1} a las ${hora}`;
}
