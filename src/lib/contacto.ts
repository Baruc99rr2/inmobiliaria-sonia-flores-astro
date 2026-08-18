/**
 * Envío del formulario de contacto (Fase 8.5a).
 *
 * Reemplaza a Web3Forms. El mensaje va directo a `contact_messages` con la
 * publishable key: la policy de INSERT deja escribir a `anon`, que es la única
 * forma de que el formulario funcione sin que el visitante inicie sesión.
 *
 * ---
 * QUÉ SE PERDIÓ AL SACAR WEB3FORMS Y DÓNDE ESTÁ AHORA
 *
 *   Antifraude / rate limiting → trigger `contact_messages_guardia` en la base.
 *     NO acá: un límite en JavaScript se saltea abriendo la consola. Lo único
 *     que hace este archivo es el honeypot, que sí tiene sentido en el cliente
 *     porque su gracia es que el bot complete un campo que un humano no ve.
 *
 *   Aviso por correo → todavía nada. Los mensajes quedan en el panel. Está
 *     anotado en el §12 del plan: hoy la dueña tiene que entrar a mirarlos.
 *
 *   Validación de formato → las policies de la base, con topes de largo.
 *
 * ---
 * NO SE MUESTRA NUNCA EL ERROR CRUDO
 *
 * Alguien que quiere alquilar un departamento no tiene por qué leer
 * "new row violates row-level security policy". Peor: el mensaje del rate
 * limiting le diría a un atacante exactamente qué disparó el bloqueo.
 */
import { supabase } from './supabase';

export type DatosContacto = {
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  asunto: string;
  mensaje: string;
  /** El id visible de la propiedad, si el formulario se mandó desde una ficha. */
  propiedadLegacyId?: number | null;
};

export type ResultadoEnvio =
  | { ok: true }
  | { ok: false; error: string };

/**
 * De qué propiedad se está mirando la ficha, si es que hay una.
 *
 * Se saca de la URL y no de una prop: el formulario vive en el `Footer`, que
 * está en el layout y no sabe qué página lo contiene. Pasarle el dato por prop
 * obligaría a tocar el layout y todas las páginas.
 */
export function propiedadDeLaUrl(pathname: string): number | null {
  const m = pathname.match(/^\/propiedades\/(\d+)\/?$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Traduce los errores. El visitante nunca ve el original. */
export function traducirErrorDeContacto(mensaje: string): string {
  const m = String(mensaje ?? '');
  if (/demasiados mensajes seguidos|check_violation/i.test(m)) {
    return 'Ya nos enviaste varias consultas seguidas. Esperá unos minutos y probá de nuevo, o llamanos por teléfono.';
  }
  if (/row-level security|violates|permission denied/i.test(m)) {
    return 'No pudimos enviar tu consulta. Revisá que el nombre y el mensaje estén completos.';
  }
  if (/network|fetch failed|failed to fetch|load failed/i.test(m)) {
    return 'No pudimos conectarnos. Revisá tu internet y probá de nuevo.';
  }
  return 'No pudimos enviar tu consulta. Probá de nuevo en unos minutos.';
}

export async function enviarConsulta(d: DatosContacto): Promise<ResultadoEnvio> {
  if (!supabase) {
    return {
      ok: false,
      error: 'El formulario no está disponible en este momento. Llamanos por teléfono.',
    };
  }

  const nombre = d.nombre.trim();
  const mensaje = d.mensaje.trim();
  if (!nombre || !mensaje) {
    return { ok: false, error: 'Necesitamos al menos tu nombre y un mensaje.' };
  }

  // Envuelto entero: esta función NUNCA tira. Quien la llama apaga el estado de
  // "enviando" después de esperarla, y si acá saltara una excepción el botón
  // quedaría deshabilitado para siempre y el visitante sin forma de reintentar.
  try {
    // La propiedad se resuelve por `legacy_id`. Si falla, el mensaje se manda
    // igual sin ella: perder el vínculo es molesto, perder la consulta es peor.
    let propertyId: string | null = null;
    if (d.propiedadLegacyId) {
      const { data } = await supabase
        .from('properties')
        .select('id')
        .eq('legacy_id', d.propiedadLegacyId)
        .maybeSingle();
      propertyId = data?.id ?? null;
    }

    const { error } = await supabase.from('contact_messages').insert({
      nombre,
      email: d.email.trim(),
      telefono: d.telefono.trim(),
      ciudad: d.ciudad.trim(),
      asunto: d.asunto.trim(),
      mensaje,
      property_id: propertyId,
      property_legacy_id: d.propiedadLegacyId ?? null,
      leido: false,
    });

    if (error) {
      console.error('[contacto]', error.message);
      return { ok: false, error: traducirErrorDeContacto(error.message) };
    }

    return { ok: true };
  } catch (e) {
    console.error('[contacto] excepción:', e);
    return { ok: false, error: traducirErrorDeContacto(String((e as Error)?.message ?? e)) };
  }
}
