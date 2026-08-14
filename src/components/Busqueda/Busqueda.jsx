import React, { useState, useEffect, useMemo } from "react";
import { productsData } from "../../data";
import { construirOpciones, zonaDeProducto, tipoDeProducto } from "../../lib/zonas";

import SearchFilters from "./SearchFilters";
import MobileFiltersModal from "./MobileFiltersModal";
import PropertyMap from "./PropertyMap";
import SearchResultsHeader from "./SearchResultsHeader";
import PropertySearchCard from "./PropertySearchCard";
import PaginationControls from "./PaginationControls";

const Busqueda = ({ products: productsProp, catalogos }) => {
  // Fase 3: los datos llegan por prop desde busqueda.astro. `data.jsx` queda
  // como fallback si la consulta a Supabase falla, hasta la Fase 9.
  const products = productsProp ?? productsData ?? [];

  // Opciones de los <select>. Vienen del catálogo de la base; si no hay
  // catálogo (fallback), se derivan de las propiedades que haya.
  const opciones = useMemo(
    () => construirOpciones(catalogos, products),
    [catalogos, products]
  );

  // Estados principales
  const [formInputs, setFormInputs] = useState({
    keyword: "",
    localidad: "",
    barrio: "",
    estado: "",
    tipo: "",
    dormitorios: "",
    banos: "",
    areaMin: "",
    areaMax: "",
    precioMin: "",
    precioMax: "",
    propId: ""
  });

  const [activeFilters, setActiveFilters] = useState({ ...formInputs });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [activePropId, setActivePropId] = useState(null);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const ITEMS_PER_PAGE = 15;

  // Función de navegación nativa para reemplazar `navigate('/propiedad/123')`
  const handleNavigate = (path) => {
    window.location.href = path;
  };

  const handleInputChange = (field, value) => {
    setFormInputs(prev => {
      const siguiente = { ...prev, [field]: value };
      // Cambiar de localidad limpia el barrio: los barrios listados son los de
      // esa localidad, y dejar uno de otra daría siempre cero resultados.
      if (field === "localidad") siguiente.barrio = "";
      return siguiente;
    });
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setActiveFilters({ ...formInputs });
    setCurrentPage(1);
    setIsMobileFiltersOpen(false);
  };

  const handleClearFilters = () => {
    const cleared = Object.keys(formInputs).reduce((acc, key) => ({ ...acc, [key]: "" }), {});
    setFormInputs(cleared);
    setActiveFilters(cleared);
    setCurrentPage(1);
    // Limpiamos la URL sin recargar la página
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Leer parámetros de la URL al cargar la página (Reemplazo de location.state)
  // Ejemplo: si el usuario entra a /busqueda?estado=alquiler desde el Navbar
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const estadoParam = params.get('estado');
    const tipoParam = params.get('tipo');
    const barrioParam = params.get('barrio');
    const localidadParam = params.get('localidad');

    // `estado` sigue siendo texto ('Venta' / 'Alquiler'): es lo que manda el
    // Navbar. `tipo`, `barrio` y `localidad` ahora son slugs.
    if (estadoParam || tipoParam || barrioParam || localidadParam) {
      const initialFilters = {
        ...formInputs,
        ...(estadoParam && { estado: estadoParam }),
        ...(tipoParam && { tipo: tipoParam }),
        ...(barrioParam && { barrio: barrioParam }),
        ...(localidadParam && { localidad: localidadParam }),
      };
      setFormInputs(initialFilters);
      setActiveFilters(initialFilters);
    }
  }, []);

  // Filtrado
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const d = p.detalles || {};
      const f = activeFilters;

      // Zona y tipo se comparan por SLUG, no por el texto visible.
      //
      // Antes esto era `d.barrio !== f.barrio` contra una lista hardcodeada sin
      // el prefijo "Barrio": el <select> ofrecía "Los Perales" y el dato decía
      // "Barrio Los Perales", así que 11 de las 12 opciones devolvían cero
      // resultados. Comparar slugs también elimina el problema de tildes y
      // mayúsculas ("Palpalá" vs "palpala").
      const zona = zonaDeProducto(d);

      if (f.propId && p.id.toString() !== f.propId.trim()) return false;
      if (f.keyword &&
          !p.name.toLowerCase().includes(f.keyword.toLowerCase()) &&
          !p.description.toLowerCase().includes(f.keyword.toLowerCase())) return false;
      if (f.localidad && zona.localidad !== f.localidad) return false;
      if (f.barrio && zona.barrio !== f.barrio) return false;
      if (f.estado && p.category !== f.estado) return false;
      if (f.tipo && tipoDeProducto(d) !== f.tipo) return false;
      if (f.dormitorios && d.dormitorios !== parseInt(f.dormitorios)) return false;
      if (f.banos && d.banos !== parseInt(f.banos)) return false;
      if (f.areaMin && (!d.superficie_m2 || d.superficie_m2 < parseInt(f.areaMin))) return false;
      if (f.areaMax && (!d.superficie_m2 || d.superficie_m2 > parseInt(f.areaMax))) return false;
      if (f.precioMin && p.price < parseInt(f.precioMin)) return false;
      if (f.precioMax && p.price > parseInt(f.precioMax)) return false;

      return true;
    });
  }, [products, activeFilters]);

  // Ordenamiento
  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "title") return a.name.localeCompare(b.name);
      if (sortBy === "antiguedad") return (a.detalles?.antiguedad || 0) - (b.detalles?.antiguedad || 0);
      return 0;
    });
  }, [filteredProducts, sortBy]);

  const currentItems = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);

  return (
    <div className="w-full relative block bg-gray-50 pt-[75px]">
      {/* Filtros Desktop */}
      <SearchFilters
        formInputs={formInputs}
        handleInputChange={handleInputChange}
        handleSearch={handleSearch}
        isAdvancedOpen={isAdvancedOpen}
        setIsAdvancedOpen={setIsAdvancedOpen}
        opciones={opciones}
      />

      {/* Trigger de Filtros Móviles */}
      <div className="block md:hidden w-full bg-white border-b border-gray-200 p-4">
        <div 
          onClick={() => setIsMobileFiltersOpen(true)} 
          className="w-full flex items-center gap-3 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xl">🔍</span>
            <span className="font-medium">Buscar propiedades...</span>
          </div>
          <div className="text-red-600">
            <span className="text-xl">⚙️</span>
          </div>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 lg:grid-cols-10">
        {/* Mapa */}
        <div className="hidden lg:block lg:col-span-4 relative">
          <PropertyMap 
            filteredProducts={filteredProducts}
            activePropId={activePropId}
            setActivePropId={setActivePropId}
            navigate={handleNavigate}
          />
        </div>

        {/* Resultados */}
        <div className="col-span-1 lg:col-span-6 p-4 md:p-6 flex flex-col h-[calc(90vh-100px)] md:h-[calc(110vh-120px)] overflow-y-auto custom-scrollbar">
          <SearchResultsHeader 
            sortedProducts={sortedProducts}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {currentItems.length > 0 ? (
            <div className={`grid gap-4 md:gap-6 mb-6 ${viewMode === "grid" ? "grid-cols-2 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
              {currentItems.map((prop) => (
                <PropertySearchCard 
                  key={prop.id} 
                  product={prop} 
                  viewMode={viewMode}
                  onHover={() => setActivePropId(prop.id)}
                  onLeave={() => setActivePropId(null)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 my-auto">
              <p className="text-gray-500 text-base">No se encontraron propiedades con los filtros actuales.</p>
              <button 
                onClick={handleClearFilters} 
                className="mt-6 bg-gray-900 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          )}

          <PaginationControls 
            currentPage={currentPage}
            totalPages={totalPages}
            setCurrentPage={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal Filtros Móviles */}
      <MobileFiltersModal
        isOpen={isMobileFiltersOpen}
        setIsOpen={setIsMobileFiltersOpen}
        formInputs={formInputs}
        handleInputChange={handleInputChange}
        handleSearch={handleSearch}
        handleClearFilters={handleClearFilters}
        opciones={opciones}
      />
    </div>
  );
};

export default Busqueda;