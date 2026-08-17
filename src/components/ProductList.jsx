import React, { useEffect, useRef, useState } from "react";
import MarcaEstado from "./MarcaEstado";
// Importamos los datos directamente sin usar Context
import { productsData } from "../data"; 
import { MdLocationOn, MdOutlineBathtub } from 'react-icons/md';
import { 
  BiBed, BiArea, BiHomeAlt, BiBuilding, BiLandscape, 
  BiQuestionMark, BiPackage, BiCar, BiStore, BiBuildingHouse 
} from 'react-icons/bi';
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCoverflow, Pagination, Mousewheel } from "swiper/modules";
import { chipTriEstado, chipMedida, etiquetaZona } from "../lib/format";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";

// COMPONENTE AUXILIAR OPTIMIZADO PARA REVELADO AL HACER SCROLL
const ScrollReveal = ({ children, delay = "delay-0" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(domRef.current);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -30px 0px" }
    );
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={domRef} className={`transform transition-all duration-1000 ease-out ${delay} ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {children}
    </div>
  );
};

// TARJETA DE PROPIEDAD
const ProductCard = ({ product }) => {
  const displayImage = product.images?.[0] || '/propiedades/casa-bajolavina-venta.png';
  
  // Validación de precio para evitar NaN
  const hasValidPrice = product.price !== undefined && product.price !== null && !isNaN(product.price) && product.price !== '';
  
  // Construcción del texto del precio en pesos o "A consultar"
  let priceText = "A consultar";
  if (hasValidPrice) {
    const formattedPrice = new Intl.NumberFormat('es-AR').format(product.price);
    priceText = product.category === 'Alquiler' ? `$ ${formattedPrice} / mes` : `$ ${formattedPrice}`;
  }

  const getTypeIcon = (type) => {
    const key = type?.toLowerCase() || "";
    if (key.includes("casa")) return <BiHomeAlt className="text-gray-700 text-lg" />;
    if (key.includes("depto") || key.includes("departamento")) return <BiBuildingHouse className="text-gray-700 text-lg" />;
    if (key.includes("galpon") || key.includes("deposito") || key.includes("industrial")) return <BiPackage className="text-gray-700 text-lg" />;
    if (key.includes("local") || key.includes("comercio") || key.includes("tienda")) return <BiStore className="text-gray-700 text-lg" />;
    if (key.includes("oficina")) return <BiBuilding className="text-gray-700 text-lg" />;
    if (key.includes("cochera") || key.includes("garage") || key.includes("estacionamiento")) return <BiCar className="text-gray-700 text-lg" />;
    if (key.includes("terreno") || key.includes("lote") || key.includes("campo")) return <BiLandscape className="text-gray-700 text-lg" />;
    return <BiQuestionMark className="text-gray-700 text-lg" />;
  };

  return (
    <div className="airbnb-property-card bg-white rounded-2xl p-4 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group w-[300px] md:w-[340px] mx-auto pointer-events-auto font-sans">
      <div>
        <div className="relative w-full h-[210px] md:h-[230px] overflow-hidden rounded-xl mb-3 bg-gray-50 flex items-center justify-center">
          <img src={displayImage} alt={product.name} className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105" loading="lazy" />
          <div className="absolute top-3 left-3 z-10"><span className="text-[11px] font-bold text-gray-900 bg-white px-2.5 py-1 rounded-md shadow-md uppercase">{product.category || "VENTA"}</span></div>
          <div className="absolute top-3 right-3 bg-white/90 hover:bg-white p-2 rounded-full shadow-md z-10 flex items-center justify-center">{getTypeIcon(product.detalles?.tipo)}</div>
          <MarcaEstado product={product} />
        </div>
        
        <div className="text-left px-0.5 select-none mb-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-gray-400 truncate max-w-[70%]">{etiquetaZona(product.detalles)}</span>
            <span className="text-xs font-medium text-gray-800 bg-gray-100 px-2 py-0.5 rounded shrink-0">{product.detalles?.tipo || "Inmueble"}</span>
          </div>
          <h4 className="property-card-title text-sm md:text-base font-bold text-gray-900 line-clamp-1 leading-tight mb-1 transition-colors duration-300">{product.name}</h4>
          
          {/* Chips compactos: cuando no hay dato se omite el chip ENTERO, ícono
              incluido (§2.3). Antes `|| 0` imprimía "0 Dorm." sobre propiedades
              sin dato, y "a consultar m²" cuando el valor era el centinela. */}
          {(() => {
            const chips = [
              { icono: <BiBed className="text-sm text-gray-600" />, valor: chipTriEstado(product.detalles?.dormitorios), sufijo: 'Dorm.' },
              { icono: <MdOutlineBathtub className="text-sm text-gray-600" />, valor: chipTriEstado(product.detalles?.banos), sufijo: 'Baños' },
              { icono: <BiArea className="text-sm text-gray-600" />, valor: chipMedida(product.detalles?.superficie_m2), sufijo: 'm²' },
            ].filter((c) => c.valor !== null);

            if (chips.length === 0) return null;

            return (
              <div className="flex items-center gap-3 text-xs text-gray-500 my-2 py-1 border-b border-gray-100/70">
                {chips.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {c.icono} <span className="font-medium">{c.valor} {c.sufijo}</span>
                  </span>
                ))}
              </div>
            );
          })()}
          <div className="text-base font-bold text-gray-900 mt-1"><span className="font-extrabold text-lg text-gray-900">{priceText}</span></div>
        </div>
      </div>
      {/* Reemplazado <Link> por <a> de HTML */}
      <a href={`/propiedades/${product.id}`} className="property-card-button w-full text-white text-center text-xs md:text-sm font-bold py-3 px-4 rounded-xl transition-colors duration-300 block shadow-xs mt-2">
        Ver detalles
      </a>
    </div>
  );
};

// CONTENEDOR PRINCIPAL
const ProductList = ({ products: productsProp }) => {
  // Fase 3: los datos llegan por prop desde index.astro. `data.jsx` queda como
  // fallback si la consulta a Supabase falla, hasta que se borre en la Fase 9.
  const products = productsProp ?? productsData ?? [];
  const baseProducts = products.slice(0, 10);

  return (
    <div id="latest-listings" className="animated-gradient-bg w-full pt-20 pb-28 overflow-hidden relative">
      
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center flex flex-col items-center select-none">
            <h1 className="text-3xl md:text-5xl font-bold tracking-wide dynamic-title">Últimas Novedades</h1>
            <p className="text-base md:text-xl mt-3 font-medium dynamic-subtitle">Conoce las últimas propiedades que tenemos para ofrecerte</p>
            <div className="flex items-center w-full max-w-[240px] sm:max-w-[320px] mt-5">
              <div className="flex-1 h-[2px] dynamic-line" />
              <span className="px-3 text-xl dynamic-icon"><MdLocationOn /></span>
              <div className="flex-1 h-[2px] dynamic-line" />
            </div>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal delay="delay-100">
        <div className="relative w-full mt-10 px-4 md:px-10 standard-swiper-container z-10">
          {baseProducts.length > 0 ? (
            <Swiper
              grabCursor={true} centeredSlides={true} slidesPerView={"auto"} speed={600} effect={"coverflow"} loop={true} mousewheel={{ forceToAxis: true }}
              pagination={{ clickable: true, dynamicBullets: true }}
              coverflowEffect={{ rotate: 35, stretch: -10, depth: 120, modifier: 1, slideShadows: true }}
              modules={[EffectCoverflow, Pagination, Mousewheel]} className="py-6" 
            >
              {baseProducts.map((product, idx) => (
                <SwiperSlide key={`${product.id}-${idx}`} style={{ width: 'auto' }}>
                  <ProductCard product={product} />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : (
            <p className="text-sm text-center text-gray-400 w-full py-8">No hay propiedades disponibles en este momento.</p>
          )}
        </div>
      </ScrollReveal>

      {/* ESTILOS CSS CON PALETA ROJO / AZUL MARINO DE MEDIANOCHE */}
      <style>{`
        .animated-gradient-bg {
          background: linear-gradient(-45deg, #fee2e2, #fca5a5, #991b1b, #1e1b4b, #0f172a, #31102f);
          background-size: 400% 400%;
          animation: fluidGradient 26s ease infinite;
        }

        @keyframes fluidGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .dynamic-title { color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.15); }
        .dynamic-subtitle { color: #f3f4f6; opacity: 0.9; }
        .dynamic-icon { color: #fca5a5; }
        .dynamic-line { background-color: rgba(255, 255, 255, 0.25); }

        .standard-swiper-container .swiper-pagination { position: absolute !important; bottom: -36px !important; }
        .standard-swiper-container .swiper-pagination-bullet-active { background: #f87171 !important; }
        .standard-swiper-container .swiper { overflow: visible !important; }
        .swiper-slide { transform-style: preserve-3d; backface-visibility: hidden; }

        .standard-swiper-container .airbnb-property-card {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4) !important;
        }
        .standard-swiper-container .airbnb-property-card .property-card-title { color: #111827 !important; }
        .standard-swiper-container .airbnb-property-card .property-card-button { background-color: #111827 !important; }

        .standard-swiper-container .swiper-slide-active .airbnb-property-card .property-card-title { color: #dc2626 !important; }
        .standard-swiper-container .swiper-slide-active .airbnb-property-card .property-card-button { background-color: #dc2626 !important; }
        .standard-swiper-container .swiper-slide-active .airbnb-property-card .property-card-button:hover { background-color: #b91c1c !important; }
      `}</style>
    </div>
  );
};

export default ProductList;