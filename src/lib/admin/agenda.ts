/**
 * Agenda: recordatorios sueltos por día (Fase 8b).
 *
 * >>> ESTO NO SE PUBLICA NUNCA. <<<
 *
 * `agenda_notes` no tiene ninguna policy para `anon` y ni siquiera tiene el
 * privilegio de tabla. Ninguna consulta del sitio público la nombra.
 *
 * ---
 * UNA NOTA POR DÍA
 *
 * `dia` es la clave primaria, así que la base garantiza que no haya dos. Si el
 * día tiene tres cosas, van en tres renglones dentro del mismo texto: los
 * separa quien escribe. Es el mismo gesto que las notas de propiedad —tocar y
 * escribir— y evita una lista con botones de agregar y borrar cada renglón.
 *
 * ---
 * LAS FECHAS SE MANEJAN COMO TEXTO 'AAAA-MM-DD', NUNCA COMO `Date` EN UTC
 *
 * `new Date('2026-08-18')` se interpreta como medianoche UTC, que en Jujuy
 * (UTC-3) es el 17 a las 21:00. Formatear eso con `toLocaleDateString` devuelve
 * el día ANTERIOR. Por eso las claves se arman a mano desde el año, el mes y el
 * día locales, y nunca con `toISOString()`.
 */
import { supabase } from '../supabase';

export type NotaDeAgenda = {
  dia: string;
  body: string;
  updated_at: string;
};

/** 'AAAA-MM-DD' desde una fecha local, sin pasar por UTC. */
export function claveDia(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Vuelve a `Date` local desde 'AAAA-MM-DD'. */
export function desdeClave(clave: string): Date {
  const [a, m, d] = clave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** La semana arranca en LUNES, como se usa acá. `getDay()` da 0 = domingo. */
export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/**
 * Las celdas de la grilla del mes, incluidos los días de relleno.
 *
 * Devuelve siempre semanas completas de 7, con `null` en los huecos de antes y
 * después. Así la grilla no se desalinea y no hay que calcular columnas.
 */
export function celdasDelMes(anio: number, mes: number): (Date | null)[] {
  const primero = new Date(anio, mes, 1);
  // getDay(): 0 domingo … 6 sábado. Se corre para que lunes sea 0.
  const desplazamiento = (primero.getDay() + 6) % 7;
  const diasEnElMes = new Date(anio, mes + 1, 0).getDate();

  const celdas: (Date | null)[] = [];
  for (let i = 0; i < desplazamiento; i++) celdas.push(null);
  for (let d = 1; d <= diasEnElMes; d++) celdas.push(new Date(anio, mes, d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

export function esHoy(d: Date): boolean {
  const hoy = new Date();
  return (
    d.getDate() === hoy.getDate() &&
    d.getMonth() === hoy.getMonth() &&
    d.getFullYear() === hoy.getFullYear()
  );
}

/** "lunes 18 de agosto". Para el encabezado del panel del día. */
export function tituloDelDia(clave: string): string {
  const d = desdeClave(clave);
  const nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  return `${nombres[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

/**
 * Las notas de un mes.
 *
 * Se pide el mes entero de una y no día por día: son 31 filas como mucho y el
 * calendario necesita saber cuáles tienen punto antes de dibujarse.
 */
export async function obtenerMes(
  anio: number,
  mes: number
): Promise<{ ok: true; notas: Record<string, NotaDeAgenda> } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  const desde = claveDia(new Date(anio, mes, 1));
  const hasta = claveDia(new Date(anio, mes + 1, 0));

  const { data, error } = await supabase
    .from('agenda_notes')
    .select('dia, body, updated_at')
    .gte('dia', desde)
    .lte('dia', hasta);

  if (error) {
    console.error('[admin] obtenerMes:', error.message);
    return { ok: false, error: 'No pudimos traer la agenda de este mes.' };
  }

  const notas: Record<string, NotaDeAgenda> = {};
  for (const n of data ?? []) {
    // Postgres puede devolver la fecha con hora; nos quedamos con el día.
    notas[String(n.dia).slice(0, 10)] = { ...n, dia: String(n.dia).slice(0, 10) };
  }
  return { ok: true, notas };
}

/**
 * Guarda la nota de un día.
 *
 * Con el texto vacío se BORRA la fila en vez de guardar una cadena vacía: si no,
 * el día quedaría con punto en el calendario y sin nada adentro, que es
 * exactamente lo que hace desconfiar de una agenda.
 */
export async function guardarDia(
  dia: string,
  body: string
): Promise<{ ok: true; nota: NotaDeAgenda | null } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'No hay conexión con la base de datos.' };

  if (body.trim() === '') {
    const { error } = await supabase.from('agenda_notes').delete().eq('dia', dia);
    if (error) {
      console.error('[admin] guardarDia borrar:', error.message);
      return { ok: false, error: 'No pudimos borrar la nota. Revisá tu conexión.' };
    }
    return { ok: true, nota: null };
  }

  // `upsert` sobre la clave primaria: crea o actualiza sin tener que preguntar
  // antes si el día ya tenía nota.
  const { data, error } = await supabase
    .from('agenda_notes')
    .upsert({ dia, body }, { onConflict: 'dia' })
    .select('dia, body, updated_at')
    .single();

  if (error) {
    console.error('[admin] guardarDia:', error.message);
    return { ok: false, error: 'No pudimos guardar la nota. Revisá tu conexión.' };
  }
  return { ok: true, nota: { ...data, dia: String(data.dia).slice(0, 10) } };
}
