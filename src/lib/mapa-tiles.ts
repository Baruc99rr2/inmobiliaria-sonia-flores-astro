/**
 * Las URLs de los tiles de los mapas, en un solo lugar.
 *
 * ---
 * POR QUÉ HAY UNA CLAVE
 *
 * CARTO —el proveedor del fondo de los mapas— empezó a exigir una clave gratuita.
 * Sin ella los tiles se sirven con un cartel de "API KEY REQUIRED" encima.
 *
 * La clave lleva prefijo `PUBLIC_` porque viaja dentro de la URL del tile, que
 * la pide el browser: es pública por diseño, igual que la de Web3Forms en su
 * momento. No es un secreto y no protege nada.
 *
 * ---
 * POR QUÉ ESTÁ ACÁ Y NO EN CADA MAPA
 *
 * Hay CUATRO capas de tiles en el proyecto, no tres:
 *
 *   1. `Busqueda/PropertyMap.jsx`     — el mapa de resultados (estilo OSCURO)
 *   2. `ProductDetailsReact.jsx`      — el mapa de la ficha
 *   3. `ProductDetailsReact.jsx`      — el MISMO mapa en pantalla completa
 *   4. `admin/CampoMapa.tsx`          — el del panel, para ubicar la propiedad
 *
 * Con la URL repetida cuatro veces, agregarle un parámetro significa acordarse
 * de los cuatro. La próxima vez que CARTO cambie algo —y va a pasar, ver abajo—
 * se toca un solo archivo.
 *
 * >>> Hay que cargar `PUBLIC_CARTO_API_KEY` TAMBIÉN EN VERCEL, en los tres
 * entornos (Production, Preview y Development). Las variables `PUBLIC_*` se
 * incrustan en tiempo de build: si falta en Vercel, los mapas andan en local y
 * fallan en producción. Es el mismo patrón que ya nos pasó con las claves de
 * Supabase. <<<
 *
 * ---
 * ESTO TIENE FECHA DE VENCIMIENTO
 *
 * CARTO avisó que va a retirar este servicio de tiles rasterizados, sin dar
 * fecha. Cuando pase, hay que migrar a otro proveedor. Está anotado en el §12
 * del plan. La ventaja de tener esto centralizado es que la migración toca
 * exactamente un archivo.
 */

const CLAVE = import.meta.env.PUBLIC_CARTO_API_KEY;

/**
 * Arma la URL de un estilo de CARTO con la clave.
 *
 * Si la clave falta, se devuelve la URL sin el parámetro: es preferible un mapa
 * con la marca de agua a un mapa que no carga. Y queda el aviso en consola para
 * que se note en desarrollo.
 */
function carto(estilo: string): string {
  const base = `https://{s}.basemaps.cartocdn.com/rastertiles/${estilo}/{z}/{x}/{y}{r}.png`;
  if (!CLAVE) {
    console.warn(
      '[mapas] Falta PUBLIC_CARTO_API_KEY. Los mapas van a mostrar "API KEY REQUIRED". ' +
        'Cargala en .env y en Vercel (Production, Preview y Development).'
    );
    return base;
  }
  return `${base}?key=${CLAVE}`;
}

/** El estilo claro. Lo usan la ficha de propiedad y el panel. */
export const TILES_CLARO = carto('voyager');

/** El estilo oscuro. Lo usa el mapa de resultados de la búsqueda. */
export const TILES_OSCURO = carto('dark_all');

/** CARTO pide atribución. Es una condición de uso, no un detalle. */
export const ATRIBUCION_MAPA =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
