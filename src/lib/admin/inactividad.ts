/**
 * Cierre de sesión por inactividad (Fase 6f).
 *
 * ---
 * POR QUÉ NO ALCANZA CON LO QUE TRAE SUPABASE
 *
 * Supabase Auth tiene un "Inactivity timeout" del lado del servidor, pero no
 * sirve para lo que hace falta acá, por tres motivos:
 *
 *  1. Es de plan Pro para arriba. Este proyecto está en el plan gratuito.
 *  2. Para el servidor, "actividad" es que se REFRESQUE EL TOKEN, no que haya
 *     una persona usando el panel. `supabase-js` refresca solo, en segundo
 *     plano, mientras la pestaña esté abierta: una sesión abandonada se
 *     mantendría viva sola. Es exactamente el temporizador de fondo que no
 *     queremos.
 *  3. Se aplica de forma perezosa —"whenever a session is refreshed next"—, así
 *     que la duración real es el timeout configurado MÁS lo que le quede al JWT.
 *
 * Conviene igual activarlo cuando el proyecto pase a Pro, como red de fondo para
 * las sesiones cuya pestaña se cerró. Pero lo que protege el caso real —el
 * teléfono desbloqueado que queda sobre el mostrador— es esto, del lado del
 * cliente. Ver `§12` del plan.
 *
 * ---
 * EL UMBRAL
 *
 * 20 minutos sin actividad, con aviso a los 15.
 *
 * El razonamiento, que es un balance y no un número mágico:
 *
 *  - Corto de más obliga a escribir la contraseña seguido en un teclado de
 *    celular, y eso termina en una contraseña corta y fácil. El remedio sería
 *    peor que la enfermedad.
 *  - Largo de más deja el panel entero abierto en un teléfono que se presta.
 *  - El umbral solo corre con la pantalla QUIETA: mientras trabaja se reinicia
 *    con cada tecla, toque o scroll. 20 minutos de no tocar nada es más que una
 *    interrupción normal (un llamado, un cliente que entra) y bastante menos que
 *    "quedó abierto toda la tarde".
 *  - Y sobre todo: como el borrador se guarda en el teléfono y se recupera al
 *    volver, que la sesión se cierre cuesta un login, no el trabajo. Eso es lo
 *    que permite elegir un umbral corto sin castigarla.
 */

/** Sin tocar nada por este tiempo, se cierra la sesión. */
export const INACTIVIDAD_MS = 20 * 60 * 1000;

/** Cuánto antes del cierre aparece el aviso. */
export const AVISO_MS = 5 * 60 * 1000;

/**
 * Cada cuánto se revisa. Es un intervalo corto que compara contra el reloj y NO
 * un `setTimeout` largo, a propósito: cuando el teléfono se suspende los
 * temporizadores se congelan. Si el cierre dependiera de un `setTimeout` de 20
 * minutos, un teléfono que durmió media hora despertaría con la sesión abierta.
 * Midiendo contra `Date.now()` en cada tick, el tiempo dormido cuenta como
 * inactividad, que es lo correcto.
 */
export const TICK_MS = 15 * 1000;

/** Dónde se anota la última actividad, compartido entre pestañas. */
export const CLAVE_ACTIVIDAD = 'sf.admin.ultima-actividad';

export type Fase = 'activa' | 'por-cerrar' | 'cerrada';

/** En qué fase está la sesión, dado cuándo fue la última actividad. */
export function faseDeSesion(ultimaActividad: number, ahora: number): Fase {
  const inactiva = ahora - ultimaActividad;
  if (inactiva >= INACTIVIDAD_MS) return 'cerrada';
  if (inactiva >= INACTIVIDAD_MS - AVISO_MS) return 'por-cerrar';
  return 'activa';
}

/** Milisegundos que faltan para el cierre. Nunca negativo. */
export function restanteMs(ultimaActividad: number, ahora: number): number {
  return Math.max(0, ultimaActividad + INACTIVIDAD_MS - ahora);
}

/** "4:07" — para el aviso. Sin jerga y sin decimales. */
export function formatearRestante(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

/**
 * Lee la última actividad guardada.
 *
 * Devuelve `null` si no hay nada anotado o si el valor no sirve. Quien llama
 * decide qué hacer: al arrancar conviene tratar "no hay nada" como "recién
 * llega", y no como "expiró".
 */
export function leerUltimaActividad(): number | null {
  try {
    const crudo = localStorage.getItem(CLAVE_ACTIVIDAD);
    if (!crudo) return null;
    const n = Number(crudo);
    if (!Number.isFinite(n) || n <= 0) return null;
    // Un valor del futuro significa reloj cambiado o storage corrupto. Se
    // descarta en vez de confiar en él, que si no la sesión no cerraría nunca.
    if (n > Date.now() + 60_000) return null;
    return n;
  } catch {
    // Safari en privado tira al tocar localStorage.
    return null;
  }
}

export function anotarActividad(ahora: number = Date.now()): void {
  try {
    localStorage.setItem(CLAVE_ACTIVIDAD, String(ahora));
  } catch {
    /* sin storage, el contador vive solo en memoria */
  }
}

export function limpiarActividad(): void {
  try {
    localStorage.removeItem(CLAVE_ACTIVIDAD);
  } catch {
    /* ignorado */
  }
}

/**
 * Los eventos que cuentan como "hay alguien acá".
 *
 * Son gestos de una persona: escribir, tocar, scrollear. NO entran los
 * temporizadores, ni el refresco del token, ni las respuestas de la red — si
 * entraran, una pestaña abandonada se mantendría viva sola y todo esto no
 * serviría para nada.
 */
export const EVENTOS_DE_ACTIVIDAD = [
  'keydown',
  'pointerdown',
  'touchstart',
  'wheel',
  'scroll',
] as const;
