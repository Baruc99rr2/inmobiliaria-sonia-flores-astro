import { useState } from "react";
import MarcaEstado from "../MarcaEstado";
import { soloImagenes } from "../../lib/media";
import { MdLocationOn, MdBed, MdBathtub, MdSquareFoot, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { chipTriEstado, chipMedida, etiquetaZona } from '../../lib/format';

const PropertySearchCard = ({ 
  product, 
  viewMode, 
  onHover, 
  onLeave 
}) => {
  // Solo imágenes: esta tarjeta pasa fotos con flechitas y un video acá no va.
  //
  // Antes filtraba por extensión y caía a '/propiedades/unisex.jpg', que NO
  // EXISTE en el repo. `soloImagenes` usa el `kind` de la base —que no se rompe
  // si la URL trae querystring— y cae a un placeholder real.
  const images = soloImagenes(product);

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

        <MarcaEstado product={product} />

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
              {etiquetaZona(product?.detalles)}
            </div>
            <span className="text-[10px] max-[320px]:text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded uppercase">
              {product?.detalles?.tipo || "Inmueble"}
            </span>
          </div>

          <h3 className="text-sm max-[320px]:text-xs font-bold text-gray-900 line-clamp-2 leading-tight mb-3 group-hover:text-red-600 transition-colors">
            {product?.name}
          </h3>

          {/* Chips compactos: se omite el chip ENTERO cuando no hay dato (§2.3).
              Antes `|| 0` mostraba "0" sobre propiedades sin dato, y el texto
              "a consultar" en minúscula al lado del ícono de metros. */}
          {(() => {
            const chips = [];
            if (!isTerreno) {
              const dorm = chipTriEstado(product?.detalles?.dormitorios);
              const banos = chipTriEstado(product?.detalles?.banos);
              if (dorm !== null) chips.push({ icono: <MdBed className="text-xl max-[320px]:text-lg" />, valor: dorm });
              if (banos !== null) chips.push({ icono: <MdBathtub className="text-xl max-[320px]:text-lg" />, valor: banos });
            }
            const sup = chipMedida(product?.detalles?.superficie_m2);
            if (sup !== null) chips.push({ icono: <MdSquareFoot className="text-xl max-[320px]:text-lg" />, valor: `${sup} m²` });

            if (chips.length === 0) return null;

            return (
              <div className="flex items-center gap-4 text-xs max-[320px]:text-[13px] text-gray-600">
                {chips.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">{c.icono} {c.valor}</span>
                ))}
              </div>
            );
          })()}
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