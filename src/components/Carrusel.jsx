import { useState, useEffect, useRef, useMemo } from "react";
import { estaDisponible } from "../lib/mapProperty";
import { portadaDe } from "../lib/media";
// Importación directa de los datos sin depender de ShopContext
import { productsData } from "../data";
import { MdLocationOn } from 'react-icons/md';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// IMPORTACIÓN DE TU COMPONENTE LOCAL RIPPLE BUTTON
import { RippleButton, RippleButtonRipples } from './RippleButton';

// 1. IMPORTACIÓN DEL FONDO DESDE TU RUTA REAL
import { BubbleBackground } from './bubble';
import { etiquetaZona } from '../lib/format';

// 2. TU COMPONENTE EXACTO optimizado para desactivar interactividad si es móvil
const BubbleBackgroundDemo = ({ interactive }) => {
  return (
    <BubbleBackground
      interactive={interactive}
      className="absolute inset-0 flex items-center justify-center rounded-xl"
    />
  );
};

// COMPONENTE AUXILIAR OPTIMIZADO PARA EL EFECTO DE DESLIZAMIENTO AL CARGAR
const ScrollReveal = ({ children, delay = "delay-0" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
    );

    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);
    
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transform transition-all duration-700 ease-out ${delay} ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </div>
  );
};

// TARJETA DE PROPIEDAD ESTILO BANNER 3D
const ProductCard = ({ product, dimensions, index, totalItems }) => {
  // `portadaDe` saltea los videos y cae a un placeholder que SI existe:
  // '/propiedades/unisex.jpg' nunca estuvo en el repo.
  const displayImage = portadaDe(product);

  const anglePerItem = 360 / totalItems;
  const currentAngle = anglePerItem * index;
  
  const radius = Math.max(
    180, 
    (parseInt(dimensions.width) / 2) / Math.tan((anglePerItem / 2) * Math.PI / 180) + 10
  );

  const hasValidPrice = product.price !== undefined && product.price !== null && !isNaN(product.price) && product.price !== '';
  
  let priceText = "A consultar";
  if (hasValidPrice) {
    const formattedPrice = new Intl.NumberFormat('es-AR').format(product.price);
    priceText = product.category === 'Alquiler' ? `$ ${formattedPrice} / mes` : `$ ${formattedPrice}`;
  }

  return (
    <div 
      className="absolute inset-0 rounded-xl overflow-hidden shadow-xl select-none group bg-black/45 border border-white/10"
      style={{
        width: dimensions.width,
        height: dimensions.height,
        transform: `rotateY(${currentAngle}deg) translateZ(${radius}px)`,
        transformStyle: "preserve-3d",
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden"
      }}
    >
      <img
        src={displayImage}
        alt={product.name}
        className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-105 opacity-70"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20 pointer-events-none" />

      <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-between items-start text-white z-10" style={{ transform: "translateZ(1px)" }}>
        <div className="w-full text-left flex justify-between items-start gap-2">
          <div>
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-red-400 bg-black/50 px-2 py-0.5 rounded border border-red-500/30">
              {product.category || "VENTA"}
            </span>
            {product.detalles?.tipo && (
              <span className="ml-1.5 text-[10px] md:text-xs font-medium uppercase tracking-wider text-gray-300 bg-white/10 px-2 py-0.5 rounded">
                {product.detalles.tipo}
              </span>
            )}
          </div>
        </div>

        <div className="w-full mt-auto mb-2">
          <h4 className="text-xs md:text-base font-semibold text-white drop-shadow-md line-clamp-2 leading-tight">
            {product.name}
          </h4>
          {product.detalles && (
            <p className="text-[10px] md:text-[11px] text-gray-300 flex items-center gap-0.5 mt-1">
              <MdLocationOn className="text-red-500 text-xs" /> {etiquetaZona(product.detalles)}
            </p>
          )}
          <p className="text-xs md:text-sm font-bold text-red-400 mt-1">
            {priceText}
          </p>
        </div>

        <div className="w-full flex justify-between items-center border-t border-white/10 pt-2">
          <span className="text-[9px] md:text-xs font-normal tracking-widest text-gray-300 uppercase">
            Ver detalles
          </span>

          {/* Reemplazado <Link> de react-router-dom por <a> */}
          <a 
            href={`/propiedades/${product.id}`}
            className="flex items-center justify-center border border-white/60 w-6 h-6 md:w-7 md:h-7 rounded-lg hover:bg-white hover:text-black hover:border-white active:scale-95 transition-all duration-300 cumulative-button z-20 pointer-events-auto"
            title="Ver detalles de la propiedad"
          >
            <svg 
              className="w-2.5 h-2.5 md:w-3 md:h-3 fill-none stroke-current stroke-2 ml-0.5" 
              viewBox="0 0 24 24"
            >
              <path d="M5 3l14 9-14 9V3z" />
            </svg>
          </a>
        </div>

      </div>
    </div>
  );
};

// COMPONENTE PRINCIPAL CON ENTORNO 3D OPTIMIZADO
const Carrusel = ({ products: productsProp }) => {
  // Fase 3: los datos llegan por prop desde index.astro. `data.jsx` queda como
  // fallback si la consulta a Supabase falla, hasta que se borre en la Fase 9.
  const products = productsProp ?? productsData ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);

  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWidth(window.innerWidth);
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const isMobile = width < 640;

  // Este carrusel es el escaparate de la home y toma las ÚLTIMAS 7.
  //
  // SOLO DISPONIBLES, sin excepción y sin volver al listado completo cuando
  // quedan pocas. Un escaparate corto es mejor que uno lleno de propiedades que
  // ya no se pueden alquilar. En el listado de búsqueda sí van, marcadas y al
  // final; recomendar algo que ya no está es otra cosa.
  //
  // Si no queda ninguna disponible, el componente devuelve `null` más abajo en
  // vez de dibujar un carrusel vacío.
  const baseProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    return products.filter(estaDisponible).slice(-7);
  }, [products]);

  const totalItems = baseProducts.length;
  const anglePerItem = totalItems > 0 ? 360 / totalItems : 0;

  const handlePrev = () => {
    setActiveIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    setActiveIndex((prev) => prev + 1);
  };

  const currentRotation = activeIndex * -anglePerItem;

  const cardDimensions = {
    width: isMobile ? "190px" : "290px",
    height: isMobile ? "230px" : "320px"
  };

  // Sin disponibles no hay escaparate. Se devuelve `null` en vez de la sección
  // vacía: el título "Recomendaciones" sobre la nada queda peor que no estar.
  if (totalItems === 0) return null;

  return (
    <div
      id="recommendations-section"
      className="relative w-full pt-24 pb-40 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black animate-gradient-slow"
      style={{
        backgroundSize: '400% 400%'
      }}
    >
      <div className="absolute inset-0 pointer-events-none z-0 opacity-70">
        <BubbleBackgroundDemo interactive={!isMobile} />
      </div>

      {/* SECCIÓN TITULO */}
      <div className="relative max-w-7xl mx-auto px-4 md:px-6 z-10">
        <ScrollReveal>
          <div className="text-center flex flex-col items-center select-none">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-wide drop-shadow-md">
              Nuestras Recomendaciones
            </h1>
            <p className="text-base md:text-xl text-gray-200 mt-3 font-medium max-w-2xl drop-shadow-sm">
              Contamos con distintas propiedades que se ajustan a tu presupuesto en todo Jujuy
            </p>
            
            <div className="flex items-center w-full max-w-[240px] sm:max-w-[320px] mt-5">
              <div className="flex-1 h-[2px] bg-white/20" />
              <span className="px-3 text-xl text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]">
                <MdLocationOn />
              </span>
              <div className="flex-1 h-[2px] bg-white/20" />
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* ESCENARIO TRIDIMENSIONAL */}
      <ScrollReveal delay="delay-100">
        <div className="relative max-w-6xl mx-auto px-4 mt-20 flex flex-col items-center justify-center gap-8">
          
          <div 
            className="relative w-full flex items-center justify-center z-10"
            style={{ 
              perspective: isMobile ? "1000px" : "1400px",
              perspectiveOrigin: "50% 35%",
              height: isMobile ? "250px" : "360px"
            }}
          >
            {totalItems > 0 ? (
              <div 
                className="relative flex items-center justify-center transition-transform duration-500 ease-out select-none"
                style={{
                  width: cardDimensions.width,
                  height: cardDimensions.height,
                  transformStyle: "preserve-3d",
                  transform: `rotateY(${currentRotation}deg)`,
                  willChange: "transform"
                }}
              >
                {baseProducts.map((product, index) => (
                  <ProductCard 
                    key={`${product.id}-${index}`} 
                    product={product} 
                    dimensions={cardDimensions}
                    index={index}
                    totalItems={totalItems}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-center text-gray-300 w-full py-8">
                No hay recomendaciones disponibles en este momento.
              </p>
            )}
          </div>

          <div className="w-full flex flex-row justify-center items-center gap-6 md:block md:static">
            
            <div className="md:absolute md:left-4 md:top-1/2 md:-translate-y-1/2 z-30">
              <RippleButton 
                onClick={handlePrev}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md w-12 h-12 flex items-center justify-center rounded-full shadow-2xl transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
                <RippleButtonRipples />
              </RippleButton>
            </div>

            <div className="md:absolute md:right-4 md:top-1/2 md:-translate-y-1/2 z-30">
              <RippleButton 
                onClick={handleNext}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md w-12 h-12 flex items-center justify-center rounded-full shadow-2xl transition-all"
              >
                <ChevronRight className="w-6 h-6" />
                <RippleButtonRipples />
              </RippleButton>
            </div>

          </div>

        </div>
      </ScrollReveal>

      <style>{`
        @keyframes gradientSlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient-slow {
          animation: gradientSlow 18s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default Carrusel;