import { Calculator, KeyRound, Handshake, ClipboardList } from "lucide-react";

/* =========================================================================
   LOS SERVICIOS

   `destacado` es lo que arma el bento: la tarjeta marcada ocupa el doble de
   ancho y el doble de alto en escritorio, y las otras tres se acomodan
   alrededor. Mover el destacado a otro servicio es cambiar ESA sola línea; la
   grilla se reacomoda sola porque las clases salen de `medidasDeTarjeta`.

   Está en TASACIONES a propósito y no por descarte: es el primer paso de quien
   quiere vender, así que es la puerta de entrada natural de la sección. Si la
   dueña prefiere destacar Alquileres —que es de lo que más hay en la cartera—,
   se mueve la marca y listo.

   Los textos NO se tocaron: son los mismos que ya estaban.
   ========================================================================= */
const SERVICIOS = [
  {
    id: 1,
    icono: Calculator,
    titulo: "TASACIONES",
    texto:
      "Para vender tu propiedad, es muy importante conocer el precio real de mercado que esta tiene. El mismo se ajusta al contexto inmobiliario y otros factores decisivos.",
    destacado: true,
  },
  {
    id: 2,
    icono: KeyRound,
    titulo: "ALQUILERES",
    texto:
      "Contamos con una amplia cartera de propiedades para alquiler, con excelente ubicación y calidad en sus ambientes. Propiedades en excelente estado, para disfrutar de tu espacio como te merecés.",
  },
  {
    id: 3,
    icono: Handshake,
    titulo: "VENTAS",
    texto:
      "Contamos con una amplia cartera de propiedades en venta que cumplen con altos estándares de calidad. Fueron seleccionadas considerando ubicación, dimensiones y calidad constructiva.",
  },
  {
    id: 4,
    icono: ClipboardList,
    titulo: "ADMINISTRACIÓN",
    texto:
      "Gestionamos el cobro de alquileres, depósitos en cuentas bancarias, morosidad, impuestos, pagos de servicios y expensas. Contratos personalizados y con normativas vigentes.",
  },
];

/* =========================================================================
   CÓMO SE ACOMODA CADA TARJETA

   La grilla es de 1 columna en celular, 2 en `sm` y 4 en `lg`. En `lg` quedan
   dos filas de cuatro:

       ┌───────────────┬───────┬───────┐
       │               │  ALQ  │  VEN  │
       │  TASACIONES   ├───────┴───────┤
       │               │ ADMINISTRACIÓN│
       └───────────────┴───────────────┘

   El destacado ocupa 2x2; el último de la lista ocupa 2x1 para cerrar la
   segunda fila. Así se rompe la simetría de las cuatro tarjetas iguales sin
   dejar huecos.

   OJO: las clases van ESCRITAS ENTERAS y no armadas con plantillas. Tailwind
   busca texto literal en los archivos, así que un `lg:col-span-${n}` no genera
   nada. Ya pasó dos veces en este proyecto (`py-1.3` en el navbar y el
   `backdrop-blur` de "Sobre Mí"), y el síntoma siempre es el mismo: el
   `className` se ve bien en el DOM y no hay ningún efecto.
   ========================================================================= */
function medidasDeTarjeta(servicio, indice, total) {
  // `lg:justify-center` no es decorativo: al ocupar dos filas, la tarjeta
  // destacada queda mucho más alta que su texto y sin esto el contenido se
  // apelotona arriba con un hueco blanco abajo.
  if (servicio.destacado) return "sm:col-span-2 lg:col-span-2 lg:row-span-2 lg:justify-center";
  if (indice === total - 1) return "sm:col-span-2 lg:col-span-2";
  return "";
}

const Servicios = () => {
  return (
    <section
      id="services"
      className="relative w-full overflow-hidden bg-[#d64531] px-4 py-24 sm:px-6 md:px-12 lg:px-24"
    >
      {/* FONDO DE AZULEJOS.

          Antes esto eran 48 divs vacíos: un grid para celular y otro para
          escritorio, dibujados los dos para que eligiera el CSS. Ese fue el
          arreglo mínimo de la Parte 2, cuando el problema urgente era que la
          cantidad de nodos dependía de `window.innerWidth` y rompía la
          hidratación.

          Ahora son CERO nodos. Las juntas entre azulejos son dos degradados de
          fondo, que es lo que siempre fueron visualmente: líneas oscuras sobre
          el rojo. El `background-position` de -2px corre la primera línea fuera
          del borde, para que no quede una raya pegada al filo, igual que antes
          pasaba con el `gap`. */}
      <div aria-hidden="true" className="azulejos pointer-events-none absolute inset-0" />

      {/* CAPA DE TEXTURA RUGOSA (Mantiene el efecto áspero de la terracota) */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <filter id="terracota-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#terracota-noise)" />
        </svg>
      </div>

      {/* SOMBREADO GENERAL SUTIL */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/15" />

      {/* CONTENIDO DE LA SECCIÓN */}
      <div className="relative z-10 mx-auto max-w-7xl">

        {/* TÍTULO SECCIÓN */}
        <div className="mb-16 select-none text-center">
          <h2 className="text-3xl font-bold uppercase tracking-wide text-white drop-shadow-md md:text-5xl">
            Nuestros servicios
          </h2>
          <div className="mx-auto mt-4 h-[3px] w-24 bg-white opacity-80" />
        </div>

        {/* GRILLA BENTO */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 md:gap-8">
          {SERVICIOS.map((servicio, indice) => {
            const Icono = servicio.icono;
            const destacado = Boolean(servicio.destacado);

            return (
              <article
                key={servicio.id}
                /* La transición dice `translate` y NO `transform`: en Tailwind v4
                   `-translate-y-2` escribe la propiedad CSS `translate`, no
                   `transform`. Con `transition-[transform,box-shadow]` la sombra
                   se animaba pero la tarjeta SALTABA los 8px de golpe. Se
                   detectó leyendo `getComputedStyle(...).translate` con y sin
                   hover, no mirando la pantalla. */
                className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white p-7 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)] transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] md:p-8 ${medidasDeTarjeta(
                  servicio,
                  indice,
                  SERVICIOS.length
                )}`}
              >
                {/* BORDE SUPERIOR EN EL ROJO DE MARCA.

                    OJO CON EL TONO: la primera versión usaba el rojo de marca
                    exacto, `#d64531`, y era INVISIBLE. El fondo de esta sección
                    es ese mismo rojo, así que una barra al filo superior de la
                    tarjeta quedaba pegada a un fondo idéntico y no se leía como
                    borde: parecía que la tarjeta simplemente empezaba más abajo.
                    Se comprobó recortando la captura y ampliándola, después de
                    que el estilo computado dijera que estaba bien (6px, color
                    correcto, y `elementFromPoint` devolvía la propia barra).

                    `#a2301f` es el mismo rojo bajado de luminosidad: contrasta
                    contra el fondo rojo y contra el blanco de la tarjeta, y
                    sigue leyéndose como color de la marca.

                    Se ve SIEMPRE, no solo al pasar el mouse: en un celular no
                    existe el hover, así que un detalle que solo aparece ahí no
                    lo ve nunca la mitad de la gente. Lo exclusivo del hover es
                    que se engorda, además de la elevación y la sombra. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1.5 bg-[#a2301f] transition-[height] duration-300 ease-out group-hover:h-[9px]"
                />

                <span
                  className={`mb-5 flex items-center justify-center rounded-xl bg-[#d64531]/10 text-[#d64531] transition-colors duration-300 group-hover:bg-[#d64531] group-hover:text-white ${
                    destacado ? "size-16" : "size-14"
                  }`}
                >
                  <Icono className={destacado ? "size-8" : "size-7"} strokeWidth={1.8} />
                </span>

                <h3
                  className={`mb-3 font-bold uppercase tracking-wide text-[#d64531] ${
                    destacado ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
                  }`}
                >
                  {servicio.titulo}
                </h3>

                <p
                  className={`leading-relaxed text-gray-700 ${
                    destacado ? "text-base md:text-lg" : "text-sm md:text-base"
                  }`}
                >
                  {servicio.texto}
                </p>
              </article>
            );
          })}
        </div>

      </div>

      <style>{`
        /* Las juntas entre azulejos, sin un solo nodo en el DOM.
           4 columnas en celular y 8 desde 768px, que son los mismos números que
           tenía el grid de divs. Las filas son 4 en los dos casos. */
        .azulejos {
          background-image:
            linear-gradient(to right, rgba(0, 0, 0, 0.15) 2px, transparent 2px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.15) 2px, transparent 2px);
          background-position: -2px -2px;
          background-size: calc(100% / 4) calc(100% / 4);
        }

        @media (min-width: 768px) {
          .azulejos { background-size: calc(100% / 8) calc(100% / 4); }
        }
      `}</style>
    </section>
  );
};

export default Servicios;
