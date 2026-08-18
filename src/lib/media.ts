/**
 * Fotos y videos: qué es cada cosa y cuál va de portada (Fase 7a).
 *
 * Tres problemas que ya estaban en el código y que el uploader iba a agravar:
 *
 *  1. `/propiedades/unisex.jpg` NO EXISTE. Era el fallback de tres componentes.
 *     No se disparaba porque las 20 propiedades tienen fotos, pero la primera
 *     propiedad sin imagen —que con el uploader va a poder existir, porque se
 *     va a poder crear una y cargarle las fotos después— mostraba una imagen
 *     rota. Ahora el fallback es `SIN_FOTO`, un SVG que sí existe.
 *
 *  2. Se detectaba video con `url.endsWith('.mp4')`. Las URLs de Supabase
 *     Storage pueden traer querystring (`?token=…`), y ahí `endsWith` da false
 *     y se renderiza un `<img>` apuntando a un video. Ahora manda la columna
 *     `kind`, que es el dato real; la extensión queda solo como respaldo para
 *     `data.jsx`, y mirando el *pathname*, sin la querystring.
 *
 *  3. Tres componentes hacían `images[0]` sin filtrar videos. Con un video
 *     primero, la portada era un `<img>` roto. `portadaDe()` devuelve siempre
 *     una imagen.
 *
 * El punto 3 se resuelve acá ADEMÁS de validarlo en el panel. La validación del
 * formulario evita que se cargue mal; esto evita que se vea mal si igual pasa
 * —por datos viejos, por una carga por SQL, o por un bug futuro—. Son dos
 * defensas para el mismo problema y las dos hacen falta.
 */

/** Placeholder real, versionado. Ver `public/propiedades/sin-foto.svg`. */
export const SIN_FOTO = '/propiedades/sin-foto.svg';

const EXTENSIONES_DE_VIDEO = ['.mp4', '.mov', '.webm', '.m4v'];

/**
 * ¿Es un video?
 *
 * `kind` gana siempre: viene de la base y no depende de cómo se vea la URL.
 * Si no hay `kind` (el fallback de `data.jsx`, que solo tiene strings), se mira
 * la extensión del PATHNAME, no de la URL entera: con querystring,
 * `'…/video.mp4?token=abc'.endsWith('.mp4')` da false.
 */
export function esVideo(url: string, kind?: string | null): boolean {
  if (kind === 'video') return true;
  if (kind === 'image') return false;

  const sinQuery = String(url ?? '').split('?')[0].split('#')[0].toLowerCase();
  return EXTENSIONES_DE_VIDEO.some((ext) => sinQuery.endsWith(ext));
}

type ProductoConMedia = {
  images?: string[] | null;
  detalles?: { media?: Array<{ url: string; kind?: string | null }> | null } | null;
};

/** El `kind` del elemento en la posición `i`, si el adaptador lo expuso. */
export function kindDe(producto: ProductoConMedia, i: number): string | null {
  return producto?.detalles?.media?.[i]?.kind ?? null;
}

/**
 * La imagen de portada. NUNCA un video y nunca una URL vacía.
 *
 * Si la propiedad solo tiene videos, o no tiene nada, devuelve el placeholder:
 * es preferible un cartel de "sin foto" a un cuadro roto.
 */
export function portadaDe(producto: ProductoConMedia): string {
  const imagenes = producto?.images ?? [];
  for (let i = 0; i < imagenes.length; i++) {
    const url = imagenes[i];
    if (url && !esVideo(url, kindDe(producto, i))) return url;
  }
  return SIN_FOTO;
}

/** Solo las imágenes, en orden. Para galerías que no deben mostrar videos. */
export function soloImagenes(producto: ProductoConMedia): string[] {
  const imagenes = producto?.images ?? [];
  const out = imagenes.filter((url, i) => url && !esVideo(url, kindDe(producto, i)));
  return out.length > 0 ? out : [SIN_FOTO];
}
