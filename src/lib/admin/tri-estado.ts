/**
 * Conversión entre lo que hay en la base y lo que muestra el formulario, para
 * los campos numéricos (Fase 6c). Implementa la §2.3 y la §8 del plan.
 *
 * Está aparte de la UI a propósito: es la parte donde un error es silencioso, y
 * así se puede probar sin base y sin navegador.
 *
 * ---
 *
 * CONTABLES — `ambientes`, `dormitorios`, `banos`, `cocheras`, `expensas`
 *
 *   base        formulario                     qué ve el visitante
 *   ---------   ----------------------------   -------------------
 *   NULL        casilla off, campo vacío       "A consultar"
 *   0           casilla ON, campo deshabilitado "No tiene"
 *   n           casilla off, campo con n        n
 *
 * >>> EL PUNTO DELICADO ESTÁ AL CARGAR, NO AL GUARDAR. <<<
 *
 * Si al abrir una propiedad existente se confundiera un `0` con un `NULL`, la
 * casilla aparecería marcada (o desmarcada) mal, y con solo entrar a editar otra
 * cosa y guardar, un "A consultar" se convertiría en "No tiene" sin que nadie se
 * dé cuenta. Por eso `desdeDb` distingue explícitamente `0` de `null`, y nunca
 * usa comprobaciones de veracidad: en JavaScript `0` es falsy, que es justo la
 * trampa.
 *
 * MEDIDAS — `superficie_m2`, `frente_m`, `fondo_m`
 *
 * Dos estados nada más. No llevan casilla: toda propiedad tiene superficie, solo
 * puede desconocerse. Además la base tiene un `check` que las prohíbe en 0
 * (`medidas_sin_cero`), así que un 0 escrito a mano se guarda como NULL en vez
 * de hacer fallar el guardado con un error que la dueña no podría interpretar.
 */

export type CampoContable = {
  /** La casilla "No tiene". */
  noTiene: boolean;
  /** Lo que se ve en el input. Vacío = sin dato. */
  valor: string;
};

/** base -> formulario. Distingue `0` de `null` de forma explícita. */
export function contableDesdeDb(v: number | null | undefined): CampoContable {
  if (v === null || v === undefined) return { noTiene: false, valor: '' };
  const n = Number(v);
  if (!Number.isFinite(n)) return { noTiene: false, valor: '' };
  if (n === 0) return { noTiene: true, valor: '' };
  return { noTiene: false, valor: String(n) };
}

/** formulario -> base. `0` es "no tiene", `null` es "a consultar". */
export function contableADb(c: CampoContable): number | null {
  if (c.noTiene) return 0;
  const s = c.valor.trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  // El `check contables_no_negativos` los prohíbe negativos. Un negativo escrito
  // a mano se toma como sin dato en vez de reventar el guardado.
  if (n < 0) return null;
  return Math.round(n);
}

/** Igual que `contableADb` pero conservando decimales, para expensas. */
export function montoADb(c: CampoContable): number | null {
  if (c.noTiene) return 0;
  const s = c.valor.trim();
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** base -> formulario, para las medidas. */
export function medidaDesdeDb(v: number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(n);
}

/** formulario -> base. Un 0 o un negativo se guardan como NULL, no como 0. */
export function medidaADb(s: string): number | null {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** El texto de ayuda fijo que pide la §8, debajo del grupo. */
export const AYUDA_NUMERICOS =
  'Si dejás un campo vacío, en la web aparece como “A consultar”. Si marcás “No tiene”, ' +
  'aparece que la propiedad no lo tiene.';
