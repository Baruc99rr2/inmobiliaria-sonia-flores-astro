/**
 * Borrador local del formulario (Fase 6f).
 *
 * El problema que resuelve: si la sesión se cierra por inactividad con veinte
 * campos escritos y al volver está todo vacío, el panel es odioso con razón.
 * Con esto, cerrar sesión cuesta un login y nunca el trabajo.
 *
 * Vive en `localStorage`, no en la base: justamente hace falta cuando NO hay
 * sesión para escribir en la base.
 *
 * >>> No guarda nada sensible: son los mismos datos que después van a la ficha
 * pública. No se guardan credenciales ni tokens. <<<
 *
 * El borrador se borra al guardar con éxito, así que si quedó uno dando vueltas
 * es porque de verdad hay trabajo sin guardar.
 */

const PREFIJO = 'sf.admin.borrador.';

/** Más viejo que esto, se descarta: recuperar algo de la semana pasada confunde. */
const VENCIMIENTO_MS = 7 * 24 * 60 * 60 * 1000;

export type Borrador<T> = { datos: T; guardadoEn: number };

/** `nueva` para el alta; el id de la propiedad para la edición. */
export function claveBorrador(id?: string): string {
  return PREFIJO + (id ?? 'nueva');
}

export function guardarBorrador<T>(id: string | undefined, datos: T): void {
  try {
    const sobre: Borrador<T> = { datos, guardadoEn: Date.now() };
    localStorage.setItem(claveBorrador(id), JSON.stringify(sobre));
  } catch {
    // Puede fallar por cuota o por modo privado. No es motivo para romperle el
    // formulario: se sigue trabajando, solo que sin red de seguridad.
  }
}

export function leerBorrador<T>(id?: string): Borrador<T> | null {
  try {
    const crudo = localStorage.getItem(claveBorrador(id));
    if (!crudo) return null;
    const sobre = JSON.parse(crudo) as Borrador<T>;
    if (!sobre || typeof sobre.guardadoEn !== 'number' || !sobre.datos) return null;
    if (Date.now() - sobre.guardadoEn > VENCIMIENTO_MS) {
      borrarBorrador(id);
      return null;
    }
    return sobre;
  } catch {
    return null;
  }
}

export function borrarBorrador(id?: string): void {
  try {
    localStorage.removeItem(claveBorrador(id));
  } catch {
    /* ignorado */
  }
}

/** "hoy a las 14:32" / "el 12/8 a las 09:05". Para contarle cuándo fue. */
export function cuandoFue(ts: number): string {
  const d = new Date(ts);
  const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  const hoy = new Date();
  const mismoDia =
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear();
  if (mismoDia) return `hoy a las ${hora}`;
  return `el ${d.getDate()}/${d.getMonth() + 1} a las ${hora}`;
}
