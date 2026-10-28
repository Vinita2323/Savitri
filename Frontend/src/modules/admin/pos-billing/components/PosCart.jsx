import React, { useState } from 'react';
import { usePos } from '../context/PosContext';
import { SALE_TYPES } from '../constants/posConstants';
import {
  Trash2,
  Plus,
  Minus,
  Percent,
  User,
  MapPin,
  PauseCircle,
  ArrowRight,
  ShoppingBag,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export const PosCart = () => {
  const {
    cart,
    updateQuantity,
    updateItemDiscount,
    removeFromCart,
    clearCart,
    billDiscountPercent,
    setBillDiscountPercent,
    billSummary,
    customer,
    saleType,
    setIsCustomerModalOpen,
    setIsCheckoutModalOpen,
    holdCurrentBill,
  } = usePos();

  const [editingDiscountId, setEditingDiscountId] = useState(null);

  return (
    <aside className="w-full md:w-[410px] xl:w-[440px] bg-white border-l border-gray-200 flex flex-col h-full shrink-0 shadow-xs">
      {/* Customer Header Box */}
      <div className="p-3 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
            {customer.name?.slice(0, 1) || 'C'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900 truncate">
                {customer.name || 'Walk-in Customer'}
              </span>
              {customer.isWalkIn && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-200 text-gray-700 font-medium">
                  Walk-in
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 truncate">
              {customer.phone ? `+91 ${customer.phone}` : 'No phone recorded'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCustomerModalOpen(true)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-emerald-300 transition-colors"
        >
          {customer.isWalkIn ? 'Add Customer' : 'Change'}
        </button>
      </div>

      {/* Delivery Order Specific Address Warning */}
      {saleType === SALE_TYPES.DELIVERY_ORDER && (
        <div
          onClick={() => setIsCustomerModalOpen(true)}
          className={`px-3 py-2 border-b flex items-center justify-between text-xs cursor-pointer transition-colors ${
            customer.shippingAddress?.addressLine1
              ? 'bg-indigo-50/70 border-indigo-100 text-indigo-900 hover:bg-indigo-100/70'
              : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {customer.shippingAddress?.addressLine1
                ? `${customer.shippingAddress.addressLine1}, ${customer.shippingAddress.city}`
                : 'No delivery address selected (Required)'}
            </span>
          </div>
          <span className="text-[11px] font-semibold underline shrink-0 ml-2">Edit</span>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {cart.length > 0 ? (
          cart.map((item) => (
            <div
              key={item.productId}
              className="p-3 hover:bg-gray-50/60 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-1">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                    <span className="font-mono">₹{item.salePrice}</span>
                    <span>•</span>
                    <span className="text-gray-400">Stock: {item.stock}</span>
                    {item.taxRate && (
                      <span className="text-emerald-700 bg-emerald-50 px-1 rounded text-[10px]">
                        GST {item.taxRate}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Line Total */}
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-gray-900">₹{item.lineTotal}</span>
                </div>
              </div>

              {/* Controls Row: Quantity & Discount & Remove */}
              <div className="flex items-center justify-between gap-2 pt-1">
                {/* Quantity Controls */}
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={item.stock}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, e.target.value)}
                    className="w-8 text-center text-xs font-bold bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    disabled={item.quantity >= item.stock}
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Item Discount Toggle */}
                <div className="flex items-center gap-1">
                  {editingDiscountId === item.productId ? (
                    <div className="flex items-center bg-white border border-emerald-400 rounded-md px-1.5 py-0.5 shadow-2xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="%"
                        value={item.discountPercent || ''}
                        onChange={(e) => updateItemDiscount(item.productId, e.target.value)}
                        className="w-8 text-xs font-semibold focus:outline-none text-right"
                        autoFocus
                        onBlur={() => setEditingDiscountId(null)}
                      />
                      <span className="text-[10px] text-gray-500 ml-0.5">% disc</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingDiscountId(item.productId)}
                      className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-0.5 ${
                        item.discountPercent > 0
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      <Percent className="w-2.5 h-2.5" />
                      {item.discountPercent > 0 ? `${item.discountPercent}% off` : 'Discount'}
                    </button>
                  )}

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.productId)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <ShoppingBag className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-xs font-semibold text-gray-700">POS Cart is Empty</p>
            <p className="text-[11px] text-gray-400 mt-0.5 max-w-[200px]">
              Scan barcode or select products from the catalog to begin billing.
            </p>
          </div>
        )}
      </div>

      {/* Bill Calculation & Checkout Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 shrink-0 space-y-2">
        {/* Bill Discount Input Row */}
        <div className="flex items-center justify-between text-xs py-0.5">
          <span className="text-gray-600 flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-emerald-600" /> Bill Discount (%)
          </span>
          <div className="flex items-center bg-white border border-gray-200 rounded-md px-1.5 py-0.5">
            <input
              type="number"
              min="0"
              max="100"
              value={billDiscountPercent || ''}
              onChange={(e) => setBillDiscountPercent(e.target.value)}
              placeholder="0"
              className="w-10 text-xs font-bold text-gray-800 text-right focus:outline-none"
            />
            <span className="text-[11px] text-gray-400 ml-1">%</span>
          </div>
        </div>

        {/* Breakdown Breakdown Rows */}
        <div className="space-y-1 text-xs pt-1 border-t border-gray-200/80">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal ({billSummary.itemsCount} items)</span>
            <span>₹{billSummary.subtotal.toFixed(2)}</span>
          </div>

          {billSummary.itemDiscountsTotal > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Item Discounts</span>
              <span>-₹{billSummary.itemDiscountsTotal.toFixed(2)}</span>
            </div>
          )}

          {billSummary.billDiscountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Bill Discount ({billSummary.billDiscountPercent}%)</span>
              <span>-₹{billSummary.billDiscountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-gray-500 text-[11px]">
            <span>Taxes (CGST + SGST)</span>
            <span>₹{billSummary.gstTotal.toFixed(2)}</span>
          </div>

          {saleType === SALE_TYPES.DELIVERY_ORDER && (
            <div className="flex justify-between text-indigo-700 font-medium">
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" /> Delivery Charge
              </span>
              <span>
                {billSummary.deliveryCharge === 0 ? 'FREE' : `₹${billSummary.deliveryCharge}`}
              </span>
            </div>
          )}

          {/* Grand Total Row */}
          <div className="flex justify-between items-baseline pt-2 border-t border-gray-200">
            <div>
              <span className="text-sm font-bold text-gray-900">Grand Total</span>
              <span className="text-[10px] text-gray-500 block">Inclusive of all taxes</span>
            </div>
            <span className="text-xl font-extrabold text-emerald-700 tracking-tight">
              ₹{billSummary.grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Cart Action Buttons */}
        <div className="pt-2 grid grid-cols-4 gap-2">
          {/* Clear Cart */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => {
              if (window.confirm('Are you sure you want to clear the entire cart?')) {
                clearCart();
              }
            }}
            className="p-2 border border-gray-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-gray-600 hover:text-rose-700 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
            title="Clear Cart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Hold Bill */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => holdCurrentBill()}
            className="p-2 border border-amber-200 hover:border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold transition-colors disabled:opacity-40"
            title="Put Bill on Hold"
          >
            <PauseCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Hold</span>
          </button>

          {/* Checkout CTA */}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setIsCheckoutModalOpen(true)}
            className="col-span-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <span>
              {saleType === SALE_TYPES.COUNTER_SALE ? 'Complete Sale' : 'Create Order'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default PosCart;
