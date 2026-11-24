import mongoose from 'mongoose';

export const PAY_STATUSES = ['PAID', 'UNPAID', 'PARTIAL'];
export const PAY_METHODS = ['CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'CHEQUE', 'CREDIT', 'OTHER'];

/**
 * A stock purchase made by an Admin for the Admin's own store (own-store products or platform-owned products).
 * One purchase can contain many products. Money is stored as integer paise. Seller purchases live in SellerPurchase
 * and are never mixed with these.
 */
const lineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, default: '', trim: true },
    variantSku: { type: String, default: '', trim: true },
    variantTitle: { type: String, default: '', trim: true },
    unit: { type: String, default: '', trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaise: { type: Number, required: true, min: 0, validate: Number.isInteger },
    gstPercentX100: { type: Number, default: 0, min: 0, max: 10000 }, // 18% = 1800
    subtotalPaise: { type: Number, required: true, min: 0 }, // quantity x unit price
    gstPaise: { type: Number, default: 0, min: 0 },
    // stock effect, filled when the stock is applied
    previousStock: { type: Number, default: null },
    newStock: { type: Number, default: null },
    stockApplied: { type: Boolean, default: false },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    purchaseId: { type: String, required: true, unique: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    adminName: { type: String, default: '' },
    adminRole: { type: String, default: '' },
    brandId: { type: String, default: '', index: true }, // the brand scope the admin was working in ('' = consolidated)
    storeName: { type: String, default: '' },
    idempotencyKey: { type: String, default: undefined },
    fingerprint: { type: String, default: '' },

    supplierName: { type: String, required: true, trim: true, maxlength: 120 },
    supplierPhone: { type: String, default: '', trim: true, maxlength: 20 },
    supplierEmail: { type: String, default: '', trim: true, maxlength: 120 },
    supplierAddress: { type: String, default: '', trim: true, maxlength: 250 },
    purchaseDate: { type: Date, required: true, index: true },
    invoiceNumber: { type: String, default: '', trim: true, maxlength: 60 },
    notes: { type: String, default: '', trim: true, maxlength: 500 },

    lines: { type: [lineSchema], validate: (v) => v.length >= 1 },
    totalQuantity: { type: Number, default: 0 },
    subtotalPaise: { type: Number, default: 0 },
    gstPaise: { type: Number, default: 0 },
    additionalExpensesPaise: { type: Number, default: 0 },
    discountPaise: { type: Number, default: 0 },
    finalPaise: { type: Number, default: 0 }, // subtotal + gst + additional expenses - discount

    paymentStatus: { type: String, enum: PAY_STATUSES, default: 'UNPAID', index: true },
    paidPaise: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: [...PAY_METHODS, ''], default: '' },

    // Supplier bill. Stored privately and streamed to the owner (and Super Admin) only.
    invoiceFile: { key: { type: String, default: '' }, name: { type: String, default: '' }, mime: { type: String, default: '' }, size: { type: Number, default: 0 } },

    // PROCESSING (stock being applied) -> RECORDED -> CANCELLING -> CANCELLED; FAILED if stock could not be applied (nothing kept)
    status: { type: String, enum: ['PROCESSING', 'RECORDED', 'CANCELLING', 'CANCELLED', 'FAILED'], default: 'PROCESSING', index: true },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { id: { type: mongoose.Schema.Types.ObjectId, default: null }, name: { type: String, default: '' } },
    cancelReason: { type: String, default: '', maxlength: 300 },
    failReason: { type: String, default: '' },
    history: [{ at: { type: Date, default: Date.now }, action: String, by: { type: String, default: '' }, note: { type: String, default: '' } }],
  },
  { timestamps: true }
);

// A retried request with the same key can never create a second purchase or touch stock twice
schema.index({ adminId: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
schema.index({ adminId: 1, purchaseDate: -1 });
schema.index({ adminId: 1, fingerprint: 1, createdAt: -1 });

export default mongoose.models.AdminPurchase || mongoose.model('AdminPurchase', schema);
