/**
 * POS for a brand-restricted admin: a bill may only use stores (sellers) and products of the selected brand, and held bills
 * of other brands cannot be opened, overwritten or deleted. Unrestricted admins and the Super Admin are not affected.
 * Runs after resolveBrandScope + markRestrictedAdmin; sets req.posSellerIds for the controllers' list filters.
 */
import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import PosSale from '../models/PosSale.model.js';
import { brandSellerIds, includesId } from '../utils/restrictedAdmin.js';

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));
const deny = (res, message) => res.status(403).json({ success: false, code: 'BRAND_FORBIDDEN', message });

export const posBrandGuard = async (req, res, next) => {
  try {
    if (!req.restricted) {
      // a Super Admin (or all-brand admin) with one brand selected sees that brand's held bills and totals
      if (req.scope && !req.scope.isAll) req.posSellerIds = await brandSellerIds(req);
      return next();
    }
    const sellerIds = await brandSellerIds(req);
    req.posSellerIds = sellerIds;

    // every product named in the bill (either field name) must belong to a store of this brand
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const productIds = [...new Set(items.flatMap((it) => [it?.productId, it?.product]).filter(Boolean).map((v) => String(v?._id || v)))];
    if (productIds.length) {
      if (!productIds.every(isId)) return deny(res, 'A product on this bill is not part of your brand.');
      const mine = await Product.countDocuments({ _id: { $in: productIds }, sellerId: { $in: sellerIds } });
      if (mine !== productIds.length) return deny(res, 'A product on this bill is not part of your brand.');
    }

    // creating or holding a bill: it must be for one of this brand's stores
    if (req.method === 'POST' && ['/counter-sale', '/delivery-order', '/hold'].includes(req.path)) {
      const storeId = req.body?.store?.storeId || req.body?.store?.id;
      if (!isId(storeId) || !includesId(sellerIds, storeId)) return deny(res, 'Select a store of your brand for this bill.');
      req.body.store.storeId = String(storeId);
    }
    // overwriting a saved bill: only a held bill of this brand
    if (req.method === 'POST' && req.path === '/hold' && req.body?.id) {
      const existing = isId(req.body.id) ? await PosSale.findById(req.body.id).select('store status').lean() : null;
      if (existing && (!includesId(sellerIds, existing.store?.storeId) || !['HELD', 'DRAFT'].includes(existing.status))) return deny(res, 'That bill cannot be changed.');
    }
    const requestedStore = req.query?.storeId;
    if (requestedStore && !includesId(sellerIds, requestedStore)) return deny(res, 'That store is not part of your brand.');
    return next();
  } catch (error) {
    return next(error);
  }
};
