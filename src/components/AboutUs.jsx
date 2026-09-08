import { useState } from 'react';
import { FiCheckCircle, FiEye } from 'react-icons/fi';
import { FaPlay } from 'react-icons/fa';
// IMPORTACIÓN DEL VIDEO
import videoPresentacion from '../assets/presentacion.mp4';
import posterPresentacion from '../assets/presentacion-poster.webp';

// Astro/Vite devuelven un objeto con `.src` para los assets importados, pero un
// string pelado en algunos contextos. Mismo patrón que ya usa `Nosotros.jsx`.
const videoUrl = videoPresentacion?.src || videoPresentacion;
const posterUrl = posterPresentacion?.src || posterPresentacion;

const AboutUs = () => {
  /**
   * El video NO se carga hasta que la persona lo toca.
   *
   * Antes tenía `autoPlay` y pesa 13,43 MB, así que empezaba a bajar a los 1,4
   * segundos de abrir la home aunque estuviera abajo de todo y nadie lo hubiera
   * pedido. Medido con Lighthouse en celular, el efecto colateral era peor que
   * el peso en sí: saturaba la conexión y el video del Hero —el que es la
   * primera impresión del sitio— no lograba ni empezar a bajar hasta los 7,45
   * segundos, y seguía a los 11,8.
   *
   * Mientras tanto se muestra un fotograma del propio video como imagen (60 KB
   * en WebP, sacado del segundo 20), así que la sección se ve igual que antes;
   * lo único que cambia es que la reproducción arranca cuando la piden.
   */
  const [reproducir, setReproducir] = useState(false);

  // ==========================================
  // PARÁMETROS CONFIGURABLES DE DISEÑO
  // Modifica estos valores para ajustar el diseño a ojo.
  // ==========================================
  const TEXT_SPACINGS = {
    paddingTopTextContainer: "pt-12 md:pt-20", // CONTROLA LA ALTURA DEL TÍTULO: Espacio superior del bloque completo (ej: pt-12, pt-16, pt-24, pt-32)
    marginBottomTitle: "mb-14",       // Espacio debajo del título principal
    marginBottomMision: "mb-12",      // Espacio debajo del bloque de Misión
    gapInsideBlock: "gap-3"           // Espacio interno dentro de Misión/Visión
  };
  // ==========================================

  return (
    <div 
      id="about" 
      className="w-full flex flex-col md:flex-row bg-black overflow-hidden border-b border-black md:min-h-[900px]"
    >
      
      {/* 1. SECCIÓN IZQUIERDA: CONTENEDOR DEL VIDEO (VERTICAL CELULAR) */}
      <div className="relative w-full md:w-1/2 h-[70vh] md:h-[900px] overflow-hidden bg-gray-900">
        {reproducir ? (
          <video
            src={videoUrl}
            // `autoPlay` acá NO es carga automática: el elemento recién existe
            // después del toque, así que arranca porque se lo pidieron.
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setReproducir(true)}
            aria-label="Reproducir el video de la oficina"
            className="group absolute inset-0 w-full h-full cursor-pointer"
          >
            <img
              src={posterUrl}
              alt="Interior de la oficina de Inmobiliaria Sonia Flores"
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Suave a propósito: encima ya va el `bg-black/10` del contenedor,
                y si se oscurece de más se nota un salto de brillo al tocar. */}
            <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/15" />
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white">
              <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/70 bg-black/40 backdrop-blur-sm transition-transform group-hover:scale-110 group-active:scale-95">
                {/* Corrido un poco a la derecha: el triángulo se ve descentrado
                    dentro del círculo si se lo deja en el centro exacto. */}
                <FaPlay className="ml-1 text-2xl" />
              </span>
              <span className="text-sm font-medium tracking-wide drop-shadow-md">
                Tocá para ver el video
              </span>
            </span>
          </button>
        )}
        <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      </div>

      {/* 2. SECCIÓN DERECHA: CONTENEDOR DE TEXTOS */}
      <div className={`w-full md:w-1/2 bg-gradient-to-br from-red-900/60 via-stone-900 to-black p-8 sm:p-12 md:p-16 flex flex-col justify-start text-white ${TEXT_SPACINGS.paddingTopTextContainer}`}>
        
        {/* Título Principal */}
        <h2 className={`text-2xl sm:text-3xl md:text-4xl font-extrabold text-red-500 leading-tight tracking-wide max-w-xl ${TEXT_SPACINGS.marginBottomTitle}`}>
          Buscamos superar las expectativas de nuestros clientes
        </h2>

        {/* Bloque de Contenido: Misión */}
        <div className={`flex flex-col max-w-xl ${TEXT_SPACINGS.gapInsideBlock} ${TEXT_SPACINGS.marginBottomMision}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl md:text-2xl text-red-500 shrink-0">
              <FiCheckCircle />
            </span>
            <h3 className="text-lg md:text-xl font-bold tracking-wider uppercase text-gray-100">
              Misión
            </h3>
          </div>
          <p className="text-sm md:text-base text-gray-300 font-light leading-relaxed pl-8 md:pl-9">
            En Sonia Flores Inmobiliaria transformamos el mercado inmobiliario del norte argentino a través de soluciones eficientes y desarrollos de alta calidad. Fusionamos la calidez del trato personal con el impulso del talento joven y la tecnología para generar mejores oportunidades para nuestros clientes.
          </p>
        </div>

        {/* Bloque de Contenido: Visión */}
        <div className={`flex flex-col max-w-xl ${TEXT_SPACINGS.gapInsideBlock}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl md:text-2xl text-red-500 shrink-0">
              <FiEye />
            </span>
            <h3 className="text-lg md:text-xl font-bold tracking-wider uppercase text-gray-100">
              Visión
            </h3>
          </div>
          <p className="text-sm md:text-base text-gray-300 font-light leading-relaxed pl-8 md:pl-9">
            Liderar el mercado inmobiliario de Jujuy y la innovación digital en el norte argentino, haciendo de la compra, venta, alquiler e inversión un proceso ágil, transparente y accesible. Impulsamos proyectos de impacto positivo guiados por un servicio dinámico, humano y en constante mejora.
          </p>
        </div>

      </div>

    </div>
  );
};

export default AboutUs;