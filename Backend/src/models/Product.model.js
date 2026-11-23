import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      // TEMP: not hard-required — controller supplies a placeholder if blank
      required: false,
      trim: true,
      default: 'Untitled Product',
    },
    category: {
      type: String,
      required: false,
      default: 'Groceries'
    },
    subCategory: {
      type: String,
      default: ''
    },
    brand: {
      type: String,
      default: ''
    },
    unitValue: {
      type: String,
      default: '1'
    },
    unitType: {
      type: String,
      default: 'kg'
    },
    unit: {
      type: String,
      default: '1 kg'
    },
    seller: {
      type: mongoose.Schema.Types.Mixed,
      default: 'Savitri Official Store',
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Seller',
    },
    description: {
      type: String,
      default: ''
    },
    mrp: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    salePrice: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    taxRate: {
      type: String,
      default: '5%'
    },
    hsnCode: {
      type: String,
      default: ''
    },
    stock: {
      type: Number,
      required: false,
      default: 0
    },
    minStockLimit: {
      type: Number,
      default: 10
    },
    sku: {
      type: String,
      default: ''
    },
    mainImage: {
      type: String,
      default: ''
    },
    homeSections: {
      type: [String],
      default: []
    },
    galleryImages: {
      type: [String],
      default: []
    },
    hasVariants: {
      type: Boolean,
      default: false
    },
    variantOptions: [
      {
        name: { type: String, trim: true },
        values: [{ type: String, trim: true }]
      }
    ],
    variants: [
      {
        attributes: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        },
        title: { type: String, default: '' },
        sku: { type: String, default: '' },
        price: { type: Number, min: 0, default: 0 },
        originalPrice: { type: Number, min: 0, default: 0 },
        stock: { type: Number, min: 0, default: 0 },
        image: { type: String, default: '' },
        active: { type: Boolean, default: true }
      }
    ],
    status: {
      type: String,
      enum: ['Published', 'Draft', 'Pending Audit'],
      default: 'Published'
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isReturnable: {
      type: Boolean,
      default: true
    },
    returnWindow: {
      type: Number,
      default: 7
    },
    returnPolicy: {
      type: String,
      default: '7 Days Returnable'
    },
    // ── Publishing / moderation (additive: existing products keep the defaults and stay visible) ──
    isPublished: { type: Boolean, default: true },
    publishedAt: { type: Date, default: null },
    // active | out_of_stock | inactive. Informational label; customer visibility is decided by isPublished,
    // adminBlocked, status and the real stock count.
    listingStatus: { type: String, enum: ['active', 'out_of_stock', 'inactive'], default: 'active' },
    adminBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: '' },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: String, default: '' },
    // Extra catalogue fields carried by bulk upload
    barcode: { type: String, default: '', trim: true },
    purchasePrice: { type: Number, min: 0, default: 0 },
    // Own-store product of ONE admin (no sellerId). Unset = a seller's product, or a platform-owned product. Used by Admin purchases.
    ownerAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: undefined, index: true },
    // Keys of stock changes already applied to this product (purchases / reversals). Makes a stock change exactly-once. Bounded.
    stockRefs: { type: [String], default: undefined, select: false },
    weight: { type: String, default: '' },
    // ── Shipping & package details (Phase 1; additive, safe defaults so existing products are unaffected) ──
    // `weight` above stays the free-text label used by bulk upload; `weightKg` is the numeric shipping weight.
    shippingEnabled: { type: Boolean, default: false },
    fulfillmentType: { type: String, enum: ['INSTANT', 'STANDARD', 'BOTH'], default: 'INSTANT' },
    weightKg: { type: Number, min: 0, default: null },
    length: { type: Number, min: 0, default: null },   // cm
    breadth: { type: Number, min: 0, default: null },  // cm
    height: { type: Number, min: 0, default: null },   // cm
    countryOfOrigin: { type: String, default: '', trim: true },
    isFragile: { type: Boolean, default: false },
    requiresSpecialHandling: { type: Boolean, default: false },
    // Server-computed: courier shipping enabled AND weight + dimensions valid. Never taken from a request.
    shippingReady: { type: Boolean, default: false },
    source: { type: String, enum: ['manual', 'bulk'], default: 'manual' },
    importId: { type: mongoose.Schema.Types.ObjectId, ref: 'BulkImport', default: null },
    ratingAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
      min: 0,
    }
  },
  {
    timestamps: true
  }
);
// Targeted indexes matching actual query patterns
productSchema.index({ category: 1, status: 1 });
productSchema.index({ subCategory: 1, status: 1 });
productSchema.index({ sellerId: 1, status: 1 });
productSchema.index({ homeSections: 1, status: 1 });
productSchema.index({ sku: 1 });
// Per-seller SKU lookups (bulk upload CREATE/UPDATE). Deliberately NOT unique: uniqueness per seller is enforced
// by the import code, so existing catalogues that already contain repeated SKUs cannot break index creation.
productSchema.index({ sellerId: 1, sku: 1 });
productSchema.index({ sellerId: 1, importId: 1 });
productSchema.index({ isPublished: 1, adminBlocked: 1, status: 1 });
productSchema.index({ createdAt: -1 });

const Product = mongoose.model('Product', productSchema);

export default Product;
