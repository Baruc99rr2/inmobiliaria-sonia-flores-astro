import React from "react";
import { etiquetaEstado } from "../lib/mapProperty";

/**
 * La franja que marca una propiedad que ya no está disponible (Fase 6.6).
 *
 * >>> Las alquiladas y vendidas NO se ocultan. <<<
 *
 * Es una decisión de la dueña: quedan a la vista, marcadas y al final del
 * listado, porque sirven de muestrario de lo que la inmobiliaria opera. Quien
 * entra ve que se mueven propiedades en esa zona y a ese precio.
 *
 * Va como franja abajo de la foto y no como velo sobre toda la imagen: las
 * tarjetas ya tienen etiquetas en las dos esquinas de arriba (operación y tipo)
 * y un velo las dejaría turbias. Abajo no pelea con nada y se lee de un vistazo.
 *
 * El contenedor que la recibe tiene que ser `relative`. Los tres lugares donde
 * se usa ya lo son.
 */
export default function MarcaEstado({ product, variante = "franja" }) {
  const etiqueta = etiquetaEstado(product);
  if (!etiqueta) return null;

  // El carrusel de la home ya tiene un degradado oscuro y el título encima del
  // borde de abajo. Una franja ahí taparía el título, así que va como chip
  // arriba, al lado de los que ya tiene.
  if (variante === "chip") {
    return (
      <span className="ml-1.5 text-[10px] md:text-xs font-bold uppercase tracking-wider text-white bg-gray-900 px-2 py-0.5 rounded border border-white/25">
        {etiqueta}
      </span>
    );
  }

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-20 bg-gray-900/90 py-1.5 text-center pointer-events-none"
      // `aria-hidden` no: es información, no decoración. Quien usa un lector de
      // pantalla tiene que enterarse de que no está disponible igual que quien
      // la ve.
    >
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">
        {etiqueta}
      </span>
    </div>
  );
}
