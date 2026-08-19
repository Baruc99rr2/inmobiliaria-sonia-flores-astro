import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';

const Hero = ({ onVideoLoaded }) => {
  // Inicialización segura para SSR (Server-Side Rendering de Astro)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const isResponsiveMode = windowWidth < 1100;
  const isMobile = windowWidth < 640;

  return (
    <div 
      className={`relative min-h-screen flex flex-col items-center justify-center overflow-hidden ${isResponsiveMode ? 'pt-24 pb-12' : 'pt-0'}`}
      // SE AGREGA LA IMAGEN DE FONDO ACÁ PARA EVITAR PANTALLAZOS GRISES
      style={{
        backgroundImage: "url('/videos/hero-realstate.jpg')",
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
        poster="/videos/hero-realstate.jpg" 
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
        <div className={`w-full text-white select-none transition-all duration-300 flex flex-col items-center ${isResponsiveMode ? 'max-w-md' : 'max-w-4xl'}`}>
          
          <h1 className="font-bold leading-tight tracking-wide drop-shadow-md text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Tu futuro empieza en la puerta de tu nuevo hogar
          </h1>

          <div className={`mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-stone-200 text-xs sm:text-sm md:text-base font-light tracking-wide bg-black/40 sm:bg-black/20 px-5 py-3 sm:py-2 rounded-2xl sm:rounded-full border border-white/5 shadow-lg ${!isMobile ? 'backdrop-blur-xs' : ''}`}>
            
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