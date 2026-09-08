import { useEffect, useRef, useState } from "react";
import { CalendarDays, BadgeCheck } from "lucide-react";
import cerrosGrande from "../assets/cerros-jujuy-1920.webp";
import cerrosChico from "../assets/cerros-jujuy-1024.webp";
import SoniaLogo from "../assets/SoniaLogo.webp";

/* =========================================================================
   EL FONDO DE LA SECCIÓN — ÚNICO PUNTO A TOCAR

   Es una foto de los cerros de Jujuy con la ruta de entrada. Reemplazó a una
   ciudad genérica con rascacielos que no eran de acá y no decían nada de la
   inmobiliaria.

   Para cambiarla de nuevo se toca SOLO este bloque: los dos `import` de arriba
   y, si hace falta, `oscurecido` y `posicion`. Nada más en el archivo depende de
   cuál sea la imagen.

     - Si la foto nueva es más clara, subir `oscurecido` para que el texto
       blanco siga legible. Si es más oscura, bajarlo.
     - `posicion` sirve cuando el motivo importante no está en el centro. Acá va
       en 38% porque los cerros están en la mitad de arriba: con `center`, el
       recorte del `cover` mostraba sobre todo el asfalto de la ruta.

   Si en vez de una foto se quiere un color plano, alcanza con poner
   `chica: null` y `grande: null`, y quedan solo las capas de color.

   ---
   DOS ANCHOS, NO UNO

   El original de Unsplash pesa 5,4 MB y mide 5472x4048. Servir eso para un
   fondo sería tirar a la basura todo lo que se ganó en la Parte 2. Hay dos
   versiones en WebP: 1024px para celular (119 KB) y 1920px para escritorio
   (425 KB). Al ir bajo una capa oscura, la calidad puede ser baja sin que se
   note: 66 en la escala de libwebp.

   El cambio entre una y otra va por media query en el bloque `<style>` de más
   abajo, no por JavaScript: así lo resuelve el navegador antes de pintar y no
   se descargan las dos.
   ========================================================================= */
const FONDO = {
  chica: cerrosChico?.src || cerrosChico,
  grande: cerrosGrande?.src || cerrosGrande,
  posicion: "center 38%",
  // 70, bastante más que el 55 de la foto anterior: esta tiene cielo celeste y
  // nubes blancas, contra la ciudad de noche que había antes.
  //
  // El número NO se eligió a ojo. Se midió el contraste real entre el color del
  // texto y el fondo efectivamente pintado detrás, ocultando el contenido y
  // leyendo los píxeles. Lo importante fue mirar el PEOR punto y no el
  // promedio: con 60 el promedio daba 10,7 —parecía perfecto— pero el peor
  // píxel, una nube, daba 1,24 contra el requisito de 4,5 de la pauta AA.
  // Con 70 el peor caso queda en 12,1 en celular y 11,8 en escritorio.
  oscurecido: "bg-black/70",
};

const SoniaLogoUrl = SoniaLogo?.src || SoniaLogo;

/* =========================================================================
   DATOS DE LA MARTILLERA

   SOLO datos verificables. Nada de "100+ propiedades vendidas" ni métricas
   parecidas: no están confirmadas por la dueña, y una cifra inventada en un
   rubro donde lo que se vende es confianza hace más daño que no poner nada.

   Los dos que están salen del texto que ya venía en la sección: la matrícula
   y el año en que empezó.
   ========================================================================= */
const CREDENCIALES = [
  { icono: CalendarDays, etiqueta: "Desde", valor: "2008" },
  { icono: BadgeCheck, etiqueta: "Matrícula", valor: "M.P. 177" },
];

/* =========================================================================
   EL EFECTO DE VIDRIO, SOLO EN ESCRITORIO

   `backdrop-filter: blur()` es de lo más caro que puede hacer un navegador de
   celular, y venimos justo de sacar trabajo de pintado de encima (Parte 2). Así
   que el vidrio se aplica únicamente donde hay puntero de precisión.

   El corte NO es por ancho de pantalla: `(hover: hover) and (pointer: fine)`
   pregunta si el aparato tiene mouse, que es la misma idea que usa
   `src/lib/capacidad.js`. Una tablet de 1024px manejada con el dedo NO paga el
   desenfoque; una notebook con la ventana a medias sí lo tiene.

   En celular queda un fondo semitransparente sin desenfoque, más opaco para
   compensar que no difumina lo de atrás.
   ========================================================================= */
// DOS TRAMPAS DE TAILWIND, las dos pisadas en este archivo y encontradas
// buscando la regla en la hoja de estilos, no mirando la pantalla:
//
//  1. En una variante arbitraria, `_` es como se escribe un ESPACIO. Sin los
//     guiones bajos queda `@media(hover:hover)and(pointer:fine)`, que es CSS
//     invalido: `)and(` necesita espacios alrededor.
//
//  2. La clase entera tiene que estar ESCRITA en el codigo. Tailwind busca
//     texto literal en los archivos; no ejecuta nada. Al armarla con
//     `${VARIABLE}backdrop-blur-xl` la clase nunca aparece completa y la regla
//     no se genera, aunque en pantalla el `className` se vea bien.
//
// Por eso las dos clases van escritas enteras, aunque se repita el prefijo.
const CRISTAL =
  "bg-black/55 " +
  "[@media(hover:hover)_and_(pointer:fine)]:bg-white/10 " +
  "[@media(hover:hover)_and_(pointer:fine)]:backdrop-blur-xl";

// COMPONENTE AUXILIAR PARA EL EFECTO DE APARICIÓN SUAVE (SPAWN)
const ScrollReveal = ({ children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef(null);

  useEffect(() => {
    const nodo = domRef.current;
    if (!nodo) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(nodo);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={domRef}
      className={`transform transition-all duration-1000 ease-out ${className} ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {children}
    </div>
  );
};

const Nosotros = () => {
  return (
    <section
      id="about-section"
      className="fondo-sobre-mi relative w-full overflow-hidden bg-stone-950 py-20 sm:py-24 md:py-32"
    >
      {/* Dos capas sobre la foto: una pareja para legibilidad y un degradado
          desde la izquierda, que es de donde arranca el contenido. */}
      <div className={`absolute inset-0 ${FONDO.oscurecido} pointer-events-none`} />
      {/* El lado derecho llega a 45 y no a 25 como antes: ahí va el párrafo, y
          medido sobre la foto de los cerros el 25 dejaba pasar las nubes. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/45 pointer-events-none" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* EL LAYOUT ASIMÉTRICO.
            En escritorio son 12 columnas: 4 para la credencial y 7 para el
            texto, con una de aire en el medio. Esa desproporción es a propósito
            —antes era una caja centrada y simétrica, que se veía plana—.
            En celular se apilan, con la credencial arriba. */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:items-center md:gap-4">

          {/* ---------- COLUMNA IZQUIERDA: EL SELLO ---------- */}
          <ScrollReveal className="md:col-span-4">
            <div className={`rounded-2xl border border-white/15 p-6 shadow-2xl sm:p-8 ${CRISTAL}`}>
              {/* El logo va sobre una placa blanca, como una credencial.
                  Directamente sobre la tarjeta oscura no se leía: el texto
                  "SONIA FLORES INMOBILIARIA" del PNG es negro y desaparecía.
                  La alternativa era teñirlo de blanco con un filtro, pero eso
                  se come el rojo de la marca. */}
              <span className="mb-6 inline-block rounded-xl bg-white px-4 py-3 shadow-lg">
                <img
                  src={SoniaLogoUrl}
                  alt="Inmobiliaria Sonia Flores"
                  className="block w-28 select-none sm:w-32"
                  loading="lazy"
                />
              </span>

              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                Martillera Pública Nacional
              </p>
              <p className="mt-1 text-xl font-bold text-white">Sonia Alba Flores</p>

              <div className="mt-6 flex flex-col gap-3 border-t border-white/15 pt-5">
                {CREDENCIALES.map(({ icono: Icono, etiqueta, valor }) => (
                  <div key={etiqueta} className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#d64531] text-white">
                      <Icono className="size-4" strokeWidth={2.2} />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-[11px] uppercase tracking-wider text-white/55">
                        {etiqueta}
                      </span>
                      <span className="block text-base font-semibold text-white">{valor}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* ---------- COLUMNA DERECHA: EL TEXTO ---------- */}
          {/* `md:col-start-6` deja la columna de aire entre las dos. */}
          <ScrollReveal className="md:col-span-7 md:col-start-6">
            {/* Alineado a la izquierda, no centrado: un párrafo largo centrado
                obliga a buscar dónde arranca cada renglón. */}
            <div className="text-left">
              <h2 className="text-3xl font-bold tracking-wide text-white drop-shadow-sm sm:text-4xl md:text-5xl">
                Sobre Mí
              </h2>

              {/* El subrayado de lapicera que ya tenía la sección, ahora
                  alineado a la izquierda y en el rojo de la marca. */}
              <svg
                viewBox="0 0 200 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mt-3 h-auto w-[150px] drop-shadow-md sm:w-[190px]"
                aria-hidden="true"
              >
                <path
                  d="M5 12C35 9.5 70 8 105 8.5C140 9 170 11.5 195 14.5"
                  className="stroke-[#d64531]"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* El texto se partió en dos párrafos: era un solo bloque de nueve
                  renglones, que en un celular es un muro. El contenido no cambia. */}
              <p className="mt-7 max-w-2xl text-[15px] leading-relaxed text-gray-200 sm:text-lg">
                Detrás de esta organización se encuentra{" "}
                <strong className="font-semibold text-white">Sonia Alba Flores</strong>,
                Martillera Pública Nacional, profesional que desde el año 2008 acompaña a
                sus clientes con seriedad, ética y un profundo conocimiento del mercado.
              </p>

              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-gray-300 sm:text-lg">
                Nos especializamos en la compra, venta y administración estratégica de
                inmuebles, destacándonos como un aliado clave para empresas y emprendedores
                al facilitar soluciones ágiles mediante una selecta cartera de locales
                comerciales y galpones industriales diseñados para potenciar el desarrollo
                de sus negocios.
              </p>
            </div>
          </ScrollReveal>

        </div>
      </div>

      {/* El fondo va por CSS y no en un `style` en linea, porque hace falta una
          media query para elegir entre la version de 1024 y la de 1920. Si
          `FONDO.chica` es null, no se pinta nada y queda el color de la
          seccion. */}
      {FONDO.chica && (
        <style>{`
          .fondo-sobre-mi {
            background-image: url(${FONDO.chica});
            background-size: cover;
            background-position: ${FONDO.posicion};
          }
          @media (min-width: 1024px) {
            .fondo-sobre-mi { background-image: url(${FONDO.grande}); }
          }
        `}</style>
      )}
    </section>
  );
};

export default Nosotros;
