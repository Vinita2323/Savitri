import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  ArrowLeft,
  Navigation,
  Globe,
  FileText,
  Clock,
  Sparkles,
  Sliders,
  Check,
  Compass,
  Layers,
  Save,
  Loader2,
  ChevronRight,
  Info
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';
import LocationSearchModal from '../../../components/LocationSearchModal';
import { MapService } from '../../../services/MapService';
import API from '../../../services/api';

const CATEGORIES = [
  'Apparel & Fashion',
  'Grocery & FMCG',
  'Electronics & Gadgets',
  'Retail Supermarket',
  'Beauty & Personal Care',
  'Home & Living',
  'Food & Beverages',
  'Logistics & Institutional Supply',
  'Multi-Category Marketplace',
  'Other'
];

const STATES = [
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Gujarat',
  'Uttar Pradesh',
  'Delhi',
  'Chhattisgarh',
  'Karnataka',
  'Other'
];

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;

export const CreateBrandPage = () => {
  const navigate = useNavigate();
  const { id: editBrandId } = useParams();
  const isEditMode = Boolean(editBrandId);

  const { createBrand, updateBrand, fetchBrands } = useSuperAdmin();

  // Form State
  const [formData, setFormData] = useState({
    // Section A: Business Identity
    name: '',
    shortName: '',
    code: '',
    category: 'Apparel & Fashion',
    description: '',
    logo: '/LogoSavitri.png',
    status: 'Active',

    // Section B: Operating Location & Radius
    country: 'India',
    state: 'Madhya Pradesh',
    city: '',
    locality: '',
    address: '',
    pincode: '',
    latitude: 22.7196,
    longitude: 75.8577,
    operatingRadiusKm: 25,

    // Section C: Business Contact
    contactPerson: '',
    contact: '',
    email: '',
    supportPhone: '',
    registeredOfficeAddress: '',
    sameAsOperatingAddress: true,
    website: '',

    // Section D: Legal & Compliance
    legalEntityName: '',
    gst: '',
    pan: '',
    businessRegistrationNumber: '',
    complianceStatus: 'Verified',

    // Section E: Operational Settings
    allowSellerRegistration: true,
    sellerApprovalMode: 'Manual Review',
    operatingHoursOpen: '09:00',
    operatingHoursClose: '21:00',
    operatingDays: 'Mon - Sun',
    operationalNotes: '',
  });

  const [loading, setLoading] = useState(false);
  const [fetchingExisting, setFetchingExisting] = useState(isEditMode);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Active section scrolling tracking
  const [activeSection, setActiveSection] = useState('identity');

  // Load existing brand data if in edit mode
  useEffect(() => {
    if (!isEditMode) return;
    setFetchingExisting(true);
    superAdminService.getBrandById(editBrandId)
      .then((res) => {
        if (res?.success && res.brand) {
          const b = res.brand;
          setFormData({
            name: b.name || '',
            shortName: b.shortName || '',
            code: b.code || '',
            category: b.category || 'Apparel & Fashion',
            description: b.description || '',
            logo: b.logo || '/LogoSavitri.png',
            status: b.status || 'Active',

            country: b.country || 'India',
            state: b.state || 'Madhya Pradesh',
            city: b.city || '',
            locality: b.locality || '',
            address: b.address || '',
            pincode: b.pincode || '',
            latitude: b.coordinates?.latitude || b.location?.coordinates?.[1] || 22.7196,
            longitude: b.coordinates?.longitude || b.location?.coordinates?.[0] || 75.8577,
            operatingRadiusKm: b.operatingRadiusKm !== undefined ? b.operatingRadiusKm : 25,

            contactPerson: b.contactPerson || '',
            contact: b.contact || '',
            email: b.email || '',
            supportPhone: b.supportPhone || '',
            registeredOfficeAddress: b.registeredOfficeAddress || '',
            sameAsOperatingAddress: !b.registeredOfficeAddress || b.registeredOfficeAddress === b.address,
            website: b.website || '',

            legalEntityName: b.legalEntityName || '',
            gst: b.gst || '',
            pan: b.pan || '',
            businessRegistrationNumber: b.businessRegistrationNumber || '',
            complianceStatus: b.complianceStatus || 'Verified',

            allowSellerRegistration: b.allowSellerRegistration !== false,
            sellerApprovalMode: b.sellerApprovalMode || 'Manual Review',
            operatingHoursOpen: b.operatingHours?.open || '09:00',
            operatingHoursClose: b.operatingHours?.close || '21:00',
            operatingDays: b.operatingHours?.days || 'Mon - Sun',
            operationalNotes: b.operationalNotes || '',
          });
        }
      })
      .catch((err) => {
        setErrorMsg('Failed to load existing brand details: ' + (err.message || ''));
      })
      .finally(() => setFetchingExisting(false));
  }, [editBrandId, isEditMode]);

  // Auto-generate brand code if not manually set
  const handleNameChange = (nameVal) => {
    setFormData((prev) => {
      const updates = { ...prev, name: nameVal };
      if (!isEditMode && (!prev.code || prev.code === prev._autoCode)) {
        const words = nameVal.trim().toUpperCase().split(/\s+/).filter(Boolean);
        const cityPart = (prev.city || 'IND').slice(0, 3).toUpperCase();
        let codeCandidate = '';
        if (words.length >= 2) {
          codeCandidate = `${words[0].slice(0, 2)}${words[1].slice(0, 1)}-${cityPart}`;
        } else if (words.length === 1) {
          codeCandidate = `${words[0].slice(0, 3)}-${cityPart}`;
        }
        updates.code = codeCandidate;
        updates._autoCode = codeCandidate;
      }
      return updates;
    });
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'address' && prev.sameAsOperatingAddress ? { registeredOfficeAddress: value } : {}),
    }));
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Handle Logo Upload (local preview + Cloudinary/Backend upload)
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size exceeds 5MB limit.');
      return;
    }

    // Immediate local base64 preview
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);

    // Try uploading to server
    try {
      setLogoUploading(true);
      const data = new FormData();
      data.append('image', file);
      const res = await API.post('/upload?folder=brands', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.success && res.data.imageUrl) {
        setFormData((prev) => ({ ...prev, logo: res.data.imageUrl }));
      }
    } catch {
      // Kept local base64 fallback
    } finally {
      setLogoUploading(false);
    }
  };

  // Location search modal handler
  const handleLocationConfirmed = (location) => {
    setIsMapModalOpen(false);
    if (!location) return;

    setFormData((prev) => ({
      ...prev,
      address: location.formattedAddress || location.address || prev.address,
      locality: location.area || location.locality || prev.locality,
      city: location.city || prev.city,
      state: location.state || prev.state,
      pincode: location.pincode || location.postalCode || prev.pincode,
      latitude: location.lat != null ? location.lat : prev.latitude,
      longitude: location.lng != null ? location.lng : prev.longitude,
      registeredOfficeAddress: prev.sameAsOperatingAddress
        ? location.formattedAddress || prev.registeredOfficeAddress
        : prev.registeredOfficeAddress,
    }));
  };

  // GPS auto-detect handler
  const handleDetectGPS = async () => {
    setGpsDetecting(true);
    setErrorMsg('');
    try {
      const coords = await MapService.getCurrentCoordinates();
      setFormData((prev) => ({
        ...prev,
        latitude: coords.latitude,
        longitude: coords.longitude,
      }));

      // Reverse geocode to extract address
      try {
        const details = await MapService.reverseGeocode(coords.latitude, coords.longitude);
        if (details) {
          setFormData((prev) => ({
            ...prev,
            address: details.formattedAddress || prev.address,
            city: details.city || prev.city,
            state: details.state || prev.state,
            locality: details.area || prev.locality,
            pincode: details.pincode || prev.pincode,
          }));
        }
      } catch {
        // Coords updated successfully even if reverse geocode failed
      }
    } catch (err) {
      alert(err.message || 'Unable to retrieve GPS coordinates.');
    } finally {
      setGpsDetecting(false);
    }
  };

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Brand name is required';
    if (!formData.code.trim()) errors.code = 'Brand code is required';
    else if (!/^[A-Z0-9_-]{2,16}$/.test(formData.code.trim())) {
      errors.code = 'Code must be 2-16 uppercase alphanumeric characters (e.g. FG-IND)';
    }

    if (!formData.city.trim()) errors.city = 'Operating city is required';
    if (!formData.address.trim()) errors.address = 'Operating address is required';

    if (formData.contact && !PHONE_REGEX.test(formData.contact.replace(/\D/g, '').slice(-10))) {
      errors.contact = 'Enter a valid 10-digit mobile number starting with 6-9';
    }

    if (formData.email && !EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Enter a valid business email address';
    }

    if (formData.gst && !GST_REGEX.test(formData.gst.trim())) {
      errors.gst = 'Enter a valid 15-character GSTIN (e.g. 23AABCF1234A1Z5)';
    }

    if (formData.pan && !PAN_REGEX.test(formData.pan.trim())) {
      errors.pan = 'Enter a valid 10-character PAN (e.g. AABCF1234A)';
    }

    if (formData.operatingRadiusKm < 1 || formData.operatingRadiusKm > 200) {
      errors.operatingRadiusKm = 'Operating radius must be between 1 and 200 km';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit Handler
  const handleSubmit = async (targetStatus = null) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!validateForm()) {
      setErrorMsg('Please resolve the highlighted validation errors before submitting.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      shortName: formData.shortName.trim() || formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      category: formData.category,
      description: formData.description.trim(),
      logo: formData.logo || '/LogoSavitri.png',
      status: targetStatus || formData.status,

      country: formData.country,
      state: formData.state,
      city: formData.city.trim(),
      locality: formData.locality.trim(),
      address: formData.address.trim(),
      pincode: formData.pincode.trim(),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      operatingRadiusKm: Number(formData.operatingRadiusKm),

      contactPerson: formData.contactPerson.trim(),
      contact: formData.contact.replace(/\D/g, '').slice(-10),
      email: formData.email.trim().toLowerCase(),
      supportPhone: formData.supportPhone.trim(),
      registeredOfficeAddress: formData.sameAsOperatingAddress
        ? formData.address.trim()
        : formData.registeredOfficeAddress.trim(),
      website: formData.website.trim(),

      legalEntityName: formData.legalEntityName.trim(),
      gst: formData.gst.trim().toUpperCase(),
      pan: formData.pan.trim().toUpperCase(),
      businessRegistrationNumber: formData.businessRegistrationNumber.trim(),
      complianceStatus: formData.complianceStatus,

      allowSellerRegistration: formData.allowSellerRegistration,
      sellerApprovalMode: formData.sellerApprovalMode,
      operatingHours: {
        open: formData.operatingHoursOpen,
        close: formData.operatingHoursClose,
        days: formData.operatingDays,
      },
      operationalNotes: formData.operationalNotes.trim(),
    };

    setLoading(true);
    try {
      let res;
      if (isEditMode) {
        res = await updateBrand(editBrandId, payload);
      } else {
        res = await createBrand(payload);
      }

      if (res.ok) {
        setSuccessMsg(
          isEditMode
            ? 'Brand details updated successfully in MongoDB.'
            : 'New Business Brand successfully created and persisted in MongoDB!'
        );
        await fetchBrands();
        setTimeout(() => {
          navigate('/super-admin/brands');
        }, 1500);
      } else {
        setErrorMsg(res.message || 'Failed to persist brand.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit brand data.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // Radial Area Calculation
  const estimatedCoverageArea = useMemo(() => {
    const r = Number(formData.operatingRadiusKm) || 25;
    return Math.round(Math.PI * r * r);
  }, [formData.operatingRadiusKm]);

  if (fetchingExisting) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#79B433]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      <SuperAdminHeader />

      {/* Top Banner Navigation */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/super-admin/brands"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-100"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  {isEditMode ? 'EDIT BRAND' : 'SUPER ADMIN TREASURY'}
                </span>
                <span className="text-xs font-semibold text-slate-400">/</span>
                <span className="text-xs font-semibold text-slate-600">Business Brands & Regional Hubs</span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                {isEditMode ? `Edit Brand: ${formData.name}` : 'Create Business Brand / व्यापार ब्रांड बनाएं'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/super-admin/brands')}
              className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-block"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('Draft')}
              disabled={loading}
              className="hidden rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 sm:inline-block"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(formData.status)}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border-none bg-[#79B433] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#689A2B] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving to MongoDB...
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isEditMode ? 'Update Brand' : 'Publish Brand'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Alerts */}
        {errorMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="flex-1">{errorMsg}</p>
            <button
              type="button"
              onClick={() => setErrorMsg('')}
              className="rounded p-1 text-rose-500 hover:bg-rose-100"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 shadow-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <p className="flex-1">{successMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Left Navigation Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <nav className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {[
                  { id: 'identity', label: '1. Business Identity', sub: 'Name, code, logo & category' },
                  { id: 'location', label: '2. Location & Radius', sub: 'Coordinates & coverage area' },
                  { id: 'contact', label: '3. Contact Details', sub: 'Phone, email & office address' },
                  { id: 'compliance', label: '4. Legal & Compliance', sub: 'GSTIN, PAN & registration' },
                  { id: 'operations', label: '5. Operational Rules', sub: 'Seller registrations & hours' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border-none p-3 text-left transition ${
                      activeSection === item.id
                        ? 'bg-emerald-50 text-[#1A2E0A] font-bold'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        activeSection === item.id ? 'bg-[#79B433] text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.id === 'identity' ? 'A' : item.id === 'location' ? 'B' : item.id === 'contact' ? 'C' : item.id === 'compliance' ? 'D' : 'E'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold leading-tight">{item.label}</p>
                      <p className="truncate text-[10px] text-slate-400">{item.sub}</p>
                    </div>
                  </button>
                ))}
              </nav>

              {/* Coverage Snapshot Box */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Compass className="h-4 w-4 text-[#79B433]" />
                  <span>Coverage Snapshot</span>
                </div>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Operating City:</span>
                    <span className="font-bold text-slate-800">{formData.city || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Service Radius:</span>
                    <span className="font-bold text-emerald-700">{formData.operatingRadiusKm} km</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500">Radial Footprint:</span>
                    <span className="font-bold text-slate-800">~{estimatedCoverageArea.toLocaleString()} km²</span>
                  </div>
                  <div className="flex justify-between pt-0.5">
                    <span className="text-slate-500">Seller Onboarding:</span>
                    <span className={`font-bold ${formData.allowSellerRegistration ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {formData.allowSellerRegistration ? 'Enabled' : 'Paused'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Fields */}
          <div className="space-y-8 lg:col-span-3">
            {/* SECTION A: BUSINESS IDENTITY */}
            <div id="identity" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Section A: Business Identity</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Core brand attributes, code identifier, logo, and marketplace classification.
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    IDENTITY
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* Logo Upload */}
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-2">
                    {formData.logo ? (
                      <img src={formData.logo} alt="Brand Logo" className="h-full w-full object-contain" />
                    ) : (
                      <Building2 className="h-8 w-8 text-slate-300" />
                    )}
                    {logoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                        <Loader2 className="h-5 w-5 animate-spin text-[#79B433]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Brand Logo / व्यापार लोगो</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      SVG, PNG, JPG, or WEBP (max 5MB). Rendered on Super Admin headers and store receipts.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                        <Upload size={14} />
                        <span>Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={logoUploading}
                        />
                      </label>
                      {formData.logo && formData.logo !== '/LogoSavitri.png' && (
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, logo: '/LogoSavitri.png' }))}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Brand Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Brand Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Fashion Gallary"
                      className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none transition ${
                        validationErrors.name
                          ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                          : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                      }`}
                    />
                    {validationErrors.name && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.name}</p>
                    )}
                  </div>

                  {/* Short Display Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Short / Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.shortName}
                      onChange={(e) => handleFieldChange('shortName', e.target.value)}
                      placeholder="e.g. Fashion Gallary (compact)"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                    <p className="mt-1 text-[10px] text-slate-400">Used in sidebar pills and notification toasts</p>
                  </div>

                  {/* Unique Brand Code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Unique Brand Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleFieldChange('code', e.target.value.toUpperCase())}
                      placeholder="e.g. FG-IND"
                      className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-wider outline-none transition ${
                        validationErrors.code
                          ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                          : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                      }`}
                    />
                    {validationErrors.code ? (
                      <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.code}</p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-400">Unique alphanumeric code (e.g. FG-IND, FH-BPL)</p>
                    )}
                  </div>

                  {/* Business Category */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Business Category <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#79B433]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Status */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Brand Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleFieldChange('status', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#79B433]"
                    >
                      <option value="Active">Active (Live in Scope Switcher)</option>
                      <option value="Draft">Draft (Hidden from Non-Admins)</option>
                      <option value="Inactive">Inactive (Suspended)</option>
                    </select>
                  </div>

                  {/* Brand Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">Business Description</label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Brief summary of this regional brand, retail cluster, or supply division..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION B: OPERATING LOCATION AND RADIUS */}
            <div id="location" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Section B: Operating Location & Service Radius
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Geographic center coordinates and radial boundaries for future seller registration scoping.
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    GEOGRAPHY & RADIUS
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* Location Picker Actions */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border-none bg-[#79B433] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#689A2B]"
                  >
                    <MapPin size={14} />
                    <span>Search Address / Pick on Map</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    disabled={gpsDetecting}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    {gpsDetecting ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-[#79B433]" />
                        <span>Detecting GPS...</span>
                      </>
                    ) : (
                      <>
                        <Navigation size={14} />
                        <span>Detect GPS Coordinates</span>
                      </>
                    )}
                  </button>

                  <span className="text-[11px] text-slate-500">
                    Multiple brands can operate in the same city with independent center coordinates.
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Operating City */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Operating City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      placeholder="e.g. Indore"
                      className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none transition ${
                        validationErrors.city
                          ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                          : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                      }`}
                    />
                    {validationErrors.city && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.city}</p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">State / राज्य</label>
                    <select
                      value={formData.state}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#79B433]"
                    >
                      {STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Locality / Area */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">Locality / Area</label>
                    <input
                      type="text"
                      value={formData.locality}
                      onChange={(e) => handleFieldChange('locality', e.target.value)}
                      placeholder="e.g. Sanwer Road Industrial Area"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  </div>

                  {/* Complete Operating Address */}
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Operating Hub Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      placeholder="e.g. 12 MG Road, Near Rajwada, Central Hub"
                      className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none transition ${
                        validationErrors.address
                          ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                          : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                      }`}
                    />
                    {validationErrors.address && (
                      <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.address}</p>
                    )}
                  </div>

                  {/* PIN Code */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700">PIN Code / पिन कोड</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => handleFieldChange('pincode', e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 452001"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  </div>
                </div>

                {/* Coordinates & Radius Range */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Hub Latitude (North)
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.latitude}
                        onChange={(e) => handleFieldChange('latitude', e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#79B433]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700">
                        Hub Longitude (East)
                      </label>
                      <input
                        type="number"
                        step="0.000001"
                        value={formData.longitude}
                        onChange={(e) => handleFieldChange('longitude', e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-800 outline-none focus:border-[#79B433]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          Operating Radius: <span className="text-[#1A2E0A]">{formData.operatingRadiusKm} km</span>
                        </label>
                        <span className="text-[10px] text-slate-400">1 - 100 km</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={formData.operatingRadiusKm}
                        onChange={(e) => handleFieldChange('operatingRadiusKm', Number(e.target.value))}
                        className="mt-2.5 w-full accent-[#79B433]"
                      />
                    </div>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-600">
                    Stored in MongoDB as GeoJSON coordinates: <code className="font-mono text-emerald-800">[{formData.longitude}, {formData.latitude}]</code> with a 2dsphere spatial index.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION C: BUSINESS CONTACT */}
            <div id="contact" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Section C: Business Contact Details</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Operations manager, dispatch contact, support phone, and official website.
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    CONTACT & SUPPORT
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Contact Person Name</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                    placeholder="e.g. Ramesh Sharma (Regional Lead)"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Official Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    placeholder="https://branddomain.com"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Primary Contact Number (10 digits)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={formData.contact}
                    onChange={(e) => handleFieldChange('contact', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 9876543210"
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none transition ${
                      validationErrors.contact
                        ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                    }`}
                  />
                  {validationErrors.contact && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.contact}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Support / Helpline Phone</label>
                  <input
                    type="tel"
                    value={formData.supportPhone}
                    onChange={(e) => handleFieldChange('supportPhone', e.target.value)}
                    placeholder="e.g. 1800-SAVITRI or 0731-4001234"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">Business Operations Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="ops@fashiongallary.in"
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none transition ${
                      validationErrors.email
                        ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                    }`}
                  />
                  {validationErrors.email && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.email}</p>
                  )}
                </div>

                {/* Registered Office Address */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Registered Corporate Office Address
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={formData.sameAsOperatingAddress}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormData((prev) => ({
                            ...prev,
                            sameAsOperatingAddress: checked,
                            registeredOfficeAddress: checked ? prev.address : '',
                          }));
                        }}
                        className="rounded accent-[#79B433]"
                      />
                      <span>Same as operating hub address</span>
                    </label>
                  </div>
                  {!formData.sameAsOperatingAddress && (
                    <textarea
                      rows={2}
                      value={formData.registeredOfficeAddress}
                      onChange={(e) => handleFieldChange('registeredOfficeAddress', e.target.value)}
                      placeholder="Enter legal / registered office address if different from operating hub..."
                      className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* SECTION D: LEGAL AND COMPLIANCE */}
            <div id="compliance" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Section D: Legal & Tax Compliance</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      GSTIN, PAN, corporate registration CIN, and compliance approval status.
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    TAX & GST
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Legal Registered Entity Name</label>
                  <input
                    type="text"
                    value={formData.legalEntityName}
                    onChange={(e) => handleFieldChange('legalEntityName', e.target.value)}
                    placeholder="e.g. Savitri Retail Private Limited"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Business CIN / Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.businessRegistrationNumber}
                    onChange={(e) => handleFieldChange('businessRegistrationNumber', e.target.value)}
                    placeholder="e.g. U74999MP2025PTC049102"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">GSTIN (15 characters)</label>
                  <input
                    type="text"
                    maxLength={15}
                    value={formData.gst}
                    onChange={(e) => handleFieldChange('gst', e.target.value.toUpperCase())}
                    placeholder="e.g. 23AABCF1234A1Z5"
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-mono font-bold uppercase outline-none transition ${
                      validationErrors.gst
                        ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                    }`}
                  />
                  {validationErrors.gst && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.gst}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">PAN (10 characters)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={formData.pan}
                    onChange={(e) => handleFieldChange('pan', e.target.value.toUpperCase())}
                    placeholder="e.g. AABCF1234A"
                    className={`mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs font-mono font-bold uppercase outline-none transition ${
                      validationErrors.pan
                        ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:border-rose-500'
                        : 'border-slate-200 text-slate-900 focus:border-[#79B433]'
                    }`}
                  />
                  {validationErrors.pan && (
                    <p className="mt-1 text-[11px] font-semibold text-rose-600">{validationErrors.pan}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Compliance Verification Status
                  </label>
                  <select
                    value={formData.complianceStatus}
                    onChange={(e) => handleFieldChange('complianceStatus', e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#79B433]"
                  >
                    <option value="Verified">Verified & Authorized (Full Platform Operations)</option>
                    <option value="Pending">Pending Audit (Limited Payouts)</option>
                    <option value="Rejected">Rejected Compliance (Suspended)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION E: OPERATIONAL SETTINGS */}
            <div id="operations" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Section E: Operational Settings & Seller Scoping
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Control future seller registration availability, approval workflows, and operating hours.
                    </p>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    SELLER SCOPING
                  </span>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* Seller Registration Toggle */}
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Allow New Seller Registrations for this Brand
                    </p>
                    <p className="text-[11px] text-slate-500">
                      When enabled, nearby sellers whose GPS address falls inside the {formData.operatingRadiusKm} km radius will be eligible to register under this brand.
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={formData.allowSellerRegistration}
                      onChange={(e) => handleFieldChange('allowSellerRegistration', e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#79B433] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Seller Registration Approval Workflow
                    </label>
                    <select
                      value={formData.sellerApprovalMode}
                      onChange={(e) => handleFieldChange('sellerApprovalMode', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#79B433]"
                    >
                      <option value="Manual Review">Manual Super Admin Review (Recommended)</option>
                      <option value="Automatic">Automatic Instant Approval</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Operating Days</label>
                    <input
                      type="text"
                      value={formData.operatingDays}
                      onChange={(e) => handleFieldChange('operatingDays', e.target.value)}
                      placeholder="e.g. Mon - Sun"
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Daily Opening Time</label>
                    <input
                      type="time"
                      value={formData.operatingHoursOpen}
                      onChange={(e) => handleFieldChange('operatingHoursOpen', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">Daily Closing Time</label>
                    <input
                      type="time"
                      value={formData.operatingHoursClose}
                      onChange={(e) => handleFieldChange('operatingHoursClose', e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Super Admin Operational Notes (Private)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.operationalNotes}
                      onChange={(e) => handleFieldChange('operationalNotes', e.target.value)}
                      placeholder="Internal audit notes, warehouse dispatch restrictions, partner contract IDs..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-[#79B433]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => navigate('/super-admin/brands')}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('Draft')}
                disabled={loading}
                className="rounded-xl border border-slate-300 bg-slate-100 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(formData.status)}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border-none bg-[#79B433] px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#689A2B] disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Brand to MongoDB...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{isEditMode ? 'Update Business Brand' : 'Create Business Brand'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Location Search Modal */}
      <LocationSearchModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelect={handleLocationConfirmed}
        title="Select Brand Operating Hub Location"
        placeholder="Search street, industrial area, landmark in Madhya Pradesh..."
        initialLocation={{
          address: formData.address,
          city: formData.city,
          state: formData.state,
          lat: formData.latitude,
          lng: formData.longitude,
        }}
      />
    </div>
  );
};

export default CreateBrandPage;
