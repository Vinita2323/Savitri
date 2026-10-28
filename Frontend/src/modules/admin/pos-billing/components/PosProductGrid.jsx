import React, { useRef } from 'react';
import { usePos } from '../context/PosContext';
import { PosProductCard } from './PosProductCard';
import { Search, X, ScanBarcode, PackageSearch, RefreshCw } from 'lucide-react';

export const PosProductGrid = () => {
  const {
    products,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoadingProducts,
    loadProducts,
  } = usePos();

  const searchInputRef = useRef(null);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50/50">
      {/* Search & Category Filter Header */}
      <div className="bg-white border-b border-gray-200 p-3 space-y-2.5 shrink-0">
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product name, SKU, or scan barcode..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200"
                title="USB/Bluetooth Barcode Scanner Active"
              >
                <ScanBarcode className="w-3 h-3 text-emerald-600" />
                <span className="font-mono">Ready</span>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadProducts}
            disabled={isLoadingProducts}
            className="p-2 text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh Products & Stock"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoadingProducts ? 'animate-spin text-emerald-600' : ''}`}
            />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid Content Area */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-gray-200 p-3 h-44 animate-pulse flex flex-col justify-between"
              >
                <div className="flex gap-2">
                  <div className="w-14 h-14 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-0.5">
              <span>
                Showing <strong className="text-gray-800">{products.length}</strong> products
              </span>
              <span className="text-[11px] text-gray-400">
                Click item or scan barcode to add to bill
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => (
                <PosProductCard key={product._id || product.id} product={product} />
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-dashed border-gray-200">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
              <PackageSearch className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-gray-800">No products found</h4>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              No products match "{searchQuery}" in category "{selectedCategory}".
            </p>
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PosProductGrid;
