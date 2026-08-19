import { useEffect, useRef, useState } from "react";
import { MdBusiness } from 'react-icons/md';
import fondoNos from "../assets/fondoNos.jpg"; 
import SoniaLogo from "../assets/SoniaLogo.png"; 

// Extraemos la URL en string (.src) que genera el procesador de Astro/Vite
const fondoNosUrl = fondoNos?.src || fondoNos;
const SoniaLogoUrl = SoniaLogo?.src || SoniaLogo;

// =========================================================================
//  PARAMETROS CONFIGURABLES
// =========================================================================
const DISENO = {
  alturaSeccionMobile: "min-h-[90vh]", 
  alturaSeccionDesktop: "md:min-h-[95vh]", 

  cuadroPaddingMobile: "p-6 py-10", 
  cuadroPaddingDesktop: "sm:p-12 md:p-16", 

  tituloSizeMobile: "text-2xl", 
  tituloSizeDesktop: "sm:text-4xl md:text-5xl",

  textSizeMobile: "text-[14px]", 
  textSizeDesktop: "sm:text-lg md:text-xl",

  colorLapicera: "stroke-white", 
  grosorLapicera: "3", 

  logoFondoSizeMobile: "w-20", 
  logoFondoSizeDesktop: "sm:w-28 md:w-32", 
  logoFondoPosicionMobile: "top-3 left-3", 
  logoFondoPosicionDesktop: "md:top-5 md:left-5", 
  logoFondoOpacity: "opacity-100", 
};
// =========================================================================

// COMPONENTE AUXILIAR PARA EL EFECTO DE APARICIÓN SUAVE (SPAWN)
const ScrollReveal = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
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

    if (domRef.current) observer.observe(domRef.current);
    return () => {
      if (domRef.current) observer.unobserve(domRef.current);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transform transition-all duration-1000 ease-out ${
        isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-8"
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
      className={`relative w-full ${DISENO.alturaSeccionMobile} ${DISENO.alturaSeccionDesktop} flex items-center justify-center bg-cover bg-center overflow-hidden`}
      style={{ backgroundImage: `url(${fondoNosUrl})` }}
    >
      {/* Capa de superposición oscura para contraste */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Contenedor Responsivo del Cuadro Central */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 md:px-8">
        <ScrollReveal>
          <div className={`relative bg-gradient-to-br from-red-700 via-red-950 to-black text-white rounded-2xl ${DISENO.cuadroPaddingMobile} ${DISENO.cuadroPaddingDesktop} shadow-2xl text-center select-none backdrop-blur-sm overflow-hidden border border-white/10`}>
            
            {/* LOGO PERSONALIZADO */}
            <img 
              src={SoniaLogoUrl} 
              alt="Sonia Flores Isotipo" 
              className={`absolute ${DISENO.logoFondoPosicionMobile} ${DISENO.logoFondoPosicionDesktop} ${DISENO.logoFondoSizeMobile} ${DISENO.logoFondoSizeDesktop} ${DISENO.logoFondoOpacity} pointer-events-none select-none`}
            />
            
            {/* Ícono de negocio sutil en la esquina inferior derecha */}
            <MdBusiness className="absolute -bottom-10 -right-6 text-8xl sm:text-9xl text-white/5 pointer-events-none" />
            
            {/* Título Principal */}
            <h2 className={`${DISENO.tituloSizeMobile} ${DISENO.tituloSizeDesktop} font-bold tracking-wide drop-shadow-sm mb-1`}>
              Sobre Mí
            </h2>
            
            {/* SUBRAYADO ESTILO TRAZO DE LAPICERA */}
            <div className="w-full max-w-[140px] sm:max-w-[200px] mx-auto mb-6 sm:mb-8 opacity-85">
              <svg 
                viewBox="0 0 200 20" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto drop-shadow-md"
              >
                <path 
                  d="M5 12C35 9.5 70 8 105 8.5C140 9 170 11.5 195 14.5" 
                  className={DISENO.colorLapicera}
                  strokeWidth={DISENO.grosorLapicera} 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            
            {/* Texto Profesionalizado */}
            <p className={`relative z-10 ${DISENO.textSizeMobile} ${DISENO.textSizeDesktop} font-normal leading-relaxed text-gray-200 max-w-3xl mx-auto drop-shadow-sm px-2`}>
              Detrás de esta organización se encuentra Sonia Alba Flores, Martillera Pública Nacional (M.P. 177), profesional que desde el año 2008 acompaña a sus clientes con seriedad, ética y un profundo conocimiento del mercado. Nos especializamos en la compra, venta y administración estratégica de inmuebles, destacándonos como un aliado clave para empresas y emprendedores al facilitar soluciones ágiles mediante una selecta cartera de locales comerciales y galpones industriales diseñados para potenciar el desarrollo de sus negocios.
            </p>

          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Nosotros;