import React from 'react';
import { FiCheckCircle, FiEye } from 'react-icons/fi';
// IMPORTACIÓN DEL VIDEO
import videoPresentacion from '../assets/presentacion.mp4';

const AboutUs = () => {

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
        <video
          src={videoPresentacion}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
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