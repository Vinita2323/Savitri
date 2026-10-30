import Brand from '../models/Brand.model.js';
import Seller from '../models/Seller.model.js';
import { ensureBaselineBrands } from '../middleware/scopeMiddleware.js';
import { findEligibleBrands, listRegistrationCities, parseLatLng } from '../utils/brandEligibility.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const getAllBrands = async (req, res, next) => {
  try {
    await ensureBaselineBrands();
    const { status, search, includeAll } = req.query;

    const filter = {};
    if (status && status !== 'ALL') {
      filter.status = status;
    } else if (includeAll !== 'true' && !req.user?.role?.includes('super_admin')) {
      // General frontend dropdown only shows Active brands by default
      filter.status = 'Active';
    }

    if (search) {
      const q = search.trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { shortName: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { city: { $regex: q, $options: 'i' } },
      ];
    }

    const brands = await Brand.find(filter)
      .sort({ isDefault: -1, status: 1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: brands.length,
      brands: brands.map((b) => ({
        id: b.brandId,
        _id: b._id,
        brandId: b.brandId,
        name: b.name,
        shortName: b.shortName || b.name,
        code: b.code,
        category: b.category || 'Apparel & Fashion',
        country: b.country || 'India',
        state: b.state || 'Madhya Pradesh',
        city: b.city,
        locality: b.locality || '',
        address: b.address || '',
        pincode: b.pincode || '',
        coordinates: b.coordinates || { latitude: 22.7196, longitude: 75.8577 },
        location: b.location || { type: 'Point', coordinates: [75.8577, 22.7196] },
        operatingRadiusKm: b.operatingRadiusKm !== undefined ? b.operatingRadiusKm : 25,
        contactPerson: b.contactPerson || '',
        contact: b.contact || '',
        email: b.email || '',
        supportPhone: b.supportPhone || '',
        registeredOfficeAddress: b.registeredOfficeAddress || '',
        website: b.website || '',
        legalEntityName: b.legalEntityName || '',
        gst: b.gst || '',
        pan: b.pan || '',
        businessRegistrationNumber: b.businessRegistrationNumber || '',
        complianceStatus: b.complianceStatus || 'Verified',
        allowSellerRegistration: b.allowSellerRegistration !== false,
        sellerApprovalMode: b.sellerApprovalMode || 'Manual Review',
        operatingHours: b.operatingHours || { open: '09:00', close: '21:00', days: 'Mon - Sun' },
        operationalNotes: b.operationalNotes || '',
        status: b.status || 'Active',
        logo: b.logo || '/LogoSavitri.png',
        description: b.description || '',
        isDefault: Boolean(b.isDefault),
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/brands/cities (public) — cities with at least one brand accepting registrations. */
export const getRegistrationCities = async (req, res, next) => {
  try {
    const cities = await listRegistrationCities();
    res.status(200).json({ success: true, count: cities.length, cities });
  } catch (err) {
    next(err);
  }
};

/** GET /api/brands/eligible?city=<city>&latitude=<lat>&longitude=<lng> (public, rate-limited) */
export const getEligibleBrands = async (req, res, next) => {
  try {
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    if (!city || city.length > 80) {
      return res.status(400).json({ success: false, message: 'A valid city is required.' });
    }
    const loc = parseLatLng(req.query.latitude, req.query.longitude);
    if (!loc) {
      return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
    }
    const brands = await findEligibleBrands(city, loc.lat, loc.lng);
    res.status(200).json({ success: true, count: brands.length, brands });
  } catch (err) {
    next(err);
  }
};

export const getBrandById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const brand = await Brand.findOne({
      $or: [{ brandId: id }, { code: id.toUpperCase() }, ...(isMongoId ? [{ _id: id }] : [])],
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    res.status(200).json({
      success: true,
      brand,
    });
  } catch (err) {
    next(err);
  }
};

export const createBrand = async (req, res, next) => {
  try {
    const {
      name,
      shortName,
      code,
      category,
      country,
      state,
      city,
      locality,
      address,
      pincode,
      latitude,
      longitude,
      operatingRadiusKm,
      contactPerson,
      contact,
      email,
      supportPhone,
      registeredOfficeAddress,
      website,
      legalEntityName,
      gst,
      pan,
      businessRegistrationNumber,
      complianceStatus,
      allowSellerRegistration,
      sellerApprovalMode,
      operatingHours,
      operationalNotes,
      status,
      logo,
      description,
    } = req.body;

    // 1. Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Brand name is required.' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Brand code is required.' });
    }
    if (!city || !city.trim()) {
      return res.status(400).json({ success: false, message: 'Operating city is required.' });
    }

    // 2. Validate clean code
    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '-');
    if (!/^[A-Z0-9_-]{2,16}$/.test(cleanCode)) {
      return res.status(400).json({
        success: false,
        message: 'Brand code must be 2-16 alphanumeric characters or hyphens (e.g. FG-IND).',
      });
    }

    const existingCode = await Brand.findOne({ code: cleanCode });
    if (existingCode) {
      return res.status(400).json({
        success: false,
        message: `Brand with code "${cleanCode}" already exists. Please choose a different code.`,
      });
    }

    // 3. Format & validate optional contact & compliance fields
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    if (cleanEmail && !EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid business email address.' });
    }

    const cleanContact = contact ? String(contact).replace(/\D/g, '').slice(-10) : '';
    if (contact && cleanContact && !PHONE_REGEX.test(cleanContact)) {
      return res.status(400).json({ success: false, message: 'Contact number must be a valid 10-digit mobile number starting with 6-9.' });
    }

    const cleanGst = gst ? gst.trim().toUpperCase() : '';
    if (cleanGst && !GST_REGEX.test(cleanGst)) {
      return res.status(400).json({ success: false, message: 'Invalid GSTIN format. Expected 15-character standard GST number (e.g. 23AABCF1234A1Z5).' });
    }

    const cleanPan = pan ? pan.trim().toUpperCase() : '';
    if (cleanPan && !PAN_REGEX.test(cleanPan)) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format. Expected 10-character standard PAN (e.g. AABCF1234A).' });
    }

    // 4. Validate coordinates & radius
    const latNum = latitude !== undefined && latitude !== null && latitude !== '' ? parseFloat(latitude) : 22.7196;
    const lngNum = longitude !== undefined && longitude !== null && longitude !== '' ? parseFloat(longitude) : 75.8577;

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return res.status(400).json({ success: false, message: 'Latitude must be a valid coordinate between -90 and 90.' });
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ success: false, message: 'Longitude must be a valid coordinate between -180 and 180.' });
    }

    const radiusNum = operatingRadiusKm !== undefined ? Number(operatingRadiusKm) : 25;
    if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 200) {
      return res.status(400).json({ success: false, message: 'Operating radius must be between 1 and 200 kilometers.' });
    }

    // 5. Generate stable brandId
    const brandId = `brand_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;

    const newBrand = await Brand.create({
      brandId,
      name: name.trim(),
      shortName: shortName && shortName.trim() ? shortName.trim() : name.trim(),
      code: cleanCode,
      category: category && category.trim() ? category.trim() : 'Apparel & Fashion',
      country: country && country.trim() ? country.trim() : 'India',
      state: state && state.trim() ? state.trim() : 'Madhya Pradesh',
      city: city.trim(),
      locality: locality ? locality.trim() : '',
      address: address ? address.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      coordinates: {
        latitude: latNum,
        longitude: lngNum,
      },
      location: {
        type: 'Point',
        coordinates: [lngNum, latNum], // GeoJSON order: [longitude, latitude]
      },
      operatingRadiusKm: radiusNum,
      contactPerson: contactPerson ? contactPerson.trim() : '',
      contact: cleanContact,
      email: cleanEmail,
      supportPhone: supportPhone ? String(supportPhone).trim() : '',
      registeredOfficeAddress: registeredOfficeAddress ? registeredOfficeAddress.trim() : '',
      website: website ? website.trim() : '',
      legalEntityName: legalEntityName ? legalEntityName.trim() : '',
      gst: cleanGst,
      pan: cleanPan,
      businessRegistrationNumber: businessRegistrationNumber ? businessRegistrationNumber.trim() : '',
      complianceStatus: ['Verified', 'Pending', 'Rejected'].includes(complianceStatus) ? complianceStatus : 'Verified',
      allowSellerRegistration: allowSellerRegistration !== false,
      sellerApprovalMode: sellerApprovalMode === 'Automatic' ? 'Automatic' : 'Manual Review',
      operatingHours: operatingHours || { open: '09:00', close: '21:00', days: 'Mon - Sun' },
      operationalNotes: operationalNotes ? operationalNotes.trim() : '',
      status: ['Active', 'Inactive', 'Draft'].includes(status) ? status : 'Active',
      logo: logo || '/LogoSavitri.png',
      description: description ? description.trim() : '',
      isDefault: false,
    });

    res.status(201).json({
      success: true,
      message: 'Business Brand created successfully and persisted in MongoDB',
      brand: newBrand,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A brand with this code or identifier already exists in MongoDB.',
      });
    }
    next(err);
  }
};

export const updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const existing = await Brand.findOne({
      $or: [{ brandId: id }, ...(isMongoId ? [{ _id: id }] : [])],
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found',
      });
    }

    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.brandId; // immutable identifier

    // If code is being changed, verify uniqueness
    if (updateData.code && updateData.code.trim().toUpperCase() !== existing.code) {
      const cleanCode = updateData.code.trim().toUpperCase().replace(/\s+/g, '-');
      const duplicate = await Brand.findOne({ code: cleanCode, _id: { $ne: existing._id } });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Brand with code "${cleanCode}" already exists.`,
        });
      }
      updateData.code = cleanCode;
    }

    // If coordinates are being updated, update both coordinates and GeoJSON location
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      const latNum = updateData.latitude !== undefined ? parseFloat(updateData.latitude) : existing.coordinates.latitude;
      const lngNum = updateData.longitude !== undefined ? parseFloat(updateData.longitude) : existing.coordinates.longitude;

      if (!isNaN(latNum) && !isNaN(lngNum)) {
        updateData.coordinates = { latitude: latNum, longitude: lngNum };
        updateData.location = {
          type: 'Point',
          coordinates: [lngNum, latNum],
        };
      }
    }

    if (updateData.operatingRadiusKm !== undefined) {
      const radiusNum = Number(updateData.operatingRadiusKm);
      if (!isNaN(radiusNum) && radiusNum >= 1 && radiusNum <= 200) {
        updateData.operatingRadiusKm = radiusNum;
      }
    }

    const updated = await Brand.findByIdAndUpdate(existing._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Brand updated successfully',
      brand: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleBrandStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const brand = await Brand.findOne({
      $or: [{ brandId: id }, ...(isMongoId ? [{ _id: id }] : [])],
    });

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    const newStatus = req.body.status || (brand.status === 'Active' ? 'Inactive' : 'Active');
    brand.status = newStatus;
    await brand.save();

    res.status(200).json({
      success: true,
      message: `Brand status changed to ${newStatus}`,
      brand,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    const brand = await Brand.findOne({
      $or: [{ brandId: id }, ...(isMongoId ? [{ _id: id }] : [])],
    });

    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }

    if (brand.isDefault) {
      return res.status(400).json({
        success: false,
        message: 'Default baseline brands cannot be deleted.',
      });
    }

    // Check if any sellers are associated
    const associatedSellers = await Seller.countDocuments({
      $or: [{ brandId: brand.brandId }, { 'address.city': brand.city }],
    });

    if (associatedSellers > 0) {
      // Soft-deactivate instead of hard delete to preserve financial and seller integrity
      brand.status = 'Inactive';
      await brand.save();
      return res.status(200).json({
        success: true,
        message: `Brand has ${associatedSellers} associated stores/sellers. To preserve historical records, the brand was deactivated rather than permanently removed.`,
        brand,
      });
    }

    await Brand.findByIdAndDelete(brand._id);

    res.status(200).json({
      success: true,
      message: 'Brand permanently deleted from MongoDB',
    });
  } catch (err) {
    next(err);
  }
};

