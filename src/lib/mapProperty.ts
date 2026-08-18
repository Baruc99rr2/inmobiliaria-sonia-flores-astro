/**
 * Capa adaptadora: fila de Supabase -> objeto con el SHAPE LEGACY EXACTO de
 * `src/data.jsx`.
 *
 * El objetivo de esta fase es que la Fase 3 sea un cambio de fuente de datos con
 * riesgo cero, NO un rediseño. Por eso el adaptador reproduce las rarezas del
 * dato viejo en vez de arreglarlas:
 *
 *   - `superficie_m2` / `frente_m` / `fondo_m` en NULL devuelven el string
 *     `'a consultar'` en minúscula, que es literalmente lo que hay hoy en
 *     data.jsx y lo que los componentes imprimen tal cual.
 *   - los contables (`ambientes`, `dormitorios`, `banos`, `cocheras`) en NULL
 *     devuelven `undefined`, porque en data.jsx esas claves directamente no
 *     existen. Un `0` sí se conserva como `0`.
 *   - `barrio` se reconstruye CON el prefijo "Barrio " para las propiedades de
 *     San Salvador de Jujuy, porque así está hoy y así lo comparan los filtros.
 *
 * Nada de "No tiene" todavía: eso es la Fase 3.5.
 *
 * ---
 *
 * AGREGADO EN LA FASE 3: además del shape legacy, `detalles` lleva tres claves
 * nuevas —`localidad_slug`, `barrio_slug` y `tipo_slug`— que NO existen en
 * `data.jsx`. Son puramente aditivas: ningún componente legacy las lee, así que
 * no cambian nada de lo que se renderiza. Las usa el filtro de búsqueda, que
 * pasó a comparar por slug en vez de por el texto visible. Esa es la corrección
 * del bug que hacía que el filtro de barrio devolviera 0 resultados en 11 de sus
 * 12 opciones.
 */

/** Campos que el sitio público necesita. La Fase 3 usa exactamente este select. */
export const PROPERTY_SELECT = `
  legacy_id, slug, name, description, operation,
  price, show_price, price_from,
  calle, numero, show_exact_address, hide_location,
  ambientes, dormitorios, banos, cocheras, expensas,
  superficie_m2, frente_m, fondo_m,
  lat, lon, mapa_query, adicionales, published, sort_order,
  estado, requisitos,
  property_types ( slug, label, legacy_label ),
  localidades ( slug, label ),
  neighborhoods ( slug, label ),
  property_media ( url, kind, sort_order ),
  property_services ( services ( slug, label, sort_order ) )
`;

const A_CONSULTAR_MINUSCULA = 'a consultar';
const A_CONSULTAR_TITULO = 'A consultar';

/**
 * Medidas: NULL -> 'a consultar' (minúscula, como en data.jsx).
 * Un número se devuelve como número.
 */
function medida(valor: number | null | undefined): number | string {
  if (valor === null || valor === undefined) return A_CONSULTAR_MINUSCULA;
  return Number(valor);
}

/**
 * Contables: NULL -> undefined (en data.jsx la clave no existe).
 * 0 se conserva como 0: hoy significa lo mismo que "no tiene", y los
 * componentes ya lo tratan así. El tri-estado real llega en la Fase 3.5.
 */
function contable(valor: number | null | undefined): number | undefined {
  if (valor === null || valor === undefined) return undefined;
  return Number(valor);
}

/**
 * Precio. Regla dura 11 del plan: NUNCA devolver 0.
 *
 * Cuatro de los seis formateadores del sitio deciden con `!isNaN(price)`, así
 * que un 0 se imprimiría como "$0" en lugar de "A consultar". Devolvemos el
 * string 'A consultar', que es exactamente lo que hay hoy en data.jsx para las
 * propiedades sin precio.
 */
function precio(row: { price: unknown; show_price?: boolean | null }): string {
  if (row.show_price === false) return A_CONSULTAR_TITULO;

  const valor = row.price;
  if (valor === null || valor === undefined || valor === '') return A_CONSULTAR_TITULO;

  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0) return A_CONSULTAR_TITULO;

  // data.jsx guarda los precios como string sin decimales ("480000").
  // numeric(14,2) vuelve de PostgREST como "480000.00", así que normalizamos.
  return String(numero);
}

/**
 * Reconstruye `detalles.barrio` tal como lo espera el frontend actual.
 *
 * Es la inversa de la regla §2.1 que aplica el script de migración:
 *   - ubicación oculta        -> 'A consultar'  (ids 12 y 19)
 *   - hay barrio cargado      -> 'Barrio ' + label   ('Barrio Centro')
 *   - no hay barrio           -> el label de la localidad ('Palpalá', 'San Antonio')
 */
function barrioLegacy(row: any): string {
  if (row.hide_location) return A_CONSULTAR_TITULO;
  if (row.neighborhoods?.label) return `Barrio ${row.neighborhoods.label}`;
  return row.localidades?.label ?? '';
}

/** 'alquiler' -> 'Alquiler'. Los filtros comparan por igualdad estricta. */
function categoriaLegacy(operation: string | null | undefined): string {
  if (operation === 'alquiler') return 'Alquiler';
  if (operation === 'venta') return 'Venta';
  return '';
}

export function mapDbToProduct(row: any) {
  // Media: array plano de strings ordenado por sort_order, imágenes y videos
  // mezclados. Tres componentes hacen images[0] sin filtrar videos, así que el
  // orden importa y el primer elemento tiene que ser imagen. Eso lo garantizan
  // la convención de la tabla y el validador de la Fase 7.
  const images = [...(row.property_media ?? [])]
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m: any) => m.url);

  // Servicios: labels ordenados por el sort_order del catálogo.
  // Si la propiedad no tiene ninguno queda [], y el componente esconde la
  // sección entera (mismo comportamiento que hoy tienen las ids 11 y 15).
  const servicios = (row.property_services ?? [])
    .map((ps: any) => ps.services)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s: any) => s.label);

  const ubicacionOculta = Boolean(row.hide_location);

  return {
    id: row.legacy_id,
    images,
    name: row.name ?? '',
    price: precio(row),
    category: categoriaLegacy(row.operation),
    description: row.description ?? '',
    detalles: {
      // Regla dura 12: el legacy_label, no el label de presentación. El filtro
      // de tipo compara por igualdad estricta contra 'Local', 'Galpon', 'Nave'.
      tipo: row.property_types?.legacy_label ?? row.property_types?.label ?? '',
      barrio: barrioLegacy(row),
      // Con la ubicación oculta, data.jsx guarda 'A consultar' en la calle.
      calle: ubicacionOculta ? A_CONSULTAR_TITULO : (row.calle ?? ''),
      numero: ubicacionOculta ? '' : (row.numero ?? ''),
      cocheras: contable(row.cocheras),
      ambientes: contable(row.ambientes),
      dormitorios: contable(row.dormitorios),
      banos: contable(row.banos),
      expensas: contable(row.expensas),
      mostrarDireccionExacta: Boolean(row.show_exact_address),
      superficie_m2: medida(row.superficie_m2),
      frente_m: medida(row.frente_m),
      fondo_m: medida(row.fondo_m),
      servicios,
      adicionales: row.adicionales ?? [],
      mapaQuery: row.mapa_query ?? '',
      lat: row.lat ?? null,
      lon: row.lon ?? null,

      // --- Claves NUEVAS de la Fase 3, fuera del shape legacy ---
      // Solo las consume el filtro de búsqueda. Comparar por slug elimina de
      // raíz el problema de tildes, mayúsculas y del prefijo "Barrio ".
      //
      // Con la ubicación reservada (ids 12 y 19) el barrio queda en null, así
      // que la propiedad no aparece al filtrar por ningún barrio. La localidad
      // sí se expone: `hide_location` oculta barrio y calle, no la localidad, y
      // el mapa ya apunta a la zona real (§2.2 del plan).
      localidad_slug: row.localidades?.slug ?? null,
      barrio_slug: row.hide_location ? null : (row.neighborhoods?.slug ?? null),
      tipo_slug: row.property_types?.slug ?? null,

      // --- Claves NUEVAS de la Fase 3.5, también fuera del shape legacy ---
      // `hide_location` es la señal explícita de ubicación reservada. Hasta
      // ahora el único indicio era que `barrio` y `calle` dijeran 'A consultar',
      // un centinela que además se filtraba a la vista pública.
      // `localidad` permite mostrar algo útil sin revelar barrio ni calle.
      hide_location: Boolean(row.hide_location),
      localidad: row.localidades?.label ?? '',

      // --- Claves NUEVAS de la Fase 6.6 ---
      // `estado` es el estado comercial. NO se oculta la propiedad: una
      // alquilada sigue mostrándose, marcada y al final del listado. Es una
      // decisión de la dueña: sirve de muestrario de lo que se opera.
      //
      // `data.jsx` no tiene la columna, así que el fallback cae en 'disponible',
      // que es el default de la base.
      estado: estadoValido(row.estado),
      requisitos: (row.requisitos ?? '').trim(),
    },
  };
}

/** Los tres estados posibles. Cualquier otra cosa se trata como disponible. */
export type EstadoPropiedad = 'disponible' | 'alquilada' | 'vendida';

const ESTADOS: EstadoPropiedad[] = ['disponible', 'alquilada', 'vendida'];

function estadoValido(v: unknown): EstadoPropiedad {
  return ESTADOS.includes(v as EstadoPropiedad) ? (v as EstadoPropiedad) : 'disponible';
}

/** ¿Se puede alquilar/comprar hoy? */
export function estaDisponible(producto: { detalles?: { estado?: string } }): boolean {
  return (producto?.detalles?.estado ?? 'disponible') === 'disponible';
}

/**
 * La etiqueta que ve EL PÚBLICO. `null` si está disponible.
 *
 * >>> Dice "No disponible" y nunca "Alquilada" ni "Vendida". <<<
 *
 * Al cliente no le cambia nada saber cuál de las dos fue: la propiedad no está
 * y listo. A un competidor sí le sirve: contando alquiladas contra vendidas
 * saca cuánto se mueve el negocio y de qué lado. Es información de la
 * inmobiliaria, no del inmueble.
 *
 * En el PANEL sí se distingue —el toggle dice "Ya se alquiló" / "Ya se vendió"—
 * porque la dueña necesita saber qué está marcando. La distinción existe en la
 * columna `estado`; lo que no sale es a la vista pública.
 */
export function etiquetaEstado(producto: { detalles?: { estado?: string } }): string | null {
  return estaDisponible(producto) ? null : 'No disponible';
}

/**
 * Ordena como el listado público y mapea todo de una.
 *
 * Las que ya no están disponibles van AL FINAL, nunca ocultas: la dueña las
 * quiere a la vista como muestrario de lo que opera. Dentro de cada grupo se
 * mantiene el orden de siempre (`sort_order`, después `legacy_id`).
 */
export function mapDbToProducts(rows: any[]) {
  return [...(rows ?? [])]
    .sort(
      (a, b) =>
        Number(estadoValido(a.estado) !== 'disponible') -
          Number(estadoValido(b.estado) !== 'disponible') ||
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        (a.legacy_id ?? 0) - (b.legacy_id ?? 0)
    )
    .map(mapDbToProduct);
}

/**
 * Reordena productos YA MAPEADOS dejando las no disponibles al final.
 *
 * Hace falta aparte de `mapDbToProducts` porque la búsqueda reordena por precio
 * o por título después de mapear, y ese orden pisaría el agrupamiento. Se aplica
 * como criterio de desempate exterior: primero disponible/no disponible, y
 * recién adentro el orden que eligió la persona.
 */
export function disponiblesPrimero<T extends { detalles?: { estado?: string } }>(
  productos: T[]
): T[] {
  return [...productos].sort(
    (a, b) => Number(!estaDisponible(a)) - Number(!estaDisponible(b))
  );
}
