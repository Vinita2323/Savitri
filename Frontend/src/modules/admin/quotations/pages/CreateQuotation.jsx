import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Save,
  Send,
  Eye,
  RotateCcw,
  X,
  Upload,
  FileCheck,
  Building2,
  Calendar,
  Layers,
  Award,
  AlertCircle,
  FileUp,
  Paperclip,
  CheckCircle,
} from 'lucide-react';
import { useQuotations } from '../context/QuotationContext';
import {
  ORGANIZATION_TYPES,
  PAYMENT_TERMS_OPTIONS,
  DELIVERY_TIMELINES,
  PROCUREMENT_PORTALS,
  SAMPLE_PRODUCTS_CATALOG,
} from '../data/mockQuotations';
import {
  calculateQuotationSummary,
  generateNextQuotationNumber,
  formatINR,
  calculateLineItem,
} from '../utils/quotationCalculations';
import { QuotationItemsTable } from '../components/QuotationItemsTable';
import { OrganizationDetailsForm } from '../components/OrganizationDetailsForm';
import { QuotationSummary } from '../components/QuotationSummary';
import { QuotationPreviewModal } from '../components/QuotationPreviewModal';

export const CreateQuotation = ({ onNavigate }) => {
  const {
    quotations,
    addQuotation,
    updateQuotation,
    sendQuotation,
    prefillData,
    setPrefillData,
    editingQuotationId,
    setEditingQuotationId,
    getQuotationById,
  } = useQuotations();

  // Load existing quote if editing, or load prefill if from request, or create blank
  const existingQuote = useMemo(() => {
    if (editingQuotationId) return getQuotationById(editingQuotationId);
    return null;
  }, [editingQuotationId, getQuotationById]);

  // Form States
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [quotationType, setQuotationType] = useState('Government');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [assignedSeller, setAssignedSeller] = useState('Indore Central Fulfillment Hub (Savitri Platform)');

  // Buyer Details
  const [buyer, setBuyer] = useState({
    organizationName: '',
    organizationType: 'Government',
    department: '',
    contactPerson: '',
    designation: '',
    email: '',
    phone: '',
    gstin: '',
    pan: '',
    billingAddress: '',
    shippingAddress: '',
    city: 'Indore',
    state: 'Madhya Pradesh',
    pincode: '452001',
  });

  // Items
  const [items, setItems] = useState([
    calculateLineItem({
      id: 'item-1',
      name: SAMPLE_PRODUCTS_CATALOG[0].name,
      sku: SAMPLE_PRODUCTS_CATALOG[0].sku,
      description: SAMPLE_PRODUCTS_CATALOG[0].description,
      hsn: SAMPLE_PRODUCTS_CATALOG[0].hsn,
      quantity: 50,
      unit: SAMPLE_PRODUCTS_CATALOG[0].unit,
      unitPrice: SAMPLE_PRODUCTS_CATALOG[0].unitPrice,
      discountType: 'percentage',
      discountValue: 0,
      gstRate: SAMPLE_PRODUCTS_CATALOG[0].gstRate,
    }),
  ]);

  // Commercial Terms
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [shippingCharges, setShippingCharges] = useState(1000);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState(PAYMENT_TERMS_OPTIONS[2]);
  const [deliveryTimeline, setDeliveryTimeline] = useState(DELIVERY_TIMELINES[1]);
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState('Full lot purchase');
  const [priceValidity, setPriceValidity] = useState('30 Days from date of quotation issue');
  const [warrantyTerms, setWarrantyTerms] = useState('Standard 6-month shelf life guarantee from dispatch date');
  const [notesOnTaxes, setNotesOnTaxes] = useState('GST charged under applicable concessional rates for institutional supplies.');

  // Government Tender Info
  const [governmentInfo, setGovernmentInfo] = useState({
    department: '',
    tenderRefNumber: '',
    tenderId: '',
    procurementPortal: 'Government e-Marketplace (GeM)',
    submissionDeadline: '',
    requiredDocuments: [
      'GST Registration Certificate',
      'Valid FSSAI Food Business License',
      'Make in India Declaration',
    ],
    specialConditions: 'Liquidated damages of 0.5% per week of delay up to a maximum of 10%.',
    remarks: '',
  });

  // Attachments
  const [attachments, setAttachments] = useState([]);

  // Terms and Conditions
  const [termsAndConditions, setTermsAndConditions] = useState({
    payment: 'Payment shall be disbursed through Treasury PFMS / GeM Escrow within 30-45 days after verification of stock receipt.',
    delivery: 'Doorstep freight and unloading at specified store location included in quote.',
    validity: 'Rates quoted are firm and valid for acceptance within 30 calendar days.',
    taxes: 'Applicable GST as per current CBIC notifications is included in grand total breakdown.',
    cancellation: 'Order cancellation terms subject to standard B2B procurement contract conditions.',
    other: 'All supplied packages shall bear standard manufacturer labelling, batch numbers, and expiry dates.',
  });

  // Internal Notes
  const [internalNotes, setInternalNotes] = useState('');

  // Modals & Feedback
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Initialize data on mount or when editing/prefill changes
  useEffect(() => {
    if (existingQuote) {
      // Load from editing quote
      setQuotationNumber(existingQuote.quotationNumber);
      setQuotationDate(existingQuote.quotationDate || '');
      setValidUntil(existingQuote.validUntil || '');
      setQuotationType(existingQuote.quotationType || 'Government');
      setReferenceNumber(existingQuote.referenceNumber || '');
      setSubject(existingQuote.subject || '');
      setAssignedSeller(existingQuote.assignedSeller || '');
      setBuyer(existingQuote.buyer || buyer);
      setItems(existingQuote.items || items);
      setOverallDiscount(existingQuote.summary?.overallDiscount || 0);
      setShippingCharges(existingQuote.summary?.shippingCharges || 0);
      setAdditionalCharges(existingQuote.summary?.additionalCharges || 0);
      if (existingQuote.commercialTerms) {
        setPaymentTerms(existingQuote.commercialTerms.paymentTerms || paymentTerms);
        setDeliveryTimeline(existingQuote.commercialTerms.deliveryTimeline || deliveryTimeline);
        setDeliveryLocation(existingQuote.commercialTerms.deliveryLocation || '');
        setMinimumOrderQuantity(existingQuote.commercialTerms.minimumOrderQuantity || '');
        setPriceValidity(existingQuote.commercialTerms.priceValidity || '');
        setWarrantyTerms(existingQuote.commercialTerms.warrantyTerms || '');
        setNotesOnTaxes(existingQuote.commercialTerms.notesOnTaxes || '');
      }
      if (existingQuote.governmentInfo) {
        setGovernmentInfo(existingQuote.governmentInfo);
      }
      if (existingQuote.attachments) {
        setAttachments(existingQuote.attachments);
      }
      if (existingQuote.termsAndConditions) {
        setTermsAndConditions(existingQuote.termsAndConditions);
      }
      setInternalNotes(existingQuote.internalNotes || '');
    } else if (prefillData) {
      // Prefilled from an incoming RFQ
      setQuotationNumber(generateNextQuotationNumber(quotations));
      setQuotationType(prefillData.quotationType || 'Government');
      setReferenceNumber(prefillData.referenceNumber || '');
      setSubject(prefillData.subject || '');
      if (prefillData.buyer) {
        setBuyer(prefillData.buyer);
      }
      if (prefillData.items && prefillData.items.length > 0) {
        setItems(prefillData.items);
      }
      if (prefillData.commercialTerms?.deliveryLocation) {
        setDeliveryLocation(prefillData.commercialTerms.deliveryLocation);
      }
    } else {
      // Brand new quotation
      setQuotationNumber(generateNextQuotationNumber(quotations));
    }
  }, [existingQuote, prefillData, quotations]);

  // Sync quotationType with buyer.organizationType
  const handleQuotationTypeChange = (newType) => {
    setQuotationType(newType);
    setBuyer((prev) => ({ ...prev, organizationType: newType }));
  };

  // Live Summary Calculation
  const summary = useMemo(() => {
    return calculateQuotationSummary(
      items,
      overallDiscount,
      shippingCharges,
      additionalCharges,
      buyer.state
    );
  }, [items, overallDiscount, shippingCharges, additionalCharges, buyer.state]);

  // Construct complete quotation object
  const constructQuotationObject = (status = 'Draft') => {
    return {
      id: quotationNumber,
      quotationNumber,
      quotationDate,
      validUntil,
      quotationType,
      referenceNumber,
      subject,
      assignedSeller,
      status,
      originatingRequestId: prefillData?.originatingRequestId || null,
      buyer,
      items,
      summary,
      commercialTerms: {
        overallDiscount,
        shippingCharges,
        additionalCharges,
        paymentTerms,
        deliveryTimeline,
        deliveryLocation: deliveryLocation || buyer.shippingAddress,
        minimumOrderQuantity,
        priceValidity,
        warrantyTerms,
        notesOnTaxes,
      },
      governmentInfo: quotationType === 'Government' ? governmentInfo : null,
      attachments,
      termsAndConditions,
      internalNotes,
    };
  };

  // File Upload Handler (Frontend Only)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newAttachments = files.map((file) => ({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadDate: new Date().toISOString().split('T')[0],
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Validation
  const validateForm = () => {
    if (!buyer.organizationName.trim()) {
      setValidationError('Please provide the Buyer Organization Name.');
      return false;
    }
    if (!buyer.contactPerson.trim()) {
      setValidationError('Please specify the Contact Person.');
      return false;
    }
    if (!buyer.email.trim() || !buyer.phone.trim()) {
      setValidationError('Valid Buyer Email and Mobile Number are required.');
      return false;
    }
    if (!buyer.billingAddress.trim()) {
      setValidationError('Please enter the Billing Address.');
      return false;
    }
    if (items.length === 0 || !items.some((it) => it.name.trim() && it.quantity > 0)) {
      setValidationError('At least one product line item with quantity > 0 is required.');
      return false;
    }
    setValidationError('');
    return true;
  };

  // Save as Draft
  const handleSaveDraft = () => {
    if (!buyer.organizationName.trim()) {
      setValidationError('Please enter at least the Organization Name to save as draft.');
      return;
    }
    setValidationError('');

    const quoteData = constructQuotationObject('Draft');
    if (editingQuotationId) {
      updateQuotation(editingQuotationId, quoteData);
      setEditingQuotationId(null);
    } else {
      addQuotation(quoteData);
    }
    setPrefillData(null);
    onNavigate('quotations');
  };

  // Send Quotation
  const handleInitiateSend = () => {
    if (!validateForm()) return;
    setShowSendConfirm(true);
  };

  const handleConfirmSend = () => {
    setShowSendConfirm(false);
    const quoteData = constructQuotationObject('Sent');
    if (editingQuotationId) {
      updateQuotation(editingQuotationId, quoteData);
      setEditingQuotationId(null);
    } else {
      addQuotation(quoteData);
    }
    setPrefillData(null);
    onNavigate('quotations');
  };

  // Reset
  const handleResetForm = () => {
    setShowResetConfirm(false);
    setQuotationNumber(generateNextQuotationNumber(quotations));
    setQuotationType('Government');
    setReferenceNumber('');
    setSubject('');
    setBuyer({
      organizationName: '',
      organizationType: 'Government',
      department: '',
      contactPerson: '',
      designation: '',
      email: '',
      phone: '',
      gstin: '',
      pan: '',
      billingAddress: '',
      shippingAddress: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
    });
    setItems([
      calculateLineItem({
        id: 'item-1',
        name: SAMPLE_PRODUCTS_CATALOG[0].name,
        sku: SAMPLE_PRODUCTS_CATALOG[0].sku,
        description: SAMPLE_PRODUCTS_CATALOG[0].description,
        hsn: SAMPLE_PRODUCTS_CATALOG[0].hsn,
        quantity: 50,
        unit: SAMPLE_PRODUCTS_CATALOG[0].unit,
        unitPrice: SAMPLE_PRODUCTS_CATALOG[0].unitPrice,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: SAMPLE_PRODUCTS_CATALOG[0].gstRate,
      }),
    ]);
    setAttachments([]);
    setInternalNotes('');
    setEditingQuotationId(null);
    setPrefillData(null);
  };

  const currentQuotationForPreview = constructQuotationObject('Draft');

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#1A2E0A] text-[#F7941D]">
              <FileText size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                {editingQuotationId ? `Edit Draft — ${quotationNumber}` : 'Create Commercial Quotation'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Structured B2B pricing document builder for Government tenders, institutions, and private corporations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingQuotationId(null);
              setPrefillData(null);
              onNavigate('quotations');
            }}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            <Eye size={14} className="text-[#F7941D]" />
            <span>Preview Document</span>
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer border-none"
          >
            <Save size={14} />
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            onClick={handleInitiateSend}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-all cursor-pointer border-none shadow-xs"
          >
            <Send size={14} className="text-[#F7941D]" />
            <span>Send to Buyer</span>
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
          <button
            onClick={() => setValidationError('')}
            className="text-rose-500 hover:text-rose-700 border-none bg-transparent cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* FORM BODY */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* SECTION A: Basic Information */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-lg bg-[#1A2E0A] text-[#F7941D] flex items-center justify-center font-bold text-xs">
              A
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Basic Quotation Information
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quotation Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quotation Number <span className="text-slate-400 font-normal">(Auto)</span>
              </label>
              <input
                type="text"
                readOnly
                value={quotationNumber}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100/80 font-mono text-xs font-bold text-[#1A2E0A] outline-none"
              />
            </div>

            {/* Quotation Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quotation Issue Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={quotationDate}
                onChange={(e) => setQuotationDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800 outline-none focus:border-[#F7941D] focus:bg-white cursor-pointer"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Valid Until (Price Expiry) <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-rose-700 outline-none focus:border-[#F7941D] focus:bg-white cursor-pointer"
              />
            </div>

            {/* Quotation Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quotation Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={quotationType}
                onChange={(e) => handleQuotationTypeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-800 outline-none focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                {ORGANIZATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {/* Reference Number / RFQ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Reference No. / RFQ Number
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. RFQ-MP-HEALTH-2026-892"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
              />
            </div>

            {/* Subject / Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Quotation Subject / Title
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Annual Rate Contract for Institutional Grocery Supplies"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
              />
            </div>

            {/* Assigned Fulfillment Seller */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Assigned Supply Depot / Seller
              </label>
              <input
                type="text"
                value={assignedSeller}
                onChange={(e) => setAssignedSeller(e.target.value)}
                placeholder="e.g. Indore Central Fulfillment Hub"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* SECTION B: Buyer / Organization Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-[#1A2E0A] text-[#F7941D] flex items-center justify-center font-bold text-xs shrink-0">
                B
              </span>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Buyer & Client Information (Quotation Recipient)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Enter the details of the customer, institution, or organization to whom you are giving this quotation.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 w-fit shrink-0">
              Client / Buyer Details
            </span>
          </div>

          <OrganizationDetailsForm buyer={buyer} onChangeBuyer={setBuyer} />
        </div>

        {/* SECTION C: Product Items Dynamic Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-lg bg-[#1A2E0A] text-[#F7941D] flex items-center justify-center font-bold text-xs">
              C
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Product Items & Line Specifications
            </h3>
          </div>

          <QuotationItemsTable items={items} onChangeItems={setItems} />
        </div>

        {/* SECTION D: Pricing, Commercial Terms & Live Summary Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section D Form Fields (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="w-6 h-6 rounded-lg bg-[#1A2E0A] text-[#F7941D] flex items-center justify-center font-bold text-xs">
                D
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Commercial & Delivery Terms
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Payment Terms
                </label>
                <select
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 outline-none focus:border-[#F7941D] focus:bg-white cursor-pointer"
                >
                  {PAYMENT_TERMS_OPTIONS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Delivery Timeline
                </label>
                <select
                  value={deliveryTimeline}
                  onChange={(e) => setDeliveryTimeline(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-800 outline-none focus:border-[#F7941D] focus:bg-white cursor-pointer"
                >
                  {DELIVERY_TIMELINES.map((dl) => (
                    <option key={dl} value={dl}>
                      {dl}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Delivery Destination
                </label>
                <input
                  type="text"
                  value={deliveryLocation}
                  onChange={(e) => setDeliveryLocation(e.target.value)}
                  placeholder="Defaults to Buyer Shipping Address"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Minimum Order Quantity (MOQ)
                </label>
                <input
                  type="text"
                  value={minimumOrderQuantity}
                  onChange={(e) => setMinimumOrderQuantity(e.target.value)}
                  placeholder="e.g. Complete lot purchase"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Price Validity Period
                </label>
                <input
                  type="text"
                  value={priceValidity}
                  onChange={(e) => setPriceValidity(e.target.value)}
                  placeholder="e.g. 30 Days from date of quotation issue"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Warranty & Shelf Life Terms
                </label>
                <input
                  type="text"
                  value={warrantyTerms}
                  onChange={(e) => setWarrantyTerms(e.target.value)}
                  placeholder="e.g. Fresh batch guarantee minimum 6 months remaining"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Special Commercial Notes on Taxes & Levies
              </label>
              <textarea
                rows={2}
                value={notesOnTaxes}
                onChange={(e) => setNotesOnTaxes(e.target.value)}
                placeholder="e.g. GST charged under applicable concessional rates for institutional supplies."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white resize-none"
              />
            </div>
          </div>

          {/* Section D Live Summary Card (1 col) */}
          <div className="lg:col-span-1">
            <QuotationSummary
              summary={summary}
              overallDiscount={overallDiscount}
              onChangeOverallDiscount={setOverallDiscount}
              shippingCharges={shippingCharges}
              onChangeShippingCharges={setShippingCharges}
              additionalCharges={additionalCharges}
              onChangeAdditionalCharges={setAdditionalCharges}
            />
          </div>
        </div>

        {/* SECTION E: Government / Tender Information (Conditional) */}
        {quotationType === 'Government' && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                  E
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-blue-950">
                    Government Procurement & Tender Specifications
                  </h3>
                  <p className="text-[11px] text-blue-700">
                    Applies specifically to Public Sector, GeM, and Municipal Bidding
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                Govt Bid Mode
              </span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
              <strong>Notice on Public Procurement:</strong> Generating this quotation prepares verified pricing schedules and audit documentation for tender submission. It does not automatically file a bid on GeM or Central Public Procurement Portals without separate portal credentials.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                  Procurement Portal
                </label>
                <select
                  value={governmentInfo.procurementPortal}
                  onChange={(e) =>
                    setGovernmentInfo({ ...governmentInfo, procurementPortal: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white text-xs font-semibold text-slate-800 outline-none focus:border-[#F7941D]"
                >
                  {PROCUREMENT_PORTALS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                  Tender / Bid Reference No.
                </label>
                <input
                  type="text"
                  value={governmentInfo.tenderRefNumber}
                  onChange={(e) =>
                    setGovernmentInfo({ ...governmentInfo, tenderRefNumber: e.target.value })
                  }
                  placeholder="e.g. TDR/MP/HEALTH/2026/0892"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white font-mono text-xs font-bold text-slate-900 outline-none focus:border-[#F7941D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                  Tender ID / GeM Bid ID
                </label>
                <input
                  type="text"
                  value={governmentInfo.tenderId}
                  onChange={(e) => setGovernmentInfo({ ...governmentInfo, tenderId: e.target.value })}
                  placeholder="e.g. GEM/2026/B/8942189"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white font-mono text-xs font-bold text-slate-900 outline-none focus:border-[#F7941D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                  Bid Submission Deadline
                </label>
                <input
                  type="datetime-local"
                  value={governmentInfo.submissionDeadline}
                  onChange={(e) =>
                    setGovernmentInfo({ ...governmentInfo, submissionDeadline: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white text-xs font-medium text-slate-800 outline-none focus:border-[#F7941D] cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                  Special Procurement & Liquidated Damage Conditions
                </label>
                <textarea
                  rows={2}
                  value={governmentInfo.specialConditions}
                  onChange={(e) =>
                    setGovernmentInfo({ ...governmentInfo, specialConditions: e.target.value })
                  }
                  placeholder="Penalty clauses, inspection terms, EMD requirements..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                  Procurement Remarks / Bid Strategy
                </label>
                <textarea
                  rows={2}
                  value={governmentInfo.remarks}
                  onChange={(e) => setGovernmentInfo({ ...governmentInfo, remarks: e.target.value })}
                  placeholder="Notes on L1 qualification criteria, competitor pricing..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION F: Attachments */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-lg bg-[#1A2E0A] text-[#F7941D] flex items-center justify-center font-bold text-xs">
              F
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Supporting Documents & Attachments
            </h3>
          </div>

          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center space-y-2">
            <div className="flex justify-center text-slate-400">
              <FileUp size={32} />
            </div>
            <div>
              <label className="inline-block px-4 py-2 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold cursor-pointer transition-colors">
                Select Files to Attach
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Supported file types: PDF, DOCX, XLSX, JPG, PNG (Max 10 MB per file • Mock Client Storage)
            </p>
          </div>

          {attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
              {attachments.map((file, fIdx) => (
                <div
                  key={fIdx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Paperclip size={14} className="text-[#F7941D] shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-slate-800 truncate block">{file.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{file.size}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(fIdx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer border-none bg-transparent"
                    title="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION G: Terms and Conditions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <span className="w-6 h-6 rounded-lg bg-[#1A2E0A] text-[#F7941D] flex items-center justify-center font-bold text-xs">
              G
            </span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
              Contract Terms & Conditions
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment & Credit Terms Clause
              </label>
              <textarea
                rows={2}
                value={termsAndConditions.payment}
                onChange={(e) =>
                  setTermsAndConditions({ ...termsAndConditions, payment: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 outline-none focus:border-[#F7941D] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Delivery & Freight Clause
              </label>
              <textarea
                rows={2}
                value={termsAndConditions.delivery}
                onChange={(e) =>
                  setTermsAndConditions({ ...termsAndConditions, delivery: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 outline-none focus:border-[#F7941D] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Taxes, Levies & Statutory Duties
              </label>
              <textarea
                rows={2}
                value={termsAndConditions.taxes}
                onChange={(e) =>
                  setTermsAndConditions({ ...termsAndConditions, taxes: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 outline-none focus:border-[#F7941D] resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cancellation & Revision Policy
              </label>
              <textarea
                rows={2}
                value={termsAndConditions.cancellation}
                onChange={(e) =>
                  setTermsAndConditions({ ...termsAndConditions, cancellation: e.target.value })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-800 outline-none focus:border-[#F7941D] resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION H: Internal Notes (Admin-Only) */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/30 p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-amber-200 pb-3">
            <span className="w-6 h-6 rounded-lg bg-[#F7941D] text-white flex items-center justify-center font-bold text-xs">
              H
            </span>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Internal Administrative Remarks & Margin Notes
              </h3>
              <p className="text-[11px] text-amber-700 font-semibold">
                Private internal field — NEVER visible to client or printed on official quotation
              </p>
            </div>
          </div>

          <textarea
            rows={3}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Confidential margin estimates, supplier quotes, client negotiation limits, internal sales commission notes..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 bg-white text-xs font-medium text-slate-900 outline-none focus:border-[#F7941D] resize-none"
          />
        </div>

        {/* Form Actions Footer Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm sticky bottom-3 z-20">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            <RotateCcw size={14} />
            <span>Reset Form</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingQuotationId(null);
                setPrefillData(null);
                onNavigate('quotations');
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              <Eye size={15} className="text-[#F7941D]" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer border-none"
            >
              <Save size={15} />
              <span>Save as Draft</span>
            </button>
            <button
              type="button"
              onClick={handleInitiateSend}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-colors cursor-pointer border-none shadow-xs"
            >
              <Send size={15} className="text-[#F7941D]" />
              <span>Send Quotation</span>
            </button>
          </div>
        </div>
      </form>

      {/* Confirmation Modal: Send Quotation */}
      {showSendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 font-sans">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Send size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Send Quotation to Buyer?</h3>
                <p className="text-xs text-slate-500">
                  {buyer.organizationName} • {formatINR(summary.grandTotal)}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will finalize quotation <strong>{quotationNumber}</strong>, set its status to <strong>Sent</strong>, and dispatch it to the buyer at <strong>{buyer.email}</strong>.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSendConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Back to Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                className="px-4 py-2 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold cursor-pointer border-none"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Reset Form */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 font-sans">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-50 text-[#F7941D]">
                <RotateCcw size={20} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Reset Entire Form?</h3>
                <p className="text-xs text-slate-500">Unsaved changes will be cleared</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to reset this form? All entered organization data, custom line items, and commercial notes will be cleared back to defaults.
            </p>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer border-none"
              >
                Yes, Reset Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Preview Modal */}
      <QuotationPreviewModal
        quotation={currentQuotationForPreview}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onSend={() => {
          setPreviewOpen(false);
          handleInitiateSend();
        }}
      />
    </div>
  );
};
