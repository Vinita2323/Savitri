import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Seller from '../models/Seller.model.js';
import Admin from '../models/Admin.model.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import dotenv from 'dotenv';

dotenv.config();

import fs from 'fs';
import path from 'path';
import { getEligibleSellersForLocation, isValidCoordinate } from '../utils/sellerLocationHelper.js';
import { evaluateSellerStorefrontEligibility, evaluateProductSellerEligibility } from '../utils/sellerEligibility.js';
import { getEffectiveStock, syncRootStockFromVariants } from '../utils/productStock.js';
import { canAccessProduct, canAccessSellerId } from '../utils/accessControl.js';
import { normalizeRole } from '../middleware/authMiddleware.js';
import { normalizeProductShipping } from '../utils/shippingValidation.js';

// Fields only the platform (admin moderation or the bulk importer) may write
const PLATFORM_ONLY_FIELDS = ['adminBlocked', 'blockedReason', 'blockedAt', 'blockedBy', 'importId', 'source', 'publishedAt', 'purchasePrice_internal'];
// Never shown to customers
// Courier-shippable products (pan-India) are not tied to the seller's local service radius, so every customer can see them.
const STANDARD_SHIPPING_CLAUSE = { shippingEnabled: true, shippingReady: true, fulfillmentType: { $in: ['STANDARD', 'BOTH'] } };
const PRIVATE_PRODUCT_FIELDS = ['purchasePrice', 'blockedReason', 'blockedAt', 'blockedBy', 'importId', 'source', 'barcode'];

// High-speed In-memory Cache for Products listing
const productsCache = new Map();
export const invalidateProductsCache = () => {
  productsCache.clear();
};

const saveBase64ImageLocally = (base64Str, subfolder = 'products') => {
  try {
    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    let ext = '.png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
    else if (mimeType.includes('webp')) ext = '.webp';
    else if (mimeType.includes('svg')) ext = '.svg';
    else if (mimeType.includes('gif')) ext = '.gif';

    const targetDir = path.join(process.cwd(), 'uploads', subfolder.toLowerCase());
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `img-${Date.now()}-${Math.floor(10000 + Math.random() * 90000)}${ext}`;
    const filePath = path.join(targetDir, filename);
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${subfolder.toLowerCase()}/${filename}`;
  } catch (err) {
    console.error('Failed to save base64 image locally:', err.message);
    return null;
  }
};

const processImage = async (imgStr, folder = 'products') => {
  if (!imgStr || typeof imgStr !== 'string' || !imgStr.trim()) {
    return '';
  }
  
  if (imgStr.startsWith('data:image/')) {
    // 1. Try Cloudinary if configured
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name_here') {
      try {
        const uploadPromise = uploadToCloudinary(imgStr, folder);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cloudinary upload timed out (120s limit)')), 120000)
        );
        const res = await Promise.race([uploadPromise, timeoutPromise]);
        if (res && res.secure_url) return res.secure_url;
      } catch (err) {
        console.warn('[ProductController] Cloudinary upload failed, persisting locally:', err.message);
      }
    }

    // 2. Persist to local disk uploads directory
    const cleanFolder = folder.includes('/') ? folder.split('/')[0] : folder;
    const localUrl = saveBase64ImageLocally(imgStr, cleanFolder);
    if (localUrl) return localUrl;
  }

  return imgStr;
};

const processImageWithCache = async (imgStr, folder = 'products', cache = new Map()) => {
  if (!imgStr || typeof imgStr !== 'string' || !imgStr.trim()) {
    return '';
  }
  if (imgStr.startsWith('http://') || imgStr.startsWith('https://') || imgStr.startsWith('/uploads/')) {
    return imgStr;
  }
  if (cache.has(imgStr)) {
    return cache.get(imgStr);
  }
  const result = await processImage(imgStr, folder);
  cache.set(imgStr, result);
  return result;
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res) => {
  try {
    // Ownership: a seller can only create products for themselves; an admin only for sellers in scope.
    if (req.user?.role === 'seller') {
      const me = await Seller.findById(req.user.id).select('businessName').lean();
      if (!me) return res.status(404).json({ success: false, message: 'Seller not found' });
      req.body.sellerId = String(req.user.id);
      req.body.seller = me.businessName || req.body.seller;
    } else if (req.body.sellerId) {
      if (!(await canAccessSellerId(req, req.body.sellerId))) {
        return res.status(404).json({ success: false, message: 'Seller not found' });
      }
    } else if (req.scope && !req.scope.isAll) {
      return res.status(403).json({ success: false, message: 'A sellerId is required when working within a single brand scope' });
    }

    const {
      name,
      category,
      subCategory,
      brand,
      unitValue,
      unitType,
      seller,
      sellerId,
      description,
      mrp,
      salePrice,
      taxRate,
      hsnCode,
      stock,
      minStockLimit,
      sku,
      mainImage,
      homeSections,
      galleryImages,
      status,
      isFeatured,
      isReturnable,
      returnWindow,
      returnPolicy,
      hasVariants,
      variantOptions,
      variants
    } = req.body;

    // Phase 1 shipping details (optional; validated only when sent)
    const shipping = normalizeProductShipping(req.body);
    if (shipping.errors.length) {
      return res.status(400).json({ success: false, message: shipping.errors[0], errors: shipping.errors });
    }

    // TEMP: allow create even if name is blank — use a placeholder
    const productName =
      name && typeof name === 'string' && name.trim()
        ? name.trim()
        : `Product ${Date.now().toString().slice(-6)}`;

    const imageCache = new Map();

    // Process mainImage & galleryImages through Cloudinary in PARALLEL
    const [processedMainImage, processedGalleryImages] = await Promise.all([
      processImageWithCache(mainImage, 'products/main', imageCache),
      Array.isArray(galleryImages) && galleryImages.length > 0
        ? Promise.all(galleryImages.map(img => processImageWithCache(img, 'products/gallery', imageCache)))
        : Promise.resolve([])
    ]);

    // Process variant images if provided, re-using processedMainImage when possible
    let processedVariants = [];
    if (Array.isArray(variants) && variants.length > 0) {
      processedVariants = await Promise.all(
        variants.map(async (v) => {
          let vImage = v.image || '';
          if (vImage && typeof vImage === 'string' && vImage.startsWith('data:image/')) {
            vImage = await processImageWithCache(vImage, 'products/variants', imageCache);
          } else if (!vImage || vImage === mainImage) {
            vImage = processedMainImage;
          }
          return {
            ...v,
            image: vImage,
            price: Number(v.price || 0),
            originalPrice: Number(v.originalPrice || v.price || 0),
            stock: Number(v.stock || 0),
            active: v.active !== undefined ? Boolean(v.active) : true
          };
        })
      );
    }

    // Clean out any option that has 0 values (e.g. user added option name but no tags)
    const cleanVariantOptions = Array.isArray(variantOptions)
      ? variantOptions.filter(o => o.name && o.name.trim() && Array.isArray(o.values) && o.values.length > 0)
      : [];

    const isMultiVariant = Boolean((hasVariants && cleanVariantOptions.length > 0) || (processedVariants && processedVariants.length > 0));
    const firstActiveVariant = processedVariants.find(v => v.active !== false) || processedVariants[0];

    const parsedMrp = Number(mrp || (firstActiveVariant ? firstActiveVariant.originalPrice : (salePrice || 0)));
    const parsedSalePrice = Number(salePrice || (firstActiveVariant ? firstActiveVariant.price : (mrp || 0)));
    // Variant products: root stock must always equal sum of active variant stocks
    const parsedStock = isMultiVariant
      ? syncRootStockFromVariants({ hasVariants: true, variants: processedVariants })
      : Math.max(0, Number(stock !== undefined && stock !== '' ? stock : 0));

    const formattedUnit = `${unitValue || '1'} ${unitType || 'kg'}`;
    const finalIsReturnable = isReturnable !== undefined ? Boolean(isReturnable) : true;
    const finalReturnWindow = returnWindow ? Number(returnWindow) : 7;
    const finalReturnPolicy = returnPolicy || (finalIsReturnable ? `${finalReturnWindow} Days Returnable` : 'Non-Returnable');

    const product = await Product.create({
      name: productName,
      category: category || 'Groceries',
      subCategory: subCategory || '',
      brand: brand || '',
      unitValue: String(unitValue || '1'),
      unitType: String(unitType || 'kg'),
      unit: formattedUnit,
      seller: seller || 'Savitri Official Store',
      sellerId: sellerId && mongoose.Types.ObjectId.isValid(sellerId) ? sellerId : undefined,
      description: description || '',
      mrp: Number.isFinite(parsedMrp) ? parsedMrp : 0,
      salePrice: Number.isFinite(parsedSalePrice) ? parsedSalePrice : 0,
      taxRate: taxRate || '5%',
      hsnCode: hsnCode || '',
      stock: parsedStock,
      minStockLimit: minStockLimit ? Number(minStockLimit) : 10,
      sku: sku || (firstActiveVariant?.sku) || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      mainImage: processedMainImage || (firstActiveVariant?.image) || '',
      homeSections: Array.isArray(homeSections) && homeSections.length > 0 ? homeSections : ['flash_sale', 'bestseller'],
      galleryImages: processedGalleryImages,
      status: status || 'Published',
      isPublished: (status || 'Published') === 'Published',
      publishedAt: (status || 'Published') === 'Published' ? new Date() : null,
      listingStatus: (status || 'Published') !== 'Published' ? 'inactive' : (parsedStock > 0 ? 'active' : 'out_of_stock'),
      isFeatured: Boolean(isFeatured),
      isReturnable: finalIsReturnable,
      returnWindow: finalReturnWindow,
      returnPolicy: finalReturnPolicy,
      hasVariants: isMultiVariant,
      variantOptions: cleanVariantOptions,
      variants: processedVariants,
      ...shipping.set
    });


    invalidateProductsCache();

    console.log(`[PRODUCT CREATED IN DB] ID: ${product._id}, Name: ${product.name}, Seller: ${product.seller}, SellerID: ${product.sellerId}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('[PRODUCT CREATION ERROR]', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating product'
    });
  }
};

// @desc    Get all products
// @route   GET /api/products
export const getProducts = async (req, res) => {
  try {
    const now = Date.now();
    const { category, subCategory, section, search, sellerId, seller, lat, lng, latitude, longitude, admin, all } = req.query;

    const userLat = lat !== undefined ? lat : latitude;
    const userLng = lng !== undefined ? lng : longitude;
    // The internal flags (admin=true, headers) only count for a verified admin / seller token. Without one the caller is a
    // customer and gets the full storefront rules, so hidden or blocked products can never be listed by adding ?admin=true.
    const viewerRole = normalizeRole(req.user?.role);
    const isStaff = viewerRole === 'admin' || viewerRole === 'super_admin';
    const wantsInternal = admin === 'true' || all === 'true' || req.headers['x-admin-request'] === 'true';
    const isAdminOrInternal = isStaff && (wantsInternal || viewerRole === 'admin' || viewerRole === 'super_admin');
    // A seller always sees their own full catalogue (drafts, out of stock, unpublished), nobody else's
    const ownSellerView = viewerRole === 'seller' && Boolean(sellerId) && String(sellerId) === String(req.user.id);
    const privileged = isAdminOrInternal || ownSellerView;
    const viewer = isAdminOrInternal ? 'adm' : ownSellerView ? `own:${req.user.id}` : 'cust';

    const cacheKey = `${req.originalUrl}_${userLat || 'none'}_${userLng || 'none'}_${viewer}`;
    const cached = productsCache.get(cacheKey);
    if (cached && (now - cached.timestamp < 10000)) {
      return res.status(200).json(cached.data);
    }

    let query = {};

    if (sellerId || seller) {
      if (!privileged) {
        const sQuery = sellerId && mongoose.Types.ObjectId.isValid(sellerId)
          ? { _id: sellerId }
          : { businessName: seller || sellerId };
        const sellerDoc = await Seller.findOne(sQuery).lean();
        const eligibility = await evaluateSellerStorefrontEligibility(sellerDoc || sellerId);
        if (!eligibility.eligible) {
          const emptyResponse = {
            success: true,
            count: 0,
            total: 0,
            page: 1,
            limit: 50,
            products: [],
            message: eligibility.message || 'This store is not available for orders.',
          };
          productsCache.set(cacheKey, { data: emptyResponse, timestamp: now });
          return res.status(200).json(emptyResponse);
        }
      }

      if (sellerId) {
        if (mongoose.Types.ObjectId.isValid(sellerId)) {
          query.$or = [
            { sellerId: sellerId },
            { seller: sellerId },
            ...(seller ? [{ seller: seller }] : [])
          ];
        } else {
          query.seller = sellerId;
        }
      } else if (seller) {
        query.seller = seller;
      }
    } else if (isAdminOrInternal) {
      // Admin product management: allowed to query all products (optionally narrowed by seller / city / brand / state)
      // Brand scope: a brand-restricted Admin only ever sees their brands' sellers; a Super Admin follows the brand selector.
      let allowedSellerIds = null; // null = every seller
      const intersect = (ids) => { const set = new Set(ids.map(String)); allowedSellerIds = allowedSellerIds === null ? [...set] : allowedSellerIds.filter((x) => set.has(x)); };
      let brandIds = null;
      if (viewerRole === 'admin') {
        const me = await Admin.findById(req.user.id).select('authorizedBrands').lean();
        const list = me?.authorizedBrands;
        if (Array.isArray(list) && list.length > 0 && !list.includes('*')) brandIds = list;
      }
      const brandHeader = String(req.headers['x-brand-id'] || '').trim();
      if (brandHeader && brandHeader.toUpperCase() !== 'ALL') brandIds = brandIds ? brandIds.filter((b) => b === brandHeader) : [brandHeader];
      if (brandIds) intersect((await Seller.find({ brandId: { $in: brandIds } }).select('_id').lean()).map((x) => x._id));
      if (isId(req.query.adminSellerId)) intersect([req.query.adminSellerId]);
      if (req.query.city && String(req.query.city).trim()) {
        const esc = String(req.query.city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        intersect((await Seller.find({ 'warehouseLocation.city': new RegExp(`^${esc}$`, 'i') }).select('_id').lean()).map((x) => x._id));
      }
      if (allowedSellerIds !== null) query.sellerId = { $in: allowedSellerIds.map((id) => new mongoose.Types.ObjectId(id)) };
      if (req.query.brand && String(req.query.brand).trim()) {
        const esc = String(req.query.brand).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.brand = new RegExp(`^${esc}$`, 'i');
      }
      if (req.query.blocked === 'true') query.adminBlocked = true;
      if (req.query.blocked === 'false') query.adminBlocked = { $ne: true };
      if (req.query.published === 'true') query.isPublished = { $ne: false };
      if (req.query.published === 'false') query.isPublished = false;
      if (req.query.source === 'bulk') query.source = 'bulk';
      if (req.query.stockState === 'out') query.stock = { $lte: 0 };
      if (req.query.stockState === 'in') query.stock = { $gt: 0 };
    } else if (isValidCoordinate(userLat, userLng)) {
      // Customer Storefront: Find sellers covering this user's location based on each seller's serviceRadius
      const { eligibleSellerIds, eligibleSellerNames } = await getEligibleSellersForLocation(userLat, userLng);

      if ((!eligibleSellerIds || eligibleSellerIds.length === 0) && !(await Product.exists({ ...STANDARD_SHIPPING_CLAUSE, status: 'Published' }))) {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = req.query.limit !== undefined 
          ? (Number(req.query.limit) === 0 ? 0 : Math.min(100, Math.max(1, Number(req.query.limit))))
          : 50;

        const emptyResponse = {
          success: true,
          count: 0,
          total: 0,
          page,
          limit: limit || 0,
          products: [],
          message: 'No products available for your selected location.'
        };
        productsCache.set(cacheKey, { data: emptyResponse, timestamp: now });
        return res.status(200).json(emptyResponse);
      }

      // Prefer sellerId match so name collisions cannot surface ineligible stores' products
      const eligibleIdStrings = (eligibleSellerIds || []).map((id) => String(id));
      query.$or = [
        { sellerId: { $in: eligibleSellerIds || [] } },
        { seller: { $in: eligibleIdStrings } },
        {
          $and: [
            { $or: [{ sellerId: null }, { sellerId: { $exists: false } }] },
            { seller: { $in: eligibleSellerNames || [] } },
          ],
        },
        // sellers in other cities whose products can be shipped by courier
        STANDARD_SHIPPING_CLAUSE,
      ];
    } else if (await Product.exists({ ...STANDARD_SHIPPING_CLAUSE, status: 'Published' })) {
      // No usable location: only courier-shippable products can be shown (they do not depend on the customer's area)
      Object.assign(query, STANDARD_SHIPPING_CLAUSE);
    } else {
      // Customer Storefront without valid location coordinates:
      // DO NOT return arbitrary global products. Prompt user to select delivery location.
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = req.query.limit !== undefined 
        ? (Number(req.query.limit) === 0 ? 0 : Math.min(100, Math.max(1, Number(req.query.limit))))
        : 50;

      const noLocationResponse = {
        success: true,
        count: 0,
        total: 0,
        page,
        limit: limit || 0,
        products: [],
        message: 'Please select your delivery location to view available products.'
      };
      productsCache.set(cacheKey, { data: noLocationResponse, timestamp: now });
      return res.status(200).json(noLocationResponse);
    }

    if (category && category.trim() && category.trim().toLowerCase() !== 'all') {
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedCat = escapeRegex(category.trim()).replace(/\s+/g, '\\s+');
      query.category = { $regex: new RegExp(`^${normalizedCat}$`, 'i') };
    }

    if (subCategory && subCategory.trim() && subCategory.trim().toLowerCase() !== 'all' && subCategory.trim().toLowerCase() !== 'none') {
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const normalizedSub = escapeRegex(subCategory.trim()).replace(/\s+/g, '\\s+');
      query.subCategory = { $regex: new RegExp(`^${normalizedSub}$`, 'i') };
    }

    if (section) {
      query.homeSections = section;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Customer / public listings: only products that are Published, not blocked by an admin and in stock
    if (!privileged) {
      query.status = 'Published';
      query.isPublished = { $ne: false };
      query.adminBlocked = { $ne: true };
      query.stock = { $gt: 0 };
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = req.query.limit !== undefined 
      ? (Number(req.query.limit) === 0 ? 0 : Math.min(100, Math.max(1, Number(req.query.limit))))
      : 50;

    let dbQuery = Product.find(query)
      .select(`name category subCategory brand unitValue unitType unit seller sellerId mrp salePrice stock mainImage homeSections status isFeatured isReturnable sku createdAt hasVariants variantOptions variants isPublished adminBlocked listingStatus fulfillmentType shippingReady${privileged ? ' purchasePrice barcode weight blockedReason source importId hsnCode shippingEnabled fulfillmentType weightKg length breadth height countryOfOrigin isFragile requiresSpecialHandling shippingReady' : ''}`)
      .sort({ createdAt: -1 })
      .lean();

    if (limit > 0) {
      dbQuery = dbQuery.skip((page - 1) * limit).limit(limit);
    }

    const [products, total] = await Promise.all([
      dbQuery,
      Product.countDocuments(query),
    ]);

    let visibleProducts = products || [];

    // Defense-in-depth: drop any product whose seller is not storefront-eligible
    // (covers name collisions / stale seller fields on customer listings)
    if (!privileged && visibleProducts.length > 0) {
      const checks = await Promise.all(
        visibleProducts.map((p) => evaluateProductSellerEligibility(p))
      );
      visibleProducts = visibleProducts.filter((_, idx) => checks[idx]?.eligible);
    }

    // Expose effective stock (variant sum) so seller/user panels never show a stale root count
    const normalizedProducts = visibleProducts.map((p) => ({
      ...p,
      stock: getEffectiveStock(p),
    }));

    const responsePayload = {
      success: true,
      count: normalizedProducts.length,
      total,
      page,
      limit: limit || total,
      products: normalizedProducts,
    };

    productsCache.set(cacheKey, { data: responsePayload, timestamp: now });

    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching products'
    });
  }
};

// Helper to find product by ObjectId or SKU
const findProductByIdOrSku = async (idOrSku) => {
  if (!idOrSku) return null;
  if (mongoose.Types.ObjectId.isValid(idOrSku)) {
    const p = await Product.findById(idOrSku);
    if (p) return p;
  }
  return await Product.findOne({ sku: idOrSku });
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    let product = null;
    if (req.params.id && mongoose.Types.ObjectId.isValid(req.params.id)) {
      product = await Product.findById(req.params.id).lean();
    }
    if (!product && req.params.id) {
      product = await Product.findOne({ sku: req.params.id }).lean();
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // staff / sellers (verified token) see everything they manage; everyone else gets the customer rules
    const role = normalizeRole(req.user?.role);
    const isAdminOrInternal = role === 'admin' || role === 'super_admin' || (role === 'seller' && String(product.sellerId || '') === String(req.user.id));
    if (!isAdminOrInternal) {
      if (product.status && product.status !== 'Published') {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      const eligibility = await evaluateProductSellerEligibility(product);
      if (!eligibility.eligible) {
        return res.status(404).json({
          success: false,
          message: eligibility.message || 'This product is not available.',
        });
      }
    }

    const out = { ...product, stock: getEffectiveStock(product) };
    if (!isAdminOrInternal) PRIVATE_PRODUCT_FIELDS.forEach((f) => delete out[f]);
    res.status(200).json({ success: true, product: out });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching product details'
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res) => {
  try {
    const product = await findProductByIdOrSku(req.params.id);

    if (!product || !(await canAccessProduct(req, product))) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const updateData = { ...req.body };
    // Moderation / import bookkeeping is never taken from a request body (a seller must not be able to unblock a product)
    PLATFORM_ONLY_FIELDS.forEach((f) => delete updateData[f]);
    delete updateData.isPublished;
    delete updateData.listingStatus;
    // shippingReady is computed server-side; shipping fields are validated against the stored product
    delete updateData.shippingReady;
    const shipping = normalizeProductShipping(req.body, product);
    if (shipping.errors.length) {
      return res.status(400).json({ success: false, message: shipping.errors[0], errors: shipping.errors });
    }
    if (shipping.touched) Object.assign(updateData, shipping.set);
    // Ownership fields cannot be reassigned by sellers.
    if (req.user?.role === 'seller') {
      delete updateData.sellerId;
      delete updateData.seller;
      delete updateData.seller_id;
    } else if (updateData.sellerId && String(updateData.sellerId) !== String(product.sellerId)) {
      if (!(await canAccessSellerId(req, updateData.sellerId))) {
        return res.status(404).json({ success: false, message: 'Seller not found' });
      }
    }
    if (updateData.mainImage) {
      updateData.mainImage = await processImage(updateData.mainImage, 'products/main');
    }
    if (Array.isArray(updateData.galleryImages)) {
      updateData.galleryImages = await Promise.all(updateData.galleryImages.map(img => processImage(img, 'products/gallery')));
    }

    if (Array.isArray(updateData.variants)) {
      updateData.variants = await Promise.all(
        updateData.variants.map(async (v) => {
          let vImage = v.image || '';
          if (vImage && typeof vImage === 'string' && vImage.startsWith('data:image/')) {
            vImage = await processImage(vImage, 'products/variants');
          }
          return {
            ...v,
            image: vImage,
            price: Number(v.price || 0),
            originalPrice: Number(v.originalPrice || v.price || 0),
            stock: Number(v.stock || 0),
            active: v.active !== undefined ? Boolean(v.active) : true
          };
        })
      );

      if (updateData.hasVariants && updateData.variants.length > 0) {
        const firstActiveVariant = updateData.variants.find(v => v.active !== false) || updateData.variants[0];
        if (firstActiveVariant) {
          if (!updateData.salePrice) updateData.salePrice = firstActiveVariant.price;
          if (!updateData.mrp) updateData.mrp = firstActiveVariant.originalPrice;
        }
        // Always keep root stock = sum of active variant stocks
        updateData.stock = syncRootStockFromVariants({
          hasVariants: true,
          variants: updateData.variants,
        });
      }
    } else if (updateData.hasVariants && Array.isArray(product.variants) && product.variants.length > 0) {
      // Variants not in payload but product already has them — keep root stock consistent if stock omitted
      if (updateData.stock === undefined || updateData.stock === null) {
        updateData.stock = syncRootStockFromVariants({
          hasVariants: true,
          variants: product.variants,
        });
      }
    }

    // keep the publishing labels in step with the existing editor fields (status + stock)
    if (updateData.status !== undefined) {
      const live = updateData.status === 'Published';
      updateData.isPublished = live;
      if (live && !product.publishedAt) updateData.publishedAt = new Date();
    }
    if (updateData.status !== undefined || updateData.stock !== undefined) {
      const st = updateData.status !== undefined ? updateData.status : product.status;
      const stock = updateData.stock !== undefined ? Number(updateData.stock) : product.stock;
      updateData.listingStatus = st !== 'Published' ? 'inactive' : stock > 0 ? 'active' : 'out_of_stock';
    }
    const updatedProduct = await Product.findByIdAndUpdate(
      product._id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    );

    invalidateProductsCache();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating product'
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await findProductByIdOrSku(req.params.id);

    if (!product || !(await canAccessProduct(req, product))) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.deleteOne();
    invalidateProductsCache();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting product'
    });
  }
};


const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

// @desc    Admin moderation: deactivate / activate / block / unblock a product
// @route   PATCH /api/products/:id/moderation
// @access  Admin, Super Admin (brand scoped)
export const moderateProduct = async (req, res) => {
  try {
    const product = await findProductByIdOrSku(req.params.id);
    if (!product || !(await canAccessProduct(req, product))) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    const action = String(req.body?.action || '');
    const reason = String(req.body?.reason || '').trim().slice(0, 300);
    const actor = req.user?.email || req.user?.name || 'admin';
    let update;
    if (action === 'block') {
      if (!reason) return res.status(400).json({ success: false, message: 'A reason is required to block a product.' });
      update = { adminBlocked: true, blockedReason: reason, blockedAt: new Date(), blockedBy: actor };
    } else if (action === 'unblock') {
      update = { adminBlocked: false, blockedReason: '', blockedAt: null, blockedBy: '' };
    } else if (action === 'deactivate') {
      update = { status: 'Draft', isPublished: false, listingStatus: 'inactive' };
    } else if (action === 'activate') {
      update = { status: 'Published', isPublished: true, listingStatus: product.stock > 0 ? 'active' : 'out_of_stock', publishedAt: product.publishedAt || new Date() };
    } else {
      return res.status(400).json({ success: false, message: 'Action must be deactivate, activate, block or unblock.' });
    }
    const updated = await Product.findByIdAndUpdate(product._id, { $set: update }, { returnDocument: 'after' });
    invalidateProductsCache();
    const done = { block: 'blocked', unblock: 'unblocked', deactivate: 'deactivated', activate: 'activated' }[action];
    return res.json({ success: true, message: `Product ${done}.`, product: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Could not update the product' });
  }
};

// @desc    Seller: change price / stock / status of many of their own products at once
// @route   POST /api/products/bulk-update
// @access  Seller
export const bulkUpdateMyProducts = async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isId).slice(0, 500);
    const u = req.body?.updates || {};
    if (ids.length === 0) return res.status(400).json({ success: false, message: 'Select at least one product.' });
    const set = {};
    const filter = { _id: { $in: ids }, sellerId: req.user.id, hasVariants: { $ne: true } };
    const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
    const stock = num(u.stock); const sale = num(u.salePrice); const mrp = num(u.mrp);
    if (u.stock !== undefined) { if (!Number.isInteger(stock) || stock < 0 || stock > 10000000) return res.status(400).json({ success: false, message: 'Stock must be a whole number (0 or more).' }); set.stock = stock; }
    if (u.salePrice !== undefined) { if (!(sale >= 0)) return res.status(400).json({ success: false, message: 'Selling price must be 0 or more.' }); set.salePrice = sale; }
    if (u.mrp !== undefined) { if (!(mrp >= 0)) return res.status(400).json({ success: false, message: 'MRP must be 0 or more.' }); set.mrp = mrp; }
    if (set.salePrice !== undefined && set.mrp !== undefined && set.salePrice > set.mrp) return res.status(400).json({ success: false, message: 'Selling price cannot be higher than MRP.' });
    if (set.salePrice !== undefined && set.mrp === undefined) filter.mrp = { $gte: set.salePrice };
    if (set.mrp !== undefined && set.salePrice === undefined) filter.salePrice = { $lte: set.mrp };
    const status = u.status === undefined ? null : String(u.status);
    if (status && !['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be active or inactive.' });
    if (Object.keys(set).length === 0 && !status) return res.status(400).json({ success: false, message: 'Nothing to update.' });

    // one pipeline update keeps status labels consistent with the stock each product ends up with
    const stockExpr = set.stock !== undefined ? set.stock : '$stock';
    const pipelineSet = { ...set };
    if (status === 'inactive') Object.assign(pipelineSet, { status: 'Draft', isPublished: false, listingStatus: 'inactive' });
    else if (status === 'active') Object.assign(pipelineSet, { status: 'Published', isPublished: true, publishedAt: { $ifNull: ['$publishedAt', new Date()] }, listingStatus: { $cond: [{ $gt: [stockExpr, 0] }, 'active', 'out_of_stock'] } });
    else if (set.stock !== undefined) pipelineSet.listingStatus = { $cond: [{ $eq: ['$listingStatus', 'inactive'] }, 'inactive', { $cond: [{ $gt: [set.stock, 0] }, 'active', 'out_of_stock'] }] };
    const result = await Product.updateMany(filter, [{ $set: pipelineSet }], { updatePipeline: true });
    invalidateProductsCache();
    return res.json({ success: true, requested: ids.length, updated: result.modifiedCount || 0, skipped: ids.length - (result.matchedCount || 0), message: `${result.modifiedCount || 0} product(s) updated.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Bulk update failed' });
  }
};
