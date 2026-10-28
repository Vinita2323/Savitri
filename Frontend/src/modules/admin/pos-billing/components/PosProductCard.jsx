import React from 'react';
import { usePos } from '../context/PosContext';
import { Plus, Minus, Check, AlertCircle } from 'lucide-react';

export const PosProductCard = ({ product }) => {
  const { cart, addToCart, updateQuantity } = usePos();

  const productId = product._id || product.id;
  const inCartItem = cart.find((it) => it.productId === productId);
  const cartQty = inCartItem ? inCartItem.quantity : 0;

  const stock = Number(product.stock) || 0;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 10;

  const salePrice = Number(product.salePrice) || Number(product.mrp) || 0;
  const mrp = Number(product.mrp) || salePrice;

  return (
    <div
      className={`group relative bg-white rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 select-none ${
        cartQty > 0
          ? 'border-emerald-500/80 shadow-xs ring-1 ring-emerald-500/30'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-xs'
      } ${isOutOfStock ? 'opacity-60 bg-gray-50/70' : ''}`}
    >
      <div>
        {/* Top badges: Stock indicator & Tax */}
        <div className="flex items-center justify-between gap-1 mb-2">
          {isOutOfStock ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
              <AlertCircle className="w-2.5 h-2.5" /> Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Only {stock} left
            </span>
          ) : (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {stock} in stock
            </span>
          )}

          {product.taxRate && (
            <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              GST {product.taxRate}%
            </span>
          )}
        </div>

        {/* Thumbnail and Title */}
        <div className="flex items-start gap-2.5">
          <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-150 overflow-hidden shrink-0 flex items-center justify-center">
            {product.image || product.mainImage ? (
              <img
                src={product.image || product.mainImage}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <span className="text-xs font-bold text-gray-400 uppercase">
                {product.name?.slice(0, 2) || 'PR'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              className="text-xs font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors"
              title={product.name}
            >
              {product.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-500">
              <span className="font-mono">{product.sku}</span>
              {product.unit && <span>• {product.unit}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing and Action row */}
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-gray-900">₹{salePrice}</span>
            {mrp > salePrice && (
              <span className="text-[11px] text-gray-400 line-through">₹{mrp}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {cartQty > 0 ? (
          <div className="flex items-center bg-emerald-50 rounded-lg border border-emerald-300 p-0.5">
            <button
              type="button"
              onClick={() => updateQuantity(productId, cartQty - 1)}
              className="w-6 h-6 rounded flex items-center justify-center text-emerald-700 hover:bg-emerald-100 transition-colors"
              title="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-7 text-center text-xs font-bold text-emerald-800">
              {cartQty}
            </span>
            <button
              type="button"
              disabled={cartQty >= stock}
              onClick={() => updateQuantity(productId, cartQty + 1)}
              className="w-6 h-6 rounded flex items-center justify-center text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              title="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={() => addToCart(product, 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-50 disabled:hover:text-emerald-700 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PosProductCard;
