/**
 * Decide si el dispositivo se banca las animaciones de fondo o no.
 *
 * ---
 * POR QUÉ NO ALCANZA CON EL ANCHO DE PANTALLA
 *
 * Un ancho chico no significa un aparato lento: una notebook con la ventana a
 * medias mide 700px y le sobra potencia, mientras que una tablet de 1024px puede
 * ser bastante más lenta que cualquier escritorio. Acá se mira lo que el aparato
 * puede hacer, no cuánto mide.
 *
 * ---
 * POR QUÉ ESTO NO PUEDE CORRER EN EL SERVIDOR
 *
 * `navigator` y `matchMedia` solo existen en el navegador. En la Parte 1 ya nos
 * mordió un patrón parecido: adivinar en el servidor y corregir al hidratar
 * produce un salto visible. Por eso el hook arranca devolviendo `true` (modo
 * liviano) y recién después de montarse averigua la verdad.
 *
 * Ese default es a propósito: si arrancara en "modo completo", los aparatos
 * lentos —justamente los que hay que cuidar— harían el trabajo caro durante los
 * primeros frames, que es el peor momento posible. Al revés, un escritorio pasa
 * un instante con el fondo quieto y después arranca la animación. Barato primero,
 * caro después solo si da.
 */

import { useEffect, useState } from 'react';

/** La persona pidió menos movimiento en la configuración de su sistema. */
export function prefiereMenosMovimiento() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Si conviene ahorrar trabajo de pintado.
 *
 * Alcanza con que se cumpla UNA de las condiciones:
 *
 *  - Pidió menos movimiento. Es una preferencia explícita y manda sobre el resto.
 *  - `pointer: coarse`: se maneja con el dedo. ESTA es la señal que hace el
 *    trabajo pesado. Es la más confiable para distinguir un celular o una
 *    tablet, y no depende del ancho de la ventana.
 *  - 2 núcleos o menos, o 2 GB de RAM o menos: una máquina realmente floja.
 *
 * ---
 * POR QUÉ LOS UMBRALES SON TAN BAJOS
 *
 * La primera versión de esto cortaba en 4 núcleos y 4 GB, y estaba mal. Se notó
 * midiendo: en escritorio el fondo quedaba quieto cuando tenía que animarse,
 * porque esta misma máquina de desarrollo reporta 4 núcleos y caía del lado
 * "liviano".
 *
 * El razonamiento corregido es que `hardwareConcurrency` sirve muy poco para
 * separar celular de computadora, y encima se equivoca para los dos lados: los
 * celulares de gama media de hoy reportan 8 núcleos (son big.LITTLE, muchos
 * núcleos lentos), así que un corte en 4 NO los agarra; y en cambio hay
 * escritorios, notebooks de oficina y máquinas virtuales de sobra que reportan
 * 4 y andan perfecto. Con `deviceMemory` pasa lo mismo: 4 GB es lo normal en una
 * notebook que anda bien.
 *
 * O sea que el trabajo de detectar el celular lo tiene que hacer
 * `pointer: coarse`, que para eso está. Los contadores quedan solo como red por
 * si aparece una máquina de verdad floja, con umbrales que ya no pisan lo normal.
 */
export function convieneModoLiviano() {
  if (typeof window === 'undefined') return true;

  if (prefiereMenosMovimiento()) return true;
  if (window.matchMedia('(pointer: coarse)').matches) return true;

  const nucleos = navigator.hardwareConcurrency;
  if (typeof nucleos === 'number' && nucleos <= 2) return true;

  // `deviceMemory` no existe en Safari ni en Firefox. Cuando falta NO se asume
  // nada: deciden las otras señales.
  const memoria = navigator.deviceMemory;
  if (typeof memoria === 'number' && memoria <= 2) return true;

  return false;
}

/**
 * La versión para componentes de React.
 *
 * Devuelve `true` en el primer render —el del servidor y el primero del
 * cliente, que tienen que coincidir sí o sí— y el valor real a partir de ahí.
 * También vuelve a evaluarlo si la persona cambia la preferencia de movimiento
 * sin recargar, o si enchufa un mouse a una tablet.
 */
export function useModoLiviano() {
  const [liviano, setLiviano] = useState(true);

  useEffect(() => {
    const consultas = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(pointer: coarse)'),
    ];
    const revisar = () => setLiviano(convieneModoLiviano());

    revisar();
    for (const c of consultas) c.addEventListener('change', revisar);
    return () => {
      for (const c of consultas) c.removeEventListener('change', revisar);
    };
  }, []);

  return liviano;
}
