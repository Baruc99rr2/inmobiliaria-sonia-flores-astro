import manifiesto from './imagenes-optimizadas.json';

/**
 * De dónde sale cada foto y cómo se sirve en el tamaño que hace falta.
 *
 * ---
 * EL PROBLEMA
 *
 * Las fotos de propiedades venían al tamaño original: PNG y JPG de hasta 2,5 MB
 * y varios miles de píxeles de ancho, para mostrarse en tarjetas de 300px. Sobre
 * una muestra de 8 fotos, 13 MB de originales daban 96 KB en WebP a 480px.
 *
 * ---
 * POR QUÉ HAY DOS CAMINOS
 *
 * Las fotos vienen de dos lados y no se pueden tratar igual:
 *
 *  1. LEGACY, en `public/`: son las 20 propiedades originales. Sus rutas están
 *     guardadas en la base (`property_media.url`), así que renombrar los archivos
 *     obligaría a escribir contra producción. En su lugar hay copias WebP
 *     pre-generadas en `public/optim/`, hechas por
 *     `scripts/optimizar-imagenes.mjs`. Se pre-generan porque en el build de
 *     Vercel no hay ffmpeg.
 *
 *  2. DEL PANEL, en Supabase Storage: las que sube la dueña. Ya salen en WebP y
 *     como mucho de 1920px, porque el navegador las comprime antes de subirlas
 *     (ver `src/lib/admin/subir.ts`). Lo que faltaba era servirlas más chicas
 *     según el lugar, y para eso está el endpoint de transformación de Supabase,
 *     que viene con el plan Pro.
 *
 * ---
 * POR QUÉ UN MANIFIESTO Y NO UNA REGLA
 *
 * Sería más corto decir "toda ruta que empiece con /propiedades/ tiene su copia
 * en /optim/". Pero si alguna copia faltara, el navegador NO vuelve al original:
 * en un `<picture>` o un `srcset` un archivo que no existe queda como imagen
 * rota. Con el manifiesto solo se reescriben las rutas que el script confirmó
 * haber generado. Y por si acaso, `alFallarImagen` abajo es la última red.
 */

const ANCHOS = manifiesto.anchos;
const RUTAS_OPTIMIZADAS = new Set(manifiesto.rutas);

/** Reconoce una URL pública de Supabase Storage. */
const ES_DE_SUPABASE = /\/storage\/v1\/object\/public\//;

/** El endpoint de Supabase que redimensiona al vuelo. */
const A_ENDPOINT_DE_RENDER = (url) =>
  url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');

/** `/propiedades/foo.png` + 480  ->  `/optim/propiedades/foo-480.webp` */
const rutaOptimizada = (ruta, ancho) => `/optim${ruta.replace(/\.[^.]+$/, '')}-${ancho}.webp`;

/**
 * Devuelve `{ src, srcSet }` para un `<img>`.
 *
 * `src` siempre apunta a algo que existe. `srcSet` puede venir vacío, y en ese
 * caso el navegador simplemente usa `src`.
 *
 * @param {string} url        La URL tal como está guardada.
 * @param {number} anchoBase  El ancho que se usa como `src` por defecto.
 */
export function fuentesDeImagen(url, anchoBase = 800) {
  if (typeof url !== 'string' || url === '') return { src: url, srcSet: undefined };

  // Los videos y los SVG no se tocan.
  if (/\.(mp4|webm|mov|svg)(\?|$)/i.test(url)) return { src: url, srcSet: undefined };

  if (ES_DE_SUPABASE.test(url)) {
    const base = A_ENDPOINT_DE_RENDER(url);
    const con = (w) => `${base}?width=${w}&quality=75`;
    return {
      src: con(anchoBase),
      srcSet: ANCHOS.map((w) => `${con(w)} ${w}w`).join(', '),
    };
  }

  if (RUTAS_OPTIMIZADAS.has(url)) {
    return {
      src: rutaOptimizada(url, anchoBase),
      srcSet: ANCHOS.map((w) => `${rutaOptimizada(url, w)} ${w}w`).join(', '),
    };
  }

  // Cualquier otra cosa (el placeholder, una ruta que el script no alcanzó a
  // generar) se sirve tal cual.
  return { src: url, srcSet: undefined };
}

/**
 * Red de seguridad para el `onError` de un `<img>`.
 *
 * Si por lo que sea la versión optimizada no está, se vuelve al archivo original
 * en vez de dejar una foto rota. Las fotos son lo que vende la propiedad: es
 * preferible que pese de más a que no se vea.
 *
 * Se limpia `srcset` además de `src` porque mientras haya `srcset` el navegador
 * lo sigue prefiriendo y volvería a fallar en un bucle.
 */
export function alFallarImagen(urlOriginal) {
  return (evento) => {
    const img = evento.currentTarget;
    if (img.dataset.volvioAlOriginal === '1') return;
    img.dataset.volvioAlOriginal = '1';
    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = urlOriginal;
  };
}
