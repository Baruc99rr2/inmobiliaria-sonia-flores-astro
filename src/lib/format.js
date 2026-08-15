/**
 * Presentación de los campos numéricos y de la ubicación (Fase 3.5).
 *
 * Implementa la §2.3 del plan v5, la regla central del proyecto:
 *
 *   NULL  -> "A consultar"   no se cargó el dato, o se decidió no publicarlo
 *   0     -> "No tiene"      se sabe con certeza que la propiedad no lo tiene
 *   n     -> el número
 *
 * ---
 *
 * POR QUÉ HAY DOS FUNCIONES Y NO UNA
 *
 * El plan pide un `formatTriEstado()`. Pero los ocho campos numéricos no tienen
 * la misma semántica, y meterlos en una sola función haría que mientan:
 *
 *   - Contables (`ambientes`, `dormitorios`, `banos`, `cocheras`, `expensas`):
 *     tres estados. Un 0 significa "no tiene" y es información de venta.
 *   - Medidas (`superficie_m2`, `frente_m`, `fondo_m`): DOS estados. Toda
 *     propiedad tiene superficie; solo puede desconocerse. Un 0 acá no es "no
 *     tiene", es un dato que falta — de hecho la §5.4 lo migra a NULL.
 *
 * Si `formatMedida` usara la regla de los contables, las ids 6, 7, 9 y 10 del
 * fallback de `data.jsx` (que tienen `superficie_m2: 0`) dirían "No tiene
 * superficie", que es absurdo.
 *
 * ---
 *
 * POR QUÉ ACEPTA STRINGS
 *
 * El mismo valor llega con dos representaciones distintas según la fuente:
 *
 *   desde Supabase (adaptador legacy)  NULL -> 'a consultar' | undefined
 *   desde data.jsx (fallback)          'a consultar' | 0 | '' | clave ausente
 *
 * Las dos tienen que renderizar igual, así que las funciones normalizan ambas.
 */

export const SIN_DATO = 'A consultar';
export const NO_TIENE = 'No tiene';

/** `null`, `undefined`, `''` o cualquier variante de "a consultar". */
function esSinDato(valor) {
  if (valor === null || valor === undefined || valor === '') return true;
  if (typeof valor === 'string') return /^\s*a\s+consultar\s*$/i.test(valor);
  return false;
}

/** Número finito, o `null` si el valor no representa uno. */
function aNumero(valor) {
  if (esSinDato(valor)) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

/**
 * Contables. `NULL` -> "A consultar" · `0` -> "No tiene" · `n` -> el número.
 *
 * Reemplaza al viejo `campo || '-'` y, sobre todo, al `cocheras || '0'`, que
 * hacía que siete propiedades **afirmaran no tener cochera** cuando en realidad
 * no había dato cargado.
 */
export function formatTriEstado(valor) {
  const n = aNumero(valor);
  if (n === null) return SIN_DATO;
  if (n === 0) return NO_TIENE;
  return String(n);
}

/**
 * Medidas. Dos estados: `n` -> el número · todo lo demás -> "A consultar".
 * El `0` cuenta como sin dato, no como "No tiene".
 */
export function formatMedida(valor, sufijo = '') {
  const n = aNumero(valor);
  if (n === null || n === 0) return SIN_DATO;
  return sufijo ? `${n} ${sufijo}` : String(n);
}

/**
 * Valor para los chips compactos del home y de las tarjetas de búsqueda.
 *
 * Devuelve `null` cuando **hay que omitir el chip entero** (ícono incluido).
 * Es la decisión de la §2.3: esos chips viven en un renglón de tres columnas
 * con íconos en `text-xs`, y meter "A consultar" tres veces desarma el layout en
 * mobile. No se muestra una raya ni un cero: no aparece.
 *
 * Un `0` sí se muestra, porque ahí "no tiene" es información real y entra.
 */
export function chipTriEstado(valor) {
  const n = aNumero(valor);
  return n === null ? null : String(n);
}

/** Ídem para medidas: además de `NULL`, el `0` también omite el chip. */
export function chipMedida(valor) {
  const n = aNumero(valor);
  return n === null || n === 0 ? null : String(n);
}

/**
 * Texto de la ubicación.
 *
 * Antes esto se armaba inline concatenando `barrio`, `calle` y `numero` sin
 * ninguna condición, así que la id 12 imprimía literalmente
 * **"A consultar, A consultar, Jujuy, Argentina"** en producción: el centinela
 * del dato viejo filtrándose a la vista pública.
 *
 * Reglas:
 *
 *   1. `hide_location` -> NO se muestran barrio ni calle. Se muestra la
 *      localidad, que no es un dato reservado, y se aclara que la dirección se
 *      consulta. **El mapa se renderiza igual**: es preferencia explícita de la
 *      dueña (§2.2). Acá no se difumina ni se desplaza nada.
 *   2. `mostrarDireccionExacta` decide si va la altura. En `false` se muestra la
 *      calle sin número.
 *   3. Cualquier parte vacía o con el centinela se descarta en vez de imprimirse.
 *
 * Devuelve `{ texto, reservada }`.
 */
export function formatUbicacion(detalles = {}) {
  const limpio = (v) => (esSinDato(v) ? '' : String(v).trim());

  const barrio = limpio(detalles.barrio);
  const calle = limpio(detalles.calle);
  const numero = limpio(detalles.numero);
  const localidad = limpio(detalles.localidad);

  // La señal explícita es `hide_location`, que expone el adaptador. El fallback
  // de data.jsx no la tiene: ahí el indicio es que barrio y calle traigan el
  // centinela.
  const reservada =
    detalles.hide_location === true ||
    (esSinDato(detalles.barrio) && esSinDato(detalles.calle) && !!detalles.barrio);

  if (reservada) {
    const partes = [localidad || 'San Salvador de Jujuy', 'Jujuy, Argentina'];
    return { texto: partes.join(', '), reservada: true };
  }

  const calleCompleta =
    calle && numero && detalles.mostrarDireccionExacta ? `${calle} ${numero}` : calle;

  // Sin barrio cargado, el shape legacy pone la LOCALIDAD dentro de `barrio`
  // (así lo reconstruye el adaptador). Sin deduplicar, las propiedades de
  // Palpalá y San Antonio salían como "Palpalá, Palpalá, Jujuy, Argentina".
  const partes = [];
  for (const parte of [barrio, calleCompleta, localidad, 'Jujuy, Argentina']) {
    if (!parte) continue;
    const yaEsta = partes.some((p) => p.toLowerCase() === parte.toLowerCase());
    if (!yaEsta) partes.push(parte);
  }

  return { texto: partes.join(', '), reservada: false };
}

/**
 * Etiqueta corta de zona para el encabezado de la ficha.
 * Con ubicación reservada devuelve la localidad, nunca el centinela.
 */
export function etiquetaZona(detalles = {}) {
  const { reservada } = formatUbicacion(detalles);
  if (reservada) {
    const loc = detalles.localidad;
    return esSinDato(loc) || !loc ? 'Ubicación reservada' : String(loc);
  }
  const barrio = detalles.barrio;
  if (!esSinDato(barrio) && barrio) return String(barrio);
  const loc = detalles.localidad;
  return esSinDato(loc) || !loc ? 'Jujuy' : String(loc);
}
