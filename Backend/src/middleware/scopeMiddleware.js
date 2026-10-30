import Brand from '../models/Brand.model.js';
import Seller from '../models/Seller.model.js';
import Captain from '../models/Captain.model.js';
import Admin from '../models/Admin.model.js';

const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Default initial regional brands to auto-seed if collection is empty
export const INITIAL_REGIONAL_BRANDS = [
  {
    brandId: 'brand_fg',
    name: 'Fashion Gallary',
    shortName: 'Fashion Gallary',
    code: 'FG-IND',
    city: 'Indore',
    state: 'Madhya Pradesh',
    country: 'India',
    address: '12 MG Road, Near Rajwada',
    contact: '9876543210',
    email: 'ops@fashiongallary.in',
    gst: '23AABCF1234A1Z5',
    pan: 'AABCF1234A',
    category: 'Apparel & Fashion',
    website: 'https://fashiongallary.in',
    status: 'Active',
    logo: '/LogoSavitri.png',
    coordinates: { latitude: 22.7196, longitude: 75.8577 },
    location: { type: 'Point', coordinates: [75.8577, 22.7196] },
    operatingRadiusKm: 25,
    allowSellerRegistration: true,
    complianceStatus: 'Verified',
    isDefault: true,
  },
  {
    brandId: 'brand_fh',
    name: 'Fashion Hub',
    shortName: 'Fashion Hub',
    code: 'FH-BPL',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    country: 'India',
    address: '45 New Market, TT Nagar',
    contact: '9876501234',
    email: 'hello@fashionhub.in',
    gst: '23AABCF5678B1Z2',
    pan: 'AABCF5678B',
    category: 'Apparel & Fashion',
    website: '',
    status: 'Active',
    logo: '/LogoSavitri.png',
    coordinates: { latitude: 23.2599, longitude: 77.4126 },
    location: { type: 'Point', coordinates: [77.4126, 23.2599] },
    operatingRadiusKm: 25,
    allowSellerRegistration: true,
    complianceStatus: 'Verified',
    isDefault: false,
  },
  {
    brandId: 'brand_fa',
    name: 'Fashion Adda',
    shortName: 'Fashion Adda',
    code: 'FA-JBP',
    city: 'Jabalpur',
    state: 'Madhya Pradesh',
    country: 'India',
    address: '88 Civil Lines',
    contact: '9123456780',
    email: 'care@fashionadda.in',
    gst: '23AABCF9012C1Z9',
    pan: 'AABCF9012C',
    category: 'Apparel & Fashion',
    website: '',
    status: 'Active',
    logo: '/LogoSavitri.png',
    coordinates: { latitude: 23.1815, longitude: 79.9864 },
    location: { type: 'Point', coordinates: [79.9864, 23.1815] },
    operatingRadiusKm: 25,
    allowSellerRegistration: true,
    complianceStatus: 'Verified',
    isDefault: false,
  },
  {
    brandId: 'brand_uj',
    name: 'Savitri Retail',
    shortName: 'Savitri Ujjain',
    code: 'SR-UJJ',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    country: 'India',
    address: '22 Freeganj Main Road',
    contact: '9826012345',
    email: 'ujjain@savitri.com',
    gst: '23AABCF7890D1Z4',
    pan: 'AABCF7890D',
    category: 'Apparel & Fashion',
    website: '',
    status: 'Active',
    logo: '/LogoSavitri.png',
    coordinates: { latitude: 23.1765, longitude: 75.7885 },
    location: { type: 'Point', coordinates: [75.7885, 23.1765] },
    operatingRadiusKm: 25,
    allowSellerRegistration: true,
    complianceStatus: 'Verified',
    isDefault: false,
  },
];

/**
 * Ensures baseline regional brands exist in MongoDB.
 */
export const ensureBaselineBrands = async () => {
  try {
    const count = await Brand.countDocuments();
    if (count === 0) {
      await Brand.insertMany(INITIAL_REGIONAL_BRANDS);
      console.log('✅ Baseline Regional Brands seeded in MongoDB (Indore, Bhopal, Jabalpur, Ujjain)');
    } else {
      // Safe migration for legacy documents missing coordinates or radius
      for (const baseline of INITIAL_REGIONAL_BRANDS) {
        await Brand.updateOne(
          { brandId: baseline.brandId, $or: [{ operatingRadiusKm: { $exists: false } }, { location: { $exists: false } }] },
          {
            $set: {
              coordinates: baseline.coordinates,
              location: baseline.location,
              operatingRadiusKm: baseline.operatingRadiusKm,
              country: baseline.country,
              allowSellerRegistration: baseline.allowSellerRegistration,
              complianceStatus: baseline.complianceStatus,
            },
          }
        );
      }
    }
  } catch (err) {
    console.error('Failed to ensure baseline brands:', err.message);
  }
};

/**
 * Middleware: Resolves and validates brand/region scope on every incoming request.
 * Populates req.scope:
 * {
 *   isAll: boolean,
 *   brandId: string,
 *   brand: BrandDocument | null,
 *   city: string | null,
 *   state: string | null
 * }
 */
export const resolveBrandScope = async (req, res, next) => {
  try {
    // Scope must be resolved after authentication; never resolve brands for anonymous callers.
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized, authentication required' });
    }

    await ensureBaselineBrands();

    const rawId =
      req.query.brandId ||
      req.headers['x-brand-id'] ||
      req.query.region ||
      req.headers['x-region-id'] ||
      (req.body && req.body.brandId);

    const scopeParam = typeof rawId === 'string' ? rawId.trim() : '';

    // If scope is explicitly 'ALL', 'all', or empty/unspecified
    if (!scopeParam || scopeParam.toUpperCase() === 'ALL' || scopeParam === '*') {
      // Consolidated scope is only for users authorized for every brand
      if (!(await isBrandAuthorizedForUser(req.user, 'ALL'))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to view consolidated All-Region data.',
        });
      }

      req.scope = {
        isAll: true,
        brandId: 'ALL',
        brand: null,
        city: null,
        state: null,
        legacyCityFallback: false,
      };
      return next();
    }

    // Lookup brand by stable identifiers only (exact match, no user-controlled regex).
    let brandDoc = null;
    if (scopeParam.match(/^[0-9a-fA-F]{24}$/)) {
      brandDoc = await Brand.findById(scopeParam);
    }

    if (!brandDoc) {
      brandDoc = await Brand.findOne({
        $or: [{ brandId: scopeParam }, { code: scopeParam.toUpperCase() }],
      });
    }

    // Legacy: a city name resolves only when it identifies exactly one brand.
    if (!brandDoc) {
      const byCity = await Brand.find({ city: new RegExp(`^${escapeRegex(scopeParam)}$`, 'i') }).limit(2);
      if (byCity.length === 1) brandDoc = byCity[0];
    }

    if (!brandDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Brand/Region identifier. Option not found in authorized registry.',
      });
    }

    if (!(await isBrandAuthorizedForUser(req.user, brandDoc.brandId))) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You are not authorized to access records for brand/region "${brandDoc.name}" (${brandDoc.city}).`,
      });
    }

    // Sellers registered before brand assignment existed carry no brandId. They may be matched
    // by city only when this brand is the sole brand in that city; otherwise it is ambiguous.
    const brandsInCity = await Brand.countDocuments({
      city: new RegExp(`^${escapeRegex(brandDoc.city)}$`, 'i'),
    });

    req.scope = {
      isAll: false,
      brandId: brandDoc.brandId,
      brand: brandDoc,
      city: brandDoc.city,
      state: brandDoc.state,
      legacyCityFallback: brandsInCity === 1,
    };

    next();
  } catch (error) {
    console.error('[resolveBrandScope] Error:', error);
    next(error);
  }
};

/**
 * Scope Helpers for Controllers
 */

// Helper: Get City Regex (escaped; city text may originate from user-editable data)
export const getCityRegex = (city) => {
  if (!city) return null;
  return new RegExp(`^${escapeRegex(city.trim())}$`, 'i');
};

/**
 * Whether the authenticated user may access a brand ('ALL' = consolidated scope).
 * super_admin: every brand. admin: every brand unless the Admin document defines a non-empty
 * authorizedBrands list ('*' = all). Any other role is denied.
 */
export const isBrandAuthorizedForUser = async (user, brandId) => {
  if (!user) return false;
  const role = String(user.role || '').replace('-', '_');
  if (role === 'super_admin') return true;
  if (role !== 'admin') return false;
  let list = Array.isArray(user.authorizedBrands) ? user.authorizedBrands : null;
  if (!list && user.id) {
    const admin = await Admin.findById(user.id).select('authorizedBrands').lean().catch(() => null);
    list = Array.isArray(admin?.authorizedBrands) ? admin.authorizedBrands : null;
  }
  if (!list || list.length === 0 || list.includes('*')) return true;
  return brandId !== 'ALL' && list.includes(brandId);
};

/** Mongo filter selecting the sellers (stores) that belong to a scope. {} for consolidated scope. */
export const sellerScopeFilter = (scope) => {
  if (!scope || scope.isAll) return {};
  const or = [{ brandId: scope.brandId }];
  if (scope.brand?._id) or.push({ brand: scope.brand._id });
  if (scope.city && scope.legacyCityFallback) {
    or.push({
      $and: [
        { $or: [{ brandId: { $exists: false } }, { brandId: '' }, { brandId: null }] },
        { 'warehouseLocation.city': getCityRegex(scope.city) },
      ],
    });
  }
  return { $or: or };
};

/** In-memory equivalent of sellerScopeFilter for a loaded seller. Fails closed. */
export const sellerInScope = (scope, seller) => {
  if (!scope || scope.isAll) return true;
  if (!seller) return false;
  if (seller.brandId) return seller.brandId === scope.brandId;
  if (seller.brand && scope.brand?._id) return String(seller.brand) === String(scope.brand._id);
  return Boolean(
    scope.legacyCityFallback &&
      scope.city &&
      seller.warehouseLocation?.city &&
      getCityRegex(scope.city).test(seller.warehouseLocation.city)
  );
};

// Helper: Get all Seller IDs in the scoped brand
export const getScopedSellerIds = async (scope) => {
  if (!scope || scope.isAll) return null;
  const sellers = await Seller.find(sellerScopeFilter(scope)).select('_id phone businessName').lean();
  return sellers.map((s) => s._id);
};

// Helper: Get all Captain IDs in the scoped region
export const getScopedCaptainIds = async (scope) => {
  if (!scope || scope.isAll || !scope.city) return null;
  const captains = await Captain.find({
    city: getCityRegex(scope.city),
  }).select('_id phone name').lean();
  return captains.map((c) => c._id);
};
