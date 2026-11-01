/**
 * Resource-level authorisation helpers (IDOR protection). Authentication alone is never
 * treated as sufficient: every helper checks that the caller may touch the specific record.
 * Denials are reported as 404 by callers so record existence is not disclosed.
 */
import mongoose from 'mongoose';
import Seller from '../models/Seller.model.js';
import { resolveBrandScope, sellerInScope, canAccessAllBrands } from '../middleware/scopeMiddleware.js';

/** Sellers act on their own data; admins/super admins go through brand scope resolution. */
export const scopeUnlessSeller = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'admin' || role === 'super_admin') return resolveBrandScope(req, res, next);
  return next();
};

/** May the caller access this return request (seller owner, brand-scoped admin, or all-brand admin)? */
export const canAccessReturn = async (req, returnDoc) => {
  if (!returnDoc) return false;
  const role = req.user?.role;
  const sellerId = returnDoc.seller?._id || returnDoc.seller;
  if (role === 'seller') return Boolean(sellerId) && String(sellerId) === String(req.user.id);
  if (role === 'admin' || role === 'super_admin') {
    if (!sellerId) return !req.scope || req.scope.isAll;
    return canAccessSellerId(req, sellerId);
  }
  return false;
};

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

/** May the caller access the given seller record (by id)? */
export const canAccessSellerId = async (req, sellerId) => {
  const role = req.user?.role;
  if (role === 'seller') return String(sellerId) === String(req.user.id);
  if (role !== 'admin' && role !== 'super_admin') return false;
  const scope = req.scope;
  if (!scope || scope.isAll) return role === 'super_admin' || (await canAccessAllBrands(req.user));
  if (!isId(sellerId)) return false;
  const seller = await Seller.findById(sellerId).select('brandId brand warehouseLocation.city').lean();
  return sellerInScope(scope, seller);
};

/** May the caller access this product? Products inherit brand through their seller. */
export const canAccessProduct = async (req, product) => {
  if (!product) return false;
  const role = req.user?.role;
  if (role === 'seller') return Boolean(product.sellerId) && String(product.sellerId) === String(req.user.id);
  if (role !== 'admin' && role !== 'super_admin') return false;
  if (!product.sellerId) {
    // Platform-owned (no seller) products: only users with all-brand access.
    return role === 'super_admin' || (await canAccessAllBrands(req.user));
  }
  return canAccessSellerId(req, product.sellerId);
};
