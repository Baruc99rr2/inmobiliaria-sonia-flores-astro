import { FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';

/**
 * El Hero ya no mide el ancho de la ventana.
 *
 * Antes arrancaba con `typeof window !== 'undefined' ? window.innerWidth : 1200`.
 * En el servidor eso da 1200 siempre, así que el HTML salía con las clases de
 * escritorio y recién al hidratar React leía el ancho real y las corregía: en un
 * celular se veía el salto en cada carga (el título arrancaba sin el espacio de
 * arriba y con el ancho equivocado, y a los milisegundos se acomodaba).
 *
 * La cura de raíz es no decidir el diseño en JavaScript. Los tres cortes que
 * usaba el componente pasaron a media queries de CSS, que el navegador resuelve
 * antes del primer pintado. Los umbrales son exactamente los de antes:
 *
 *   isResponsiveMode (< 1100px)  ->  `min-[1100px]:` para el lado de escritorio
 *   isMobile         (< 640px)   ->  `sm:` , que en Tailwind ES 640px
 *
 * Como quedó sin estado ni efectos, tampoco vuelve a renderizarse al rotar el
 * teléfono ni escucha `resize`.
 */
const Hero = ({ onVideoLoaded }) => {
  return (
    <div
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-12 min-[1100px]:pt-0 min-[1100px]:pb-0"
      // SE AGREGA LA IMAGEN DE FONDO ACÁ PARA EVITAR PANTALLAZOS GRISES
      style={{
        backgroundImage: "url('/videos/hero-realstate.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      
      {/* Video de Fondo */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        // Le pasamos la misma imagen al poster por seguridad del navegador
        poster="/videos/hero-realstate.webp" 
        // Cuando el video ya cargó lo suficiente para reproducirse, avisa a App.jsx
        onCanPlayThrough={onVideoLoaded}
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        style={{ willChange: "transform" }}
      >
        <source src="/videos/hero-video.mp4" type="video/mp4" />
        Tu navegador no soporta videos integrados.
      </video>

      {/* Capa oscura para legibilidad */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/45 z-10" />

      {/* Contenedor de Texto Responsivo */}
      <div className="relative flex justify-center items-center px-6 sm:px-12 md:px-24 w-full max-w-screen-xl z-20 text-center">
        <div className="w-full text-white select-none transition-all duration-300 flex flex-col items-center max-w-md min-[1100px]:max-w-4xl">
          
          <h1 className="font-bold leading-tight tracking-wide drop-shadow-md text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Tu futuro empieza en la puerta de tu nuevo hogar
          </h1>

          {/* El `sm:backdrop-blur-xs` reemplaza al `!isMobile ? ...` de antes y
              respeta el mismo corte de 640px: el desenfoque sigue sin aplicarse
              en celulares, donde es caro, y por eso el fondo ahí es más opaco
              (`bg-black/40` contra `sm:bg-black/20`). */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-stone-200 text-xs sm:text-sm md:text-base font-light tracking-wide bg-black/40 sm:bg-black/20 px-5 py-3 sm:py-2 rounded-2xl sm:rounded-full border border-white/5 shadow-lg sm:backdrop-blur-xs">
            
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-red-500 shrink-0" />
              <span>Independencia 1172, San Salvador de Jujuy, Argentina.</span>
            </div>

            <span className="hidden sm:inline text-white/30">|</span>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <a 
                href="tel:+5438854881245" 
                className="flex items-center gap-2 hover:text-red-400 transition-colors cursor-pointer"
                title="Llamar por teléfono"
              >
                <FaPhoneAlt className="text-red-500 shrink-0 text-xs" />
                <span className="font-medium">388 54881245</span>
              </a>
              <span className="text-xs text-stone-400 font-normal">
                (Solo llamadas • 9 a 12 y 16 a 18 hs)
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;