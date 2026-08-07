import React from "react";
import { MdChevronLeft, MdChevronRight } from 'react-icons/md';

const PaginationControls = ({
  currentPage,
  totalPages,
  setCurrentPage
}) => {
  if (totalPages <= 1) return null;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    // Scroll al inicio de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex items-center justify-center gap-2 border-t border-gray-200 pt-4 mt-auto">
      <button 
        disabled={currentPage === 1} 
        onClick={() => handlePageChange(currentPage - 1)} 
        className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        <MdChevronLeft className="text-2xl" />
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`w-10 h-10 font-semibold rounded-xl transition-all ${
              currentPage === page 
                ? 'bg-red-600 text-white shadow-md' 
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button 
        disabled={currentPage === totalPages} 
        onClick={() => handlePageChange(currentPage + 1)} 
        className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
      >
        <MdChevronRight className="text-2xl" />
      </button>
    </div>
  );
};

export default PaginationControls;