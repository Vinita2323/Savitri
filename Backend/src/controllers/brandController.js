import mongoose from 'mongoose';
import Brand from '../models/Brand.model.js';
import Seller from '../models/Seller.model.js';
import Admin from '../models/Admin.model.js';
import { CityAdminError, readPerson, readStatus, readPermissions, createCityAdmin, shapeCityAdmin } from '../services/cityAdminService.js';
import { ensureBaselineBrands, canAccessAllBrands, isBrandAuthorizedForUser } from '../middleware/scopeMiddleware.js';
import { findEligibleBrands, countMisconfiguredBrands, listRegistrationCities, parseLatLng } from '../utils/brandEligibility.js';
import { normalizeCity } from '../utils/cityNormalization.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// The Create Brand form used to pre-fill Indore (22.7196, 75.8577). That point is only valid for an Indore brand.
const INDORE_DEFAULT = { lat: 22.7196, lng: 75.8577 };
const looksLikeUnsetIndoreDefault = (lat, lng, city) =>
  Math.abs(lat - INDORE_DEFAULT.lat) < 0.0005 &&
  Math.abs(lng - INDORE_DEFAULT.lng) < 0.0005 &&
  !/indore/i.test(String(city || ''));

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

    // Brand-restricted admins only see the brands they are assigned to.
    if (!(await canAccessAllBrands(req.user))) {
      filter.brandId = { $in: Array.isArray(req.user?.authorizedBrands) ? req.user.authorizedBrands : [] };
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
    // When nothing matches, tell the client whether that is because a brand's service area is not configured
    const misconfiguredBrands = brands.length === 0 ? await countMisconfiguredBrands(city) : 0;
    res.status(200).json({ success: true, count: brands.length, brands, city: normalizeCity(city), misconfiguredBrands });
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

    if (!brand || !(await isBrandAuthorizedForUser(req.user, brand.brandId))) {
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
    // Coordinates are mandatory: seller eligibility is decided by distance from this point, so a silent
    // default (the old Indore fallback) would make the brand unreachable for sellers in its real city.
    const hasValue = (v) => v !== undefined && v !== null && String(v).trim() !== '';
    if (!hasValue(latitude) || !hasValue(longitude)) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude of the brand operating centre are required. Pick the location on the map.' });
    }
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      return res.status(400).json({ success: false, message: 'Latitude must be a valid coordinate between -90 and 90.' });
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ success: false, message: 'Longitude must be a valid coordinate between -180 and 180.' });
    }

    if (looksLikeUnsetIndoreDefault(latNum, lngNum, city)) {
      return res.status(400).json({ success: false, message: `The coordinates are the default Indore location, but the brand city is "${city.trim()}". Select the real location on the map.` });
    }

    const radiusNum = operatingRadiusKm !== undefined ? Number(operatingRadiusKm) : 25;
    if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 200) {
      return res.status(400).json({ success: false, message: 'Operating radius must be between 1 and 200 kilometers.' });
    }

    const serviceCoverage = req.body.serviceCoverage === 'WHOLE_CITY' ? 'WHOLE_CITY' : 'RADIUS';

    // 4b. Optional City Admin, checked BEFORE the brand is created so a bad admin form never leaves a half-made brand
    const adminReq = req.body.cityAdmin && req.body.cityAdmin.mode === 'NOW' ? req.body.cityAdmin : null;
    let adminPlan = null;
    if (adminReq) {
      try {
        adminPlan = { person: readPerson(adminReq), status: readStatus(adminReq.status), permissions: readPermissions(adminReq.permissions) };
        const dup = await Admin.findOne({ $or: [{ email: adminPlan.person.email }, ...(adminPlan.person.username ? [{ username: adminPlan.person.username }] : [])] }).select('_id');
        if (dup) throw new CityAdminError(409, 'An admin with this email or username already exists. Use different details for the City Admin.');
      } catch (e) {
        if (e instanceof CityAdminError) return res.status(e.status).json({ success: false, message: `City Admin: ${e.message}` });
        throw e;
      }
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
      serviceCoverage,
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

    let cityAdmin = null;
    let temporaryPassword;
    if (adminPlan) {
      try {
        const created = await createCityAdmin({ brand: newBrand, person: adminPlan.person, status: adminPlan.status, permissions: adminPlan.permissions, actor: { id: req.user.id, name: req.user.name || req.user.email } });
        cityAdmin = shapeCityAdmin(created);
        if (adminPlan.person.temporary) temporaryPassword = adminPlan.person.password;
      } catch (e) {
        // the brand was created a moment ago and nothing uses it yet: remove it so the form can simply be corrected and sent again
        await Brand.deleteOne({ _id: newBrand._id }).catch(() => {});
        if (e instanceof CityAdminError) return res.status(e.status).json({ success: false, message: `City Admin: ${e.message} The brand was not created.` });
        throw e;
      }
    }

    res.status(201).json({
      success: true,
      message: cityAdmin ? 'Business Brand and its City Admin were created.' : 'Business Brand created successfully and persisted in MongoDB',
      brand: newBrand,
      cityAdmin,
      temporaryPassword,
      adminPending: !cityAdmin,
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

      const effectiveCity = updateData.city !== undefined ? updateData.city : existing.city;
      if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        return res.status(400).json({ success: false, message: 'Latitude and longitude must be valid coordinates.' });
      }
      if (looksLikeUnsetIndoreDefault(latNum, lngNum, effectiveCity)) {
        return res.status(400).json({ success: false, message: `The coordinates are the default Indore location, but the brand city is "${effectiveCity}". Select the real location on the map.` });
      }
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        updateData.coordinates = { latitude: latNum, longitude: lngNum };
        updateData.location = {
          type: 'Point',
          coordinates: [lngNum, latNum],
        };
      }
    }

    if (updateData.serviceCoverage !== undefined && !['RADIUS', 'WHOLE_CITY'].includes(updateData.serviceCoverage)) {
      return res.status(400).json({ success: false, message: 'Service coverage must be RADIUS or WHOLE_CITY.' });
    }

    if (updateData.operatingRadiusKm !== undefined) {
      const radiusNum = Number(updateData.operatingRadiusKm);
      if (isNaN(radiusNum) || radiusNum < 1 || radiusNum > 200) {
        return res.status(400).json({ success: false, message: 'Operating radius must be a number between 1 and 200 kilometers.' });
      }
      updateData.operatingRadiusKm = radiusNum;
    }

    const updated = await Brand.findByIdAndUpdate(existing._id, updateData, {
      new: true,
      runValidators: true,
    });

    // keep the City Admin's city in step with the brand's city (the brand record stays the source of truth)
    if (updated && String(updated.city || '') !== String(existing.city || '')) {
      const key = normalizeCity(updated.city) || String(updated.city || '').toLowerCase();
      await Admin.updateMany({ adminType: 'CITY_ADMIN', brandId: existing.brandId }, { $set: { city: updated.city || undefined, cityId: key || undefined } }).catch(() => {});
    }

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

    // The core (default) brand may be deleted too, but only through the same linked-records check below.

    // Permanent delete is only allowed when nothing is attached to this brand. Any record that carries this
    // brandId (sellers, employees, quotations, POS sales, challans, ...) would be orphaned, so we report what
    // blocks the delete instead of silently deactivating or breaking those records.
    const linked = [];
    for (const [modelName, model] of Object.entries(mongoose.models)) {
      if (modelName === 'Brand' || !model.schema.path('brandId')) continue;
      const count = await model.countDocuments({ brandId: brand.brandId });
      if (count > 0) linked.push({ model: modelName, count });
    }

    if (linked.length > 0) {
      const summary = linked.map((l) => `${l.count} ${l.model}`).join(', ');
      return res.status(409).json({
        success: false,
        code: 'BRAND_HAS_LINKED_DATA',
        message: `This brand cannot be permanently deleted because it still has linked records (${summary}). Move or remove them first, or deactivate the brand instead.`,
        linked,
      });
    }

    await Brand.findByIdAndDelete(brand._id);
    // Admins who were authorised for this brand no longer need the reference.
    if (mongoose.models.Admin) {
      // Admins who were limited to specific brands stay limited: removing their last brand must never turn into "all brands"
      await mongoose.models.Admin.updateMany({ authorizedBrands: { $all: [brand.brandId], $nin: ['*'] } }, { $set: { brandAccess: 'ASSIGNED' } });
      await mongoose.models.Admin.updateMany({ authorizedBrands: brand.brandId }, { $pull: { authorizedBrands: brand.brandId, exclusiveBrands: brand.brandId } });
    }

    res.status(200).json({
      success: true,
      message: 'Brand permanently deleted from MongoDB',
    });
  } catch (err) {
    next(err);
  }
};

