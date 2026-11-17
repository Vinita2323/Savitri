import mongoose from 'mongoose';
import Seller from '../models/Seller.model.js';
import Product from '../models/Product.model.js';
import { canAccessSellerId } from '../utils/accessControl.js';
import { validatePickupAddress } from '../utils/shippingValidation.js';

const pickupView = (seller) => {
  const a = seller.pickupAddress?.toObject ? seller.pickupAddress.toObject() : (seller.pickupAddress || {});
  const hasAddress = Boolean(a.addressLine1 && a.pincode);
  return {
    pickupAddress: hasAddress ? a : null,
    hasPickupAddress: hasAddress,
    isPickupAddressVerified: Boolean(seller.isPickupAddressVerified),
    pickupAddressStatus: seller.pickupAddressStatus || 'PENDING',
    pickupAddressUpdatedAt: seller.pickupAddressUpdatedAt || null,
  };
};

// @desc    Get my pickup address
// @route   GET /api/shipping/seller/pickup-address
export const getMyPickupAddress = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id).select('pickupAddress isPickupAddressVerified pickupAddressStatus pickupAddressUpdatedAt warehouseLocation phone ownerName');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    // Non-persisted suggestion so the form can be prefilled from the registered store details
    const wl = seller.warehouseLocation || {};
    res.json({
      success: true,
      ...pickupView(seller),
      suggestion: {
        contactPerson: seller.ownerName || '',
        phone: seller.phone || '',
        addressLine1: wl.storeAddress || '',
        city: wl.city || '',
        state: wl.state || '',
        pincode: wl.pincode || '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching pickup address' });
  }
};

// @desc    Add or update my pickup address (identity always comes from the token, never the body)
// @route   PUT /api/shipping/seller/pickup-address
export const upsertMyPickupAddress = async (req, res) => {
  try {
    const { errors, value } = validatePickupAddress(req.body || {});
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });

    const seller = await Seller.findById(req.user.id);
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });

    seller.pickupAddress = {
      ...value,
      latitude: value.latitude ?? null,
      longitude: value.longitude ?? null,
    };
    // Any change must be (re)verified by the platform; a seller can never set these.
    seller.isPickupAddressVerified = false;
    seller.pickupAddressStatus = 'PENDING';
    seller.pickupAddressUpdatedAt = new Date();
    await seller.save();

    res.json({ success: true, message: 'Pickup address saved. It will be reviewed before courier shipping is enabled.', ...pickupView(seller) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error saving pickup address' });
  }
};

// @desc    My shipping configuration summary
// @route   GET /api/shipping/seller/config
export const getMyShippingConfig = async (req, res) => {
  try {
    const seller = await Seller.findById(req.user.id).select('pickupAddress isPickupAddressVerified pickupAddressStatus pickupAddressUpdatedAt');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    const sid = new mongoose.Types.ObjectId(String(req.user.id));
    const [standardProducts, readyProducts, shippingEnabled] = await Promise.all([
      Product.countDocuments({ sellerId: sid, fulfillmentType: { $in: ['STANDARD', 'BOTH'] } }),
      Product.countDocuments({ sellerId: sid, shippingReady: true }),
      Product.countDocuments({ sellerId: sid, shippingEnabled: true }),
    ]);
    res.json({
      success: true,
      ...pickupView(seller),
      products: { standardOrBoth: standardProducts, shippingEnabled, shippingReady: readyProducts },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching shipping configuration' });
  }
};

// @desc    Admin: view a seller's pickup address (brand scoped; out-of-scope sellers are 404)
// @route   GET /api/shipping/admin/sellers/:sellerId/pickup-address
export const getSellerPickupAddressForAdmin = async (req, res) => {
  try {
    const { sellerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(sellerId) || !(await canAccessSellerId(req, sellerId))) {
      return res.status(404).json({ success: false, message: 'Seller not found' });
    }
    const seller = await Seller.findById(sellerId).select('businessName pickupAddress isPickupAddressVerified pickupAddressStatus pickupAddressUpdatedAt');
    if (!seller) return res.status(404).json({ success: false, message: 'Seller not found' });
    res.json({ success: true, sellerId, businessName: seller.businessName, ...pickupView(seller) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error fetching pickup address' });
  }
};
