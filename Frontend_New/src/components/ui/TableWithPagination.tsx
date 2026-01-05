import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface TableWithPaginationProps<T> {
  data: T[];
  columns: Column<T>[];
  onSort?: (key: keyof T | string) => void;
  sortKey?: keyof T | string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  itemsPerPage?: number;
  showPagination?: boolean;
}

export function TableWithPagination<T extends Record<string, any>>({
  data,
  columns,
  onSort,
  sortKey,
  sortDirection,
  loading = false,
  emptyMessage = 'Nenhum item encontrado',
  itemsPerPage = 5,
  showPagination = true
}: TableWithPaginationProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Cálculos de paginação
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
  const startItem = startIndex + 1;
  const endItem = Math.min(startIndex + itemsPerPage, data.length);

  // Reset página quando dados mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + maxVisible - 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  if (loading) {
    return (
      <div className="bg-white border border-edp-neutral-lighter rounded-lg shadow-sm overflow-hidden">
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-edp-electric mx-auto"></div>
          <p className="mt-4 text-edp-neutral-medium font-edp">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white border border-edp-neutral-lighter rounded-lg shadow-sm overflow-hidden">
      {/* Tabela */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full divide-y divide-edp-neutral-lighter">
          <thead className="bg-edp-neutral-white-wash">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={`px-3 lg:px-4 py-2 text-left text-xs font-medium text-edp-neutral-darkest uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-edp-neutral-lighter/50' : ''
                  } ${column.width ? `w-${column.width}` : ''}`}
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && (
                      <div className="flex flex-col">
                        <div className={`w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent ${
                          sortKey === column.key && sortDirection === 'asc' 
                            ? 'border-b-edp-electric' 
                            : 'border-b-edp-neutral-medium'
                        }`} style={{ borderBottomWidth: '4px', marginBottom: '1px' }} />
                        <div className={`w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent ${
                          sortKey === column.key && sortDirection === 'desc' 
                            ? 'border-t-edp-electric' 
                            : 'border-t-edp-neutral-medium'
                        }`} style={{ borderTopWidth: '4px' }} />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-edp-neutral-lighter">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center">
                  <div className="text-edp-neutral-medium font-edp">
                    <div className="w-12 h-12 mx-auto mb-4 opacity-50">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m0 0V9a2 2 0 012-2h8a2 2 0 012 2v4M6 13h12" />
                      </svg>
                    </div>
                    {emptyMessage}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr key={index} className="hover:bg-edp-neutral-white-wash/50 transition-colors">
                  {columns.map((column) => {
                    const value = column.key.toString().includes('.') 
                      ? column.key.toString().split('.').reduce((obj, key) => obj?.[key], item)
                      : item[column.key];
                    
                    return (
                      <td key={String(column.key)} className="px-3 lg:px-4 py-2.5 text-sm text-edp-neutral-darkest font-edp">
                        <div className="truncate max-w-xs lg:max-w-md xl:max-w-lg">
                          {column.render ? column.render(value, item) : String(value || '')}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação Integrada */}
      {showPagination && data.length > 0 && (
        <div className="flex-shrink-0 bg-edp-neutral-white-wash border-t border-edp-neutral-lighter px-3 sm:px-4 lg:px-6 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            
            {/* Informações */}
            <div className="text-xs sm:text-sm text-edp-neutral-dark font-edp text-center sm:text-left">
              <span className="hidden sm:inline">Mostrando </span>
              <span className="font-semibold">{startItem}</span>
              <span className="hidden sm:inline"> a </span>
              <span className="sm:hidden">-</span>
              <span className="font-semibold">{endItem}</span>
              <span className="hidden sm:inline"> de </span>
              <span className="sm:hidden">/</span>
              <span className="font-semibold">{data.length}</span>
              <span className="hidden sm:inline"> resultados</span>
            </div>

            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 sm:gap-2">
                
                {/* Botão Anterior */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="w-7 h-7 sm:w-8 sm:h-8 p-0"
                >
                  <ChevronLeftIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>

                {/* Números das Páginas - Mostra menos em mobile */}
                <div className="flex items-center gap-1">
                  {visiblePages.slice(0, 3).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs sm:text-sm"
                    >
                      {page}
                    </Button>
                  ))}
                  {/* Mostra mais páginas apenas em desktop */}
                  <div className="hidden sm:flex items-center gap-1">
                    {visiblePages.slice(3).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Botão Próximo */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="w-7 h-7 sm:w-8 sm:h-8 p-0"
                >
                  <ChevronRightIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}