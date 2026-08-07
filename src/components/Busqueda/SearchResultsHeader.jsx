import React from "react";
import { MdViewList, MdViewModule } from 'react-icons/md';

const SearchResultsHeader = ({
  sortedProducts,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4 mb-6">
      {/* Cantidad de resultados */}
      <div className="text-sm font-semibold text-gray-700">
        {sortedProducts.length} Resultados encontrados
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Ordenamiento */}
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)} 
          className="bg-white border border-gray-200 rounded-lg py-2 px-3 text-sm focus:outline-none text-gray-700 min-w-[160px]"
        >
          <option value="default">Orden por defecto</option>
          <option value="price-asc">Precio: Menor a Mayor</option>
          <option value="price-desc">Precio: Mayor a Menor</option>
          <option value="title">Título</option>
          <option value="antiguedad">Antigüedad</option>
        </select>

        {/* Botones de Vista (Lista / Grid) */}
        <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-gray-100">
          <button 
            onClick={() => setViewMode("list")} 
            className={`p-2.5 rounded-md transition-all ${viewMode === "list" 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'}`}
            title="Vista Lista"
          >
            <MdViewList className="text-2xl" />
          </button>
          
          <button 
            onClick={() => setViewMode("grid")} 
            className={`p-2.5 rounded-md transition-all ${viewMode === "grid" 
              ? 'bg-white text-red-600 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'}`}
            title="Vista Cuadrícula"
          >
            <MdViewModule className="text-2xl" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsHeader;