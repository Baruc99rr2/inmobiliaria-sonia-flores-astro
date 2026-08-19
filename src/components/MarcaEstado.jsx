import { etiquetaEstado } from "../lib/mapProperty";

/**
 * La franja que marca una propiedad que ya no está disponible (Fase 6.6).
 *
 * >>> Las no disponibles NO se ocultan del listado de búsqueda. <<<
 *
 * Es una decisión de la dueña: quedan a la vista, marcadas y al final, porque
 * sirven de muestrario de lo que la inmobiliaria opera. Quien entra ve que se
 * mueven propiedades en esa zona y a ese precio.
 *
 * Los escaparates de la home son otra cosa y NO usan este componente: tanto
 * "Últimas Novedades" como el carrusel filtran a disponibles antes de cortar,
 * así que ahí nunca hay nada que marcar. Recomendar algo que ya no está no
 * tiene sentido.
 *
 * Va como franja abajo de la foto y no como velo sobre toda la imagen: la
 * tarjeta ya tiene etiquetas en las esquinas de arriba (operación y tipo) y un
 * velo las dejaría turbias. Abajo no pelea con nada y se lee de un vistazo.
 *
 * El contenedor que la recibe tiene que ser `relative`.
 */
export default function MarcaEstado({ product }) {
  const etiqueta = etiquetaEstado(product);
  if (!etiqueta) return null;

  return (
    // Sin `aria-hidden`: es información, no decoración. Quien usa un lector de
    // pantalla tiene que enterarse igual que quien la ve.
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gray-900/90 py-1.5 text-center pointer-events-none">
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">
        {etiqueta}
      </span>
    </div>
  );
}
