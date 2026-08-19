import { MdSearch, MdTune, MdKeyboardArrowDown } from 'react-icons/md';

const SearchFilters = ({
  formInputs,
  handleInputChange,
  handleSearch,
  isAdvancedOpen,
  setIsAdvancedOpen,
  opciones = { localidades: [], barrios: [], tipos: [] }
}) => {
  // Fase 3: las listas salen del catálogo de la base. Antes estaban
  // hardcodeadas acá y en MobileFiltersModal, con contenidos distintos entre sí
  // y sin el prefijo "Barrio", que es lo que rompía el filtro.
  const { localidades = [], barrios = [], tipos = [] } = opciones ?? {};

  // Si hay localidad elegida, solo se ofrecen sus barrios.
  const barriosVisibles = formInputs.localidad
    ? barrios.filter((b) => b.localidad_slug === formInputs.localidad)
    : barrios;

  return (
    <form onSubmit={handleSearch} className="hidden md:block w-full bg-white border-b border-gray-200 px-4 md:px-8 py-3 relative z-30 mt-4 md:mt-4.5">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Buscador principal */}
          <div className="relative md:col-span-3">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
            <input
              type="text"
              placeholder="Palabra clave..."
              value={formInputs.keyword}
              onChange={(e) => handleInputChange("keyword", e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Localidad */}
          <div className="relative md:col-span-2">
            <select
              value={formInputs.localidad}
              onChange={(e) => handleInputChange("localidad", e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-red-500"
            >
              <option value="">Toda la provincia</option>
              {localidades.map((l) => (
                <option key={l.slug} value={l.slug}>{l.label}</option>
              ))}
            </select>
            <MdKeyboardArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Barrio */}
          <div className="relative md:col-span-2">
            <select
              value={formInputs.barrio}
              onChange={(e) => handleInputChange("barrio", e.target.value)}
              disabled={barriosVisibles.length === 0}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {barriosVisibles.length === 0 ? "Sin barrios" : "Todos los barrios"}
              </option>
              {barriosVisibles.map((b) => (
                <option key={b.slug} value={b.slug}>{b.label}</option>
              ))}
            </select>
            <MdKeyboardArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Estado (Venta/Alquiler) */}
          <div className="relative md:col-span-2">
            <select 
              value={formInputs.estado} 
              onChange={(e) => handleInputChange("estado", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-red-500"
            >
              <option value="">Estado</option>
              <option value="Venta">Venta</option>
              <option value="Alquiler">Alquiler</option>
            </select>
            <MdKeyboardArrowDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Botón Avanzado */}
          <button 
            type="button" 
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} 
            className={`md:col-span-2 flex items-center justify-center gap-1.5 py-2 border rounded-lg text-sm font-semibold transition-all 
              ${isAdvancedOpen ? 'bg-red-50 border-red-200 text-red-600 shadow-inner' : 'bg-white border-gray-200 text-gray-700'}`}
          >
            <MdTune /> Avanzado
          </button>

          {/* Botón Buscar */}
          <button 
            type="submit" 
            className="md:col-span-1 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold shadow-md transition-all"
          >
            Buscar
          </button>
        </div>

        {/* Filtros Avanzados */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 overflow-hidden transition-all duration-500 
          ${isAdvancedOpen ? 'max-h-[300px] opacity-100 pt-2 border-t mt-1' : 'max-h-0 opacity-0 pointer-events-none'}`}
        >
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Tipo</label>
            {/* La lista sale del catálogo. Antes estaba hardcodeada y le faltaba
                'Oficina', así que las ids 4 y 8 no se podían filtrar por tipo. */}
            <select
              value={formInputs.tipo}
              onChange={(e) => handleInputChange("tipo", e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500"
            >
              <option value="">Todos</option>
              {tipos.map((t) => (
                <option key={t.slug} value={t.slug}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Dormitorios</label>
            <input 
              type="number" 
              placeholder="Cantidad" 
              value={formInputs.dormitorios} 
              onChange={(e) => handleInputChange("dormitorios", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Baños</label>
            <input 
              type="number" 
              placeholder="Cantidad" 
              value={formInputs.banos} 
              onChange={(e) => handleInputChange("banos", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Área Mín (m²)</label>
            <input 
              type="number" 
              placeholder="Mínimo" 
              value={formInputs.areaMin} 
              onChange={(e) => handleInputChange("areaMin", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Área Max (m²)</label>
            <input 
              type="number" 
              placeholder="Máximo" 
              value={formInputs.areaMax} 
              onChange={(e) => handleInputChange("areaMax", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Precio Mín</label>
            <input 
              type="number" 
              placeholder="Mínimo" 
              value={formInputs.precioMin} 
              onChange={(e) => handleInputChange("precioMin", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">Precio Max</label>
            <input 
              type="number" 
              placeholder="Máximo" 
              value={formInputs.precioMax} 
              onChange={(e) => handleInputChange("precioMax", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500" 
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase block mb-1">ID Propiedad</label>
            <input 
              type="text" 
              placeholder="Ej: 3" 
              value={formInputs.propId} 
              onChange={(e) => handleInputChange("propId", e.target.value)} 
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs focus:outline-none focus:border-red-500" 
            />
          </div>
        </div>
      </div>
    </form>
  );
};

export default SearchFilters;