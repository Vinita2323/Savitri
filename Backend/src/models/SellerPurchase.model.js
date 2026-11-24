import mongoose from 'mongoose';

/**
 * A stock purchase (restock) recorded by a seller: what they bought, how many, at what cost and from whom.
 * Recording one can also add the quantity to the product's stock (see sellerPurchaseController).
 */
const sellerPurchaseSchema = new mongoose.Schema(
  {
    purchaseId: { type: String, required: true, unique: true, index: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Seller', required: true, index: true },

    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, trim: true, default: '' },
    variantSku: { type: String, trim: true, default: '' },
    variantTitle: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    unit: { type: String, trim: true, default: '' },

    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    supplierName: { type: String, required: true, trim: true, maxlength: 120 },
    supplierPhone: { type: String, trim: true, default: '', maxlength: 20 },
    invoiceNumber: { type: String, trim: true, default: '', maxlength: 60 },
    notes: { type: String, trim: true, default: '', maxlength: 500 },

    // Attached supplier bill / invoice (PDF or image). See sellerPurchaseController for how the reference is validated.
    invoiceFile: {
      url: { type: String, trim: true, default: '' },
      name: { type: String, trim: true, default: '' },
      mime: { type: String, trim: true, default: '' },
      size: { type: Number, default: 0 },
    },
    purchaseDate: { type: Date, required: true, index: true },

    // Stock effect
    stockUpdated: { type: Boolean, default: false },
    previousStock: { type: Number, default: null },
    newStock: { type: Number, default: null },
    costPriceUpdated: { type: Boolean, default: false },

    status: { type: String, enum: ['RECORDED', 'CANCELLED'], default: 'RECORDED', index: true },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

sellerPurchaseSchema.index({ sellerId: 1, purchaseDate: -1 });
sellerPurchaseSchema.index({ supplierName: 1 });

export default mongoose.models.SellerPurchase || mongoose.model('SellerPurchase', sellerPurchaseSchema);
