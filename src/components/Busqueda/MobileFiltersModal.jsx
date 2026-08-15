import React from "react";
import { MdSearch, MdClose, MdTune } from 'react-icons/md';

const MobileFiltersModal = ({
  isOpen,
  setIsOpen,
  formInputs,
  handleInputChange,
  handleSearch,
  handleClearFilters,
  opciones = { localidades: [], barrios: [], tipos: [] }
}) => {
  // Fase 3: mismas listas que el filtro de desktop, salidas del catálogo de la
  // base. Antes cada componente tenía su propia lista hardcodeada y no
  // coincidían entre sí ("Moreno" acá era "Mariano Moreno", etc.).
  const { localidades = [], barrios = [], tipos = [] } = opciones ?? {};

  const barriosVisibles = formInputs.localidad
    ? barrios.filter((b) => b.localidad_slug === formInputs.localidad)
    : barrios;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col md:hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
        <h2 className="text-base font-black text-gray-800 uppercase tracking-wider">Filtros de Búsqueda</h2>
        <button 
          onClick={() => setIsOpen(false)} 
          className="p-2 text-gray-700 hover:text-red-600 transition-colors"
        >
          <MdClose className="text-2xl" />
        </button>
      </div>

      <form 
        onSubmit={handleSearch} 
        className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 bg-gray-50"
      >
        {/* Palabra clave */}
        <div>
          <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Palabra clave</label>
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input 
              type="text" 
              placeholder="Ej. Casa, Departamento..." 
              value={formInputs.keyword} 
              onChange={(e) => handleInputChange("keyword", e.target.value)} 
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Localidad */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Localidad</label>
            <select
              value={formInputs.localidad}
              onChange={(e) => handleInputChange("localidad", e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
            >
              <option value="">Toda la provincia</option>
              {localidades.map((l) => (
                <option key={l.slug} value={l.slug}>{l.label}</option>
              ))}
            </select>
          </div>

          {/* Barrio */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Barrio</label>
            <select
              value={formInputs.barrio}
              onChange={(e) => handleInputChange("barrio", e.target.value)}
              disabled={barriosVisibles.length === 0}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {barriosVisibles.length === 0 ? "Sin barrios" : "Todos los barrios"}
              </option>
              {barriosVisibles.map((b) => (
                <option key={b.slug} value={b.slug}>{b.label}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Estado</label>
            <select 
              value={formInputs.estado} 
              onChange={(e) => handleInputChange("estado", e.target.value)} 
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
            >
              <option value="">Todos</option>
              <option value="Venta">Venta</option>
              <option value="Alquiler">Alquiler</option>
            </select>
          </div>
        </div>

        {/* Filtros Avanzados */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
            <MdTune /> Filtros Avanzados
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Tipo</label>
              <select
                value={formInputs.tipo}
                onChange={(e) => handleInputChange("tipo", e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value="">Todos</option>
                {tipos.map((t) => (
                  <option key={t.slug} value={t.slug}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Dormitorios</label>
              <input 
                type="number" 
                placeholder="Cantidad" 
                value={formInputs.dormitorios} 
                onChange={(e) => handleInputChange("dormitorios", e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Baños</label>
              <input 
                type="number" 
                placeholder="Cantidad" 
                value={formInputs.banos} 
                onChange={(e) => handleInputChange("banos", e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Área Mín (m²)</label>
              <input 
                type="number" 
                placeholder="Mínimo" 
                value={formInputs.areaMin} 
                onChange={(e) => handleInputChange("areaMin", e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Área Max (m²)</label>
              <input 
                type="number" 
                placeholder="Máximo" 
                value={formInputs.areaMax} 
                onChange={(e) => handleInputChange("areaMax", e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Precio Mín</label>
              <input 
                type="number" 
                placeholder="Mínimo" 
                value={formInputs.precioMin} 
                onChange={(e) => handleInputChange("precioMin", e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">Precio Max</label>
              <input 
                type="number" 
                placeholder="Máximo" 
                value={formInputs.precioMax} 
                onChange={(e) => handleInputChange("precioMax", e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm" 
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-700 block mb-1">ID Propiedad</label>
              <input 
                type="text" 
                placeholder="Ej: 12" 
                value={formInputs.propId} 
                onChange={(e) => handleInputChange("propId", e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm" 
              />
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-auto pt-6 grid grid-cols-2 gap-4 border-t border-gray-200 bg-white -mx-5 -mb-5 px-5 py-5">
          <button 
            type="button" 
            onClick={handleClearFilters} 
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-bold transition-colors"
          >
            Limpiar
          </button>
          <button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold shadow-md transition-colors"
          >
            Aplicar Filtros
          </button>
        </div>
      </form>
    </div>
  );
};

export default MobileFiltersModal;