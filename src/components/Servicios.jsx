import React from 'react';

const Servicios = () => {
  
  // ==========================================
  // PARÁMETROS CONFIGURABLES DE LOS AZULEJOS
  // Modifica las filas y columnas para cambiar la cantidad de subdivisiones a ojo.
  // ==========================================
  const GRID_CONFIG = {
    desktop: {
      columns: 8, // Columnas en PC
      rows: 4     // Filas en PC (8x4 = 32 azulejos)
    },
    mobile: {
      columns: 4, // Columnas en celular
      rows: 4     // Filas en celular (4x4 = 16 azulejos para que no saturen)
    }
  };
  // ==========================================

  const serviciosData = [
    {
      id: 1,
      title: "TASACIONES",
      text: "Para vender tu propiedad, es muy importante conocer el precio real de mercado que esta tiene. El mismo se ajusta al contexto inmobiliario y otros factores decisivos."
    },
    {
      id: 2,
      title: "ALQUILERES",
      text: "Contamos con una amplia cartera de propiedades para alquiler, con excelente ubicación y calidad en sus ambientes. Propiedades en excelente estado, para disfrutar de tu espacio como te merecés."
    },
    {
      id: 3,
      title: "VENTAS",
      text: "Contamos con una amplia cartera de propiedades en venta que cumplen con altos estándares de calidad. Fueron seleccionadas considerando ubicación, dimensiones y calidad constructiva."
    },
    {
      id: 4,
      title: "ADMINISTRACIÓN",
      text: "Gestionamos el cobro de alquileres, depósitos en cuentas bancarias, morosidad, impuestos, pagos de servicios y expensas. Contratos personalizados y con normativas vigentes."
    }
  ];

  // Cálculo matemático para generar el array de bloques vacíos del fondo dinámicamente
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const currentConfig = isMobile ? GRID_CONFIG.mobile : GRID_CONFIG.desktop;
  const totalTiles = currentConfig.columns * currentConfig.rows;
  const tilesArray = Array.from({ length: totalTiles });

  return (
    <div id="services" className="relative w-full py-24 px-4 sm:px-6 md:px-12 lg:px-24 overflow-hidden bg-[#d64531]">
      
      {/* FONDO SUBDIVIDIDO TOTALMENTE DINÁMICO */}
      <div 
        className="absolute inset-0 gap-[2px] bg-black/15 pointer-events-none"
        style={{
          display: 'grid',
          // Seteamos las columnas y filas usando las variables configuradas arriba
          gridTemplateColumns: `repeat(${currentConfig.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${currentConfig.rows}, minmax(0, 1fr))`
        }}
      >
        {tilesArray.map((_, index) => (
          <div key={`tile-${index}`} className="bg-[#d64531] w-full h-full" />
        ))}
      </div>

      {/* CAPA DE TEXTURA RUGOSA (Mantiene el efecto áspero de la terracota) */}
      <div className="absolute inset-0 opacity-[0.14] pointer-events-none mix-blend-overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <filter id="terracota-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#terracota-noise)" />
        </svg>
      </div>

      {/* SOMBREADO GENERAL SUTIL */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/15 pointer-events-none" />

      {/* CONTENIDO DE LA SECCIÓN */}
      <div className="relative max-w-7xl mx-auto z-10">
        
        {/* TÍTULO SECCIÓN */}
        <div className="text-center mb-16 select-none">
          <h2 className="text-3xl md:text-5xl font-bold text-white tracking-wide uppercase drop-shadow-md">
            Nuestros servicios
          </h2>
          <div className="w-24 h-[3px] bg-white mx-auto mt-4 opacity-80" />
        </div>

        {/* GRILLA DE TARJETAS FLOTANTES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {serviciosData.map((servicio) => (
            <div 
              key={servicio.id}
              className="bg-white px-6 py-10 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] border border-white/5 flex flex-col items-center text-center transition-all duration-300 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.55)] hover:-translate-y-2 backface-hidden"
            >
              <h3 className="text-lg md:text-xl font-bold text-[#d64531] mb-5 tracking-wide uppercase px-2">
                {servicio.title}
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-normal">
                {servicio.text}
              </p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default Servicios;