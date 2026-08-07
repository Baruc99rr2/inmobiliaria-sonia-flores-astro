import React, { useState } from "react";
import { MdLocationOn, MdBed, MdBathtub, MdSquareFoot, MdChevronLeft, MdChevronRight } from 'react-icons/md';

const PropertySearchCard = ({ 
  product, 
  viewMode, 
  onHover, 
  onLeave 
}) => {
  // 1. FILTRAMOS EL ARRAY PARA QUEDARNOS SOLO CON IMÁGENES (IGNORANDO VIDEOS .mp4, .mov, .webm)
  const allFiles = product?.images && product.images.length > 0 ? product.images : ['/propiedades/unisex.jpg'];
  
  const images = allFiles.filter(file => {
    const isVideo = file.toLowerCase().endsWith('.mp4') || 
                    file.toLowerCase().endsWith('.mov') || 
                    file.toLowerCase().endsWith('.webm');
    return !isVideo;
  });

  // Si por alguna razón la propiedad solo tenía videos, le dejamos la imagen por defecto
  if (images.length === 0) {
    images.push('/propiedades/unisex.jpg');
  }

  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  const changeSlide = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImgIndex((prev) => 
      direction === "next" 
        ? (prev === images.length - 1 ? 0 : prev + 1) 
        : (prev === 0 ? images.length - 1 : prev - 1)
    );
  };

  const isGrid = viewMode === "grid";
  const isTerreno = product?.detalles?.tipo === "Terreno";
  const isInversion = isTerreno && product?.category === "Venta";

  return (
    <div 
      onMouseEnter={onHover} 
      onMouseLeave={onLeave} 
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex ${
        isGrid 
          ? "flex-col w-full" 
          : "flex-col sm:flex-row w-full"
      } group`}
    >
      {/* Imagen */}
      <div className={`relative overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center ${
        isGrid 
          ? "h-[165px] md:h-[175px] max-[320px]:h-[138px]" 
          : "w-full sm:w-[230px] h-[195px] sm:h-[168px]"
      }`}>
        <img 
          src={images[currentImgIndex]} 
          alt={product?.name || "Propiedad"} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          loading="lazy" 
        />

        {/* FLECHAS DE NAVEGACIÓN */}
        {images.length > 1 && (
          <>
            <button 
              type="button"
              onClick={(e) => changeSlide(e, "prev")} 
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
            >
              <MdChevronLeft size={20} />
            </button>
            <button 
              type="button"
              onClick={(e) => changeSlide(e, "next")} 
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10 cursor-pointer"
            >
              <MdChevronRight size={20} />
            </button>
          </>
        )}

        <div className="absolute top-3 left-3 z-20 flex flex-wrap gap-1">
          <span className="text-[10px] max-[320px]:text-[9px] font-bold text-gray-900 bg-white/95 px-2 py-1 rounded shadow-md uppercase">
            {product?.category || "VENTA"}
          </span>
          {isInversion && (
            <span className="text-[10px] max-[320px]:text-[9px] font-bold text-white bg-amber-500 px-2 py-1 rounded shadow-md uppercase">
              Inversión
            </span>
          )}
        </div>
      </div>

      {/* Información */}
      <div className="flex-1 p-4 max-[320px]:p-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1 text-[11px] max-[320px]:text-[10px] font-semibold text-gray-400 uppercase truncate">
              <MdLocationOn className="text-red-500 flex-shrink-0" />
              {product?.detalles?.barrio || "Ubicación"}
            </div>
            <span className="text-[10px] max-[320px]:text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded uppercase">
              {product?.detalles?.tipo || "Inmueble"}
            </span>
          </div>

          <h3 className="text-sm max-[320px]:text-xs font-bold text-gray-900 line-clamp-2 leading-tight mb-3 group-hover:text-red-600 transition-colors">
            {product?.name}
          </h3>

          <div className="flex items-center gap-4 text-xs max-[320px]:text-[13px] text-gray-600">
            {!isTerreno && (
              <>
                <span className="flex items-center gap-1"><MdBed className="text-xl max-[320px]:text-lg" /> {product?.detalles?.dormitorios || 0}</span>
                <span className="flex items-center gap-1"><MdBathtub className="text-xl max-[320px]:text-lg" /> {product?.detalles?.banos || 0}</span>
              </>
            )}
            <span className="flex items-center gap-1"><MdSquareFoot className="text-xl max-[320px]:text-lg" /> {product?.detalles?.superficie_m2 || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <div className="font-extrabold text-lg max-[320px]:text-base text-gray-900">
            {product?.price > 0 ? `$ ${new Intl.NumberFormat('es-AR').format(product.price)}` : 'A consultar'}
          </div>
          <a 
            href={`/propiedades/${product?.id}`} 
            className="bg-gray-900 hover:bg-red-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Ver detalles
          </a>
        </div>
      </div>
    </div>
  );
};

export default PropertySearchCard;