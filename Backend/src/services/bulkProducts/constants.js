import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

/** Column order of the downloadable template (the first 15 are the original spec; returnable / returnDays are optional and may be missing from older files; productId is optional, UPDATE only). */
export const COLUMNS = [
  'productName', 'SKU', 'barcode', 'category', 'brand', 'description', 'MRP', 'sellingPrice',
  'purchasePrice', 'stock', 'unit', 'GST', 'weight', 'images', 'status', 'returnable', 'returnDays',
];
export const OPTIONAL_COLUMNS = ['productId'];

/** Header text typed by sellers -> canonical column. Keys are lower-case with every non-alphanumeric removed. */
export const HEADER_ALIASES = {
  productname: 'productName', name: 'productName', product: 'productName', title: 'productName', producttitle: 'productName',
  sku: 'SKU', skucode: 'SKU', itemcode: 'SKU',
  barcode: 'barcode', ean: 'barcode', upc: 'barcode', gtin: 'barcode',
  category: 'category', categoryname: 'category',
  brand: 'brand', brandname: 'brand',
  description: 'description', desc: 'description', details: 'description',
  mrp: 'MRP', maxretailprice: 'MRP', listprice: 'MRP',
  sellingprice: 'sellingPrice', saleprice: 'sellingPrice', price: 'sellingPrice', offerprice: 'sellingPrice',
  purchaseprice: 'purchasePrice', costprice: 'purchasePrice', cost: 'purchasePrice',
  stock: 'stock', quantity: 'stock', qty: 'stock', inventory: 'stock',
  unit: 'unit', uom: 'unit', packsize: 'unit',
  gst: 'GST', gstrate: 'GST', gstpercent: 'GST', tax: 'GST', taxrate: 'GST',
  weight: 'weight',
  images: 'images', image: 'images', imageurls: 'images', imageurl: 'images', photos: 'images',
  status: 'status',
  returnable: 'returnable', isreturnable: 'returnable', returnallowed: 'returnable', returnpolicy: 'returnable',
  returndays: 'returnDays', returnwindow: 'returnDays', returnperiod: 'returnDays', returnwindowdays: 'returnDays',
  productid: 'productId', id: 'productId',
};

export const LIMITS = {
  maxRows: 5000,
  maxSheetBytes: 10 * 1024 * 1024, // xlsx / csv
  maxZipBytes: 150 * 1024 * 1024,
  maxZipEntries: 6000,
  maxImageBytes: 8 * 1024 * 1024, // one image (ZIP entry or download)
  maxImagesPerProduct: 8,
  maxImagePixels: 40_000_000,
  batchSize: 100,
  urlDownloadConcurrency: 4,
  validatedUploadTtlMs: 24 * 60 * 60 * 1000,
  staleRunMs: 30 * 60 * 1000, // a run with no progress for this long after a restart is marked failed
};

export const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
export const GST_SLABS = [0, 0.25, 3, 5, 12, 18, 28];
export const UNIT_TYPES = ['kg', 'g', 'mg', 'ltr', 'ml', 'pcs', 'pack', 'dozen', 'box', 'm', 'cm'];

/** Uploads are staged outside `uploads/` so the static file server can never expose them. */
export const TEMP_ROOT = path.join(os.tmpdir(), 'savitri-bulk-upload');
export const IMAGE_PUBLIC_PREFIX = '/uploads/products/bulk';
// Must be the very folder server.js serves at /uploads (same rule as server.js), whatever directory the process was started from.
const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const UPLOADS_DIR = fs.existsSync(path.join(BACKEND_ROOT, 'uploads')) ? path.join(BACKEND_ROOT, 'uploads') : path.join(process.cwd(), 'uploads');
export const IMAGE_DISK_ROOT = path.join(UPLOADS_DIR, 'products', 'bulk');
