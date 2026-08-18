/**
 * Los mensajes del formulario de contacto, desde el panel (Fase 8.5b).
 *
 * `contact_messages` es la única tabla del proyecto donde `anon` puede escribir
 * —si no, el formulario público no funcionaría— pero NO puede leer. Acá se lee
 * con la sesión de la dueña, que sí tiene la policy de SELECT.
 */
import { supabase } from '../supabase';

export type Mensaje = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  asunto: string;
  mensaje: string;
  leido: boolean;
  created_at: string;
  property_legacy_id: number | null;
  propiedadNombre: string | null;
};

export type Filtro = 'sin-leer' | 'todos';

/**
 * Trae los mensajes, el más nuevo primero.
 *
 * El nombre de la propiedad viene por la relación, en la misma consulta: sin
 * eso habría que pedir una propiedad por mensaje, y con veinte consultas en
 * pantalla son veinte viajes de red.
 */
export async function obtenerMensajes(
  filtro: Filtro
): Promise<{ ok: true; mensajes: Mensaje[] } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  let q = supabase
    .from('contact_messages')
    .select(
      'id, nombre, email, telefono, ciudad, asunto, mensaje, leido, created_at, property_legacy_id, properties ( name )'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filtro === 'sin-leer') q = q.eq('leido', false);

  const { data, error } = await q;
  if (error) {
    console.error('[admin] obtenerMensajes:', error.message);
    return { ok: false, error: 'No pudimos traer los mensajes.' };
  }

  return {
    ok: true,
    mensajes: (data ?? []).map((m: any) => ({
      id: m.id,
      nombre: m.nombre ?? '',
      email: m.email ?? '',
      telefono: m.telefono ?? '',
      ciudad: m.ciudad ?? '',
      asunto: m.asunto ?? '',
      mensaje: m.mensaje ?? '',
      leido: m.leido === true,
      created_at: m.created_at,
      property_legacy_id: m.property_legacy_id ?? null,
      propiedadNombre: m.properties?.name ?? null,
    })),
  };
}

export async function marcarLeido(
  id: string,
  leido: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const { error } = await supabase.from('contact_messages').update({ leido }).eq('id', id);
  if (error) {
    console.error('[admin] marcarLeido:', error.message);
    return { ok: false, error: 'No pudimos marcar el mensaje. Probá de nuevo.' };
  }
  return { ok: true };
}

/** Cuántos hay sin leer, para el contador del menú. */
export async function contarSinLeer(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('contact_messages')
    .select('*', { count: 'exact', head: true })
    .eq('leido', false);
  if (error) return 0;
  return count ?? 0;
}

/**
 * "hoy 14:32" / "ayer 09:05" / "12/8 09:05".
 *
 * Una consulta de hace dos horas y una de hace tres semanas se atienden
 * distinto, así que la fecha tiene que leerse de un vistazo.
 */
export function cuandoLlego(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const mismoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  if (mismoDia(d, hoy)) return `hoy ${hora}`;
  if (mismoDia(d, ayer)) return `ayer ${hora}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hora}`;
}

/** El enlace para responder: WhatsApp si hay teléfono, si no el correo. */
export function comoResponder(m: Mensaje): { href: string; etiqueta: string } | null {
  const tel = m.telefono.replace(/[^\d]/g, '');
  if (tel.length >= 8) {
    // Argentina: se antepone 549 si no vino con código de país.
    const numero = tel.startsWith('54') ? tel : `549${tel}`;
    return { href: `https://wa.me/${numero}`, etiqueta: 'Responder por WhatsApp' };
  }
  if (m.email.includes('@')) {
    return { href: `mailto:${m.email}`, etiqueta: 'Responder por correo' };
  }
  return null;
}
