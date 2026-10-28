import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Percent,
  IndianRupee,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Loader2,
  X,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useProformaInvoice } from '../context/ProformaInvoiceContext';
import { useQuotations } from '../../quotations/context/QuotationContext';
import proformaInvoiceService from '../../../../services/proformaInvoiceService';
import { calculateProformaSummary, formatINR, formatDate } from '../utils/proformaCalculations';

const GST_RATES = [
  { label: '0% (Exempt)', value: 0 },
  { label: '5% (Essential Goods)', value: 5 },
  { label: '12% (Concessional)', value: 12 },
  { label: '18% (Standard Rate)', value: 18 },
  { label: '28% (Luxury Goods)', value: 28 },
];

const UNIT_OPTIONS = ['Units', 'Pcs', 'Kg', 'Litre', 'Box', 'Pack', 'Set', 'Carton', 'Ton', 'Meter'];

export const CreateProformaInvoice = ({ onNavigate }) => {
  const { createInvoice } = useProformaInvoice();

  // Quotation Context access with graceful fallback to localStorage
  let quotationCtx = null;
  try {
    quotationCtx = useQuotations();
  } catch {
    quotationCtx = null;
  }

  // Synchronize local quotations from localStorage
  const [localQuotations, setLocalQuotations] = useState(() => {
    try {
      const raw = localStorage.getItem('savitri_mock_quotations');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const raw = localStorage.getItem('savitri_mock_quotations');
        setLocalQuotations(raw ? JSON.parse(raw) : []);
      } catch {
        setLocalQuotations([]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Actual reactive quotations array
  const availableQuotations = useMemo(() => {
    if (quotationCtx?.quotations !== undefined && quotationCtx?.quotations !== null) {
      return quotationCtx.quotations;
    }
    return localQuotations;
  }, [quotationCtx?.quotations, localQuotations]);

  // Mode: 'quotation' or 'manual'
  const [creationMode, setCreationMode] = useState('quotation');

  // Searchable dropdown state for Option A
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [quotationSearch, setQuotationSearch] = useState('');
  const [selectedQuotationId, setSelectedQuotationId] = useState('');
  const dropdownRef = useRef(null);

  // Available clients & products for Option B
  const [clientList, setClientList] = useState([]);
  const [productList, setProductList] = useState([]);

  // Form States
  const [proformaNumber, setProformaNumber] = useState('');
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [currency, setCurrency] = useState('INR');

  // Client Details
  const [clientSnapshot, setClientSnapshot] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    billingAddress: {
      fullName: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
      country: 'India',
    },
    shippingAddress: {
      fullName: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      landmark: '',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
      country: 'India',
    },
  });

  // Reference Links
  const [referenceQuotation, setReferenceQuotation] = useState({
    quotationNumber: '',
    quotationId: '',
    quotationDate: null,
  });
  const [referenceOrderNumber, setReferenceOrderNumber] = useState('');

  // Line items
  const [items, setItems] = useState([
    {
      id: 'item-1',
      name: '',
      description: '',
      sku: '',
      hsn: '',
      quantity: 1,
      unit: 'Units',
      unitPrice: 0,
      discountType: 'percentage',
      discountValue: 0,
      gstRate: 18,
    },
  ]);

  // Overall adjustments
  const [overallDiscount, setOverallDiscount] = useState(0);
  const [shippingCharges, setShippingCharges] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [advancePercentage, setAdvancePercentage] = useState(50);
  const [manualAdvanceAmount, setManualAdvanceAmount] = useState('');

  // Commercial terms
  const [paymentTerms, setPaymentTerms] = useState(
    '50% Advance with Purchase Order, 50% prior to dispatch'
  );
  const [deliveryTerms, setDeliveryTerms] = useState(
    'Door Delivery within 7-10 working days upon realization of advance payment'
  );
  const [notes, setNotes] = useState(
    'Thank you for your commercial inquiry. Please remit the advance payment to our current account to initiate priority fulfillment.'
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. This is a Proforma Invoice and represents a commercial quotation / preliminary demand note. It is NOT a tax invoice under Section 31 of CGST Act, 2017.\n2. Goods allocation and dispatch will be initiated strictly upon receipt of advance payment.\n3. Quoted prices and tax rates are firm until the validity date indicated above.\n4. Official GST Tax Invoice will be issued upon dispatch of goods.\n5. Jurisdiction: Subject to Indore (MP) courts only.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);

  // Initialize next number and lookup data safely
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [numRes, clientRes, prodRes] = await Promise.allSettled([
          proformaInvoiceService.getNextProformaNumber(),
          proformaInvoiceService.getClients(),
          proformaInvoiceService.getProducts(),
        ]);

        if (numRes.status === 'fulfilled' && numRes.value?.proformaNumber) {
          setProformaNumber(numRes.value.proformaNumber);
        } else {
          setProformaNumber(`PI-${new Date().getFullYear()}-0001`);
        }

        if (clientRes.status === 'fulfilled' && clientRes.value?.clients) {
          setClientList(clientRes.value.clients);
        }

        if (prodRes.status === 'fulfilled' && prodRes.value?.products) {
          setProductList(prodRes.value.products);
        }
      } catch {
        setProformaNumber(`PI-${new Date().getFullYear()}-0001`);
      }
    };

    fetchInitialData();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered quotations based on search query
  const filteredQuotations = useMemo(() => {
    if (!quotationSearch.trim()) return availableQuotations;
    const term = quotationSearch.toLowerCase().trim();
    return availableQuotations.filter((q) => {
      const qNum = (q.quotationNumber || q.id || '').toLowerCase();
      const orgName = (q.buyer?.organizationName || q.buyer?.companyName || '').toLowerCase();
      const contact = (q.buyer?.contactPerson || '').toLowerCase();
      return qNum.includes(term) || orgName.includes(term) || contact.includes(term);
    });
  }, [availableQuotations, quotationSearch]);

  // Handle Option A Quotation Selection & Complete Auto-Population
  const handleSelectQuotation = (quote) => {
    if (!quote) return;

    setSelectedQuotationId(quote.id || quote._id || quote.quotationNumber);
    setIsDropdownOpen(false);
    setQuotationSearch('');

    const buyer = quote.buyer || {};
    const buyerBilling = buyer.billingAddress || '';
    const buyerShipping = buyer.shippingAddress || '';

    // Auto-fill Client Details from Quotation
    setClientSnapshot({
      companyName: buyer.organizationName || buyer.companyName || '',
      contactPerson: buyer.contactPerson || '',
      phone: buyer.phone || '',
      email: buyer.email || '',
      gstin: buyer.gstin || '',
      pan: buyer.pan || '',
      billingAddress: {
        fullName: buyer.contactPerson || buyer.organizationName || '',
        phone: buyer.phone || '',
        email: buyer.email || '',
        addressLine1: typeof buyerBilling === 'string' ? buyerBilling : buyerBilling.addressLine1 || buyerBilling.street || '',
        addressLine2: buyerBilling.addressLine2 || '',
        landmark: buyerBilling.landmark || '',
        city: buyer.city || buyerBilling.city || 'Indore',
        state: buyer.state || buyerBilling.state || 'Madhya Pradesh',
        pincode: buyer.pincode || buyerBilling.pincode || '452001',
        country: 'India',
      },
      shippingAddress: {
        fullName: buyer.contactPerson || buyer.organizationName || '',
        phone: buyer.phone || '',
        email: buyer.email || '',
        addressLine1: typeof buyerShipping === 'string'
          ? (buyerShipping || (typeof buyerBilling === 'string' ? buyerBilling : ''))
          : buyerShipping.addressLine1 || buyerShipping.street || (typeof buyerBilling === 'string' ? buyerBilling : ''),
        addressLine2: buyerShipping.addressLine2 || '',
        landmark: buyerShipping.landmark || '',
        city: buyer.city || buyerShipping.city || 'Indore',
        state: buyer.state || buyerShipping.state || 'Madhya Pradesh',
        pincode: buyer.pincode || buyerShipping.pincode || '452001',
        country: 'India',
      },
    });

    // Store linked reference WITHOUT modifying original quotation
    setReferenceQuotation({
      quotationNumber: quote.quotationNumber || quote.id,
      quotationId: quote.id || quote._id,
      quotationDate: quote.quotationDate || quote.createdAt,
    });

    // Clean replacement of line items (no stale rows left over)
    if (quote.items && Array.isArray(quote.items) && quote.items.length > 0) {
      const mappedItems = quote.items.map((it, idx) => ({
        id: `quote-item-${idx + 1}-${Date.now()}`,
        name: it.name || it.productName || '',
        description: it.description || '',
        sku: it.sku || '',
        hsn: it.hsn || it.hsnCode || '',
        quantity: Math.max(1, Number(it.quantity) || 1),
        unit: it.unit || 'Units',
        unitPrice: Number(it.unitPrice || it.rate || it.price) || 0,
        discountType: it.discountType || 'percentage',
        discountValue: Number(it.discountValue || it.discount) || 0,
        gstRate: Number(it.gstRate ?? it.taxRate ?? 18),
      }));
      setItems(mappedItems);
    } else {
      setItems([
        {
          id: `item-1`,
          name: '',
          description: '',
          sku: '',
          hsn: '',
          quantity: 1,
          unit: 'Units',
          unitPrice: 0,
          discountType: 'percentage',
          discountValue: 0,
          gstRate: 18,
        },
      ]);
    }

    // Populate commercial adjustments
    const overallDisc = Number(quote.summary?.overallDiscount ?? quote.commercialTerms?.overallDiscount) || 0;
    const shippingChg = Number(quote.summary?.shippingCharges ?? quote.commercialTerms?.shippingCharges) || 0;
    const addChg = Number(quote.summary?.additionalCharges ?? quote.commercialTerms?.additionalCharges) || 0;
    const advPct = Number(quote.commercialTerms?.advancePercentage) || 50;

    setOverallDiscount(overallDisc);
    setShippingCharges(shippingChg);
    setAdditionalCharges(addChg);
    setAdvancePercentage(advPct);

    // Terms & notes
    if (quote.commercialTerms?.paymentTerms) {
      setPaymentTerms(quote.commercialTerms.paymentTerms);
    }
    if (quote.commercialTerms?.deliveryTimeline || quote.commercialTerms?.deliveryTerms) {
      setDeliveryTerms(quote.commercialTerms.deliveryTimeline || quote.commercialTerms.deliveryTerms);
    }
    if (quote.commercialTerms?.notesOnTaxes || quote.commercialTerms?.remarks || quote.subject) {
      setNotes(
        quote.commercialTerms?.notesOnTaxes ||
        quote.commercialTerms?.remarks ||
        `Quotation subject: ${quote.subject}`
      );
    }
    if (quote.validUntil) {
      setValidUntil(quote.validUntil);
    }
  };

  // Unlink / clear selected quotation
  const handleUnlinkQuotation = () => {
    setSelectedQuotationId('');
    setReferenceQuotation({ quotationNumber: '', quotationId: '', quotationDate: null });
  };

  // Option B Client Selection
  const handleSelectClient = (clientId) => {
    if (!clientId) return;
    const client = clientList.find((c) => c._id === clientId);
    if (!client) return;

    setClientSnapshot({
      companyName: client.companyName || client.name,
      contactPerson: client.name || '',
      phone: client.phone || '',
      email: client.email || '',
      gstin: client.gstin || '',
      pan: client.pan || '',
      billingAddress: client.billingAddress || clientSnapshot.billingAddress,
      shippingAddress: client.shippingAddress || clientSnapshot.shippingAddress,
    });
  };

  // Handle Item Row Mutation
  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        name: '',
        description: '',
        sku: '',
        hsn: '',
        quantity: 1,
        unit: 'Units',
        unitPrice: 0,
        discountType: 'percentage',
        discountValue: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index, productObj) => {
    if (!productObj) return;
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        name: productObj.name,
        sku: productObj.sku || '',
        hsn: productObj.hsn || '',
        unit: productObj.unit || 'Units',
        unitPrice: productObj.unitPrice || 0,
        gstRate: productObj.gstRate || 18,
        description: productObj.description || '',
      };
      return updated;
    });
  };

  // Sync shipping address with billing if checkbox is checked
  useEffect(() => {
    if (sameAsBilling) {
      setClientSnapshot((prev) => ({
        ...prev,
        shippingAddress: { ...prev.billingAddress },
      }));
    }
  }, [sameAsBilling, clientSnapshot.billingAddress]);

  // Financial summary computation in real time
  const financialSummary = useMemo(() => {
    const buyerState = clientSnapshot.billingAddress?.state || 'Madhya Pradesh';
    return calculateProformaSummary(
      items,
      overallDiscount,
      shippingCharges,
      additionalCharges,
      advancePercentage,
      manualAdvanceAmount ? Number(manualAdvanceAmount) : null,
      buyerState,
      0
    );
  }, [
    items,
    overallDiscount,
    shippingCharges,
    additionalCharges,
    advancePercentage,
    manualAdvanceAmount,
    clientSnapshot.billingAddress?.state,
  ]);

  // Find currently selected quotation object
  const activeSelectedQuotation = useMemo(() => {
    if (!selectedQuotationId) return null;
    return availableQuotations.find(
      (q) => (q.id || q._id) === selectedQuotationId || q.quotationNumber === selectedQuotationId
    );
  }, [availableQuotations, selectedQuotationId]);

  // Submit Handler (Draft or Issued)
  const handleSubmit = async (targetStatus = 'Draft') => {
    setErrorMsg('');

    // Validations
    if (!proformaNumber.trim()) {
      setErrorMsg('Proforma Invoice number is required.');
      return;
    }
    if (!clientSnapshot.companyName.trim()) {
      setErrorMsg('Client / Company Name is required.');
      return;
    }
    if (!clientSnapshot.phone.trim()) {
      setErrorMsg('Client phone number is required.');
      return;
    }
    if (!clientSnapshot.email.trim()) {
      setErrorMsg('Client email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientSnapshot.email.trim())) {
      setErrorMsg('Please enter a valid client email address.');
      return;
    }

    if (!items || items.length === 0 || !items.some((i) => i.name.trim())) {
      setErrorMsg('At least one line item with a name and price is required.');
      return;
    }

    const payload = {
      proformaNumber: proformaNumber.trim(),
      issueDate,
      validUntil,
      currency,
      clientSnapshot,
      referenceQuotation: referenceQuotation.quotationNumber ? referenceQuotation : undefined,
      referenceOrder: referenceOrderNumber ? { orderNumber: referenceOrderNumber } : undefined,
      items,
      overallDiscount: Number(overallDiscount) || 0,
      shippingCharges: Number(shippingCharges) || 0,
      additionalCharges: Number(additionalCharges) || 0,
      advancePercentage: Number(advancePercentage) || 50,
      manualAdvanceAmount: manualAdvanceAmount ? Number(manualAdvanceAmount) : null,
      paymentTerms,
      deliveryTerms,
      notes,
      termsAndConditions,
      status: targetStatus,
      summary: {
        subtotal: financialSummary.subtotal,
        totalDiscount: financialSummary.totalDiscount,
        taxableAmount: financialSummary.taxableAmount,
        cgstAmount: financialSummary.cgstAmount,
        sgstAmount: financialSummary.sgstAmount,
        igstAmount: financialSummary.igstAmount,
        totalTax: financialSummary.totalTax,
        shippingCharges: financialSummary.shippingCharges,
        additionalCharges: financialSummary.additionalCharges,
        roundOff: financialSummary.roundOff,
        grandTotal: financialSummary.grandTotal,
        advancePercentage: financialSummary.advancePercentage,
        advanceAmount: financialSummary.advanceAmount,
        balanceDue: financialSummary.balanceDue,
      },
    };

    try {
      setIsSubmitting(true);
      const res = await createInvoice(payload);
      if (res && res.success) {
        onNavigate('proforma-invoices');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to create Proforma Invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('proforma-invoices')}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            title="Back to List"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-[28px] font-semibold text-slate-800 leading-tight">
              Create Proforma Invoice
            </h1>
            <p className="text-sm font-normal text-slate-500 mt-0.5">
              Generate preliminary commercial billing document with advance payment terms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-slate-500" />
            <span>Save as Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit('Issued')}
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#F7941D]" />
                <span>Issue Proforma Invoice</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2.5 text-sm font-normal animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Creation Mode Switcher */}
      <div className="bg-slate-100 p-1 rounded-xl flex max-w-md">
        <button
          type="button"
          onClick={() => setCreationMode('quotation')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            creationMode === 'quotation'
              ? 'bg-white text-[#1A2E0A] shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-[#F7941D]" />
          <span>Option A: From Quotation</span>
        </button>
        <button
          type="button"
          onClick={() => setCreationMode('manual')}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            creationMode === 'manual'
              ? 'bg-white text-[#1A2E0A] shadow-sm font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-slate-500" />
          <span>Option B: Create Manually</span>
        </button>
      </div>

      {/* Option A: Searchable Quotation Dropdown */}
      {creationMode === 'quotation' && (
        <div className="p-5 bg-amber-50/50 border border-amber-200/70 rounded-2xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5 text-[#1A2E0A]">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-[#F7941D] flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-800">
                  Select Source Quotation
                </h3>
                <p className="text-xs sm:text-sm font-normal text-slate-600 mt-0.5">
                  Pre-fills client details, line items, prices, and terms without altering the original quotation.
                </p>
              </div>
            </div>

            {referenceQuotation.quotationNumber && (
              <button
                type="button"
                onClick={handleUnlinkQuotation}
                className="text-xs sm:text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                <span>Unlink Quotation</span>
              </button>
            )}
          </div>

          {/* Empty State when no quotations exist */}
          {availableQuotations.length === 0 ? (
            <div className="p-6 bg-white border border-amber-200 rounded-xl text-center space-y-3">
              <FileText className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm font-medium text-slate-700">
                No quotations found. Please create a quotation first.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('quotations/create')}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#F7941D]" />
                <span>Create Quotation</span>
              </button>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              {/* Trigger Input / Selector Box */}
              <div
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="w-full bg-white border border-amber-300/80 hover:border-amber-400 rounded-xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer shadow-sm transition-all"
              >
                {activeSelectedQuotation ? (
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-slate-800 bg-amber-100/70 text-[#1A2E0A] px-2 py-0.5 rounded">
                      {activeSelectedQuotation.quotationNumber || activeSelectedQuotation.id}
                    </span>
                    <span className="text-sm font-normal text-slate-700">
                      {activeSelectedQuotation.buyer?.organizationName ||
                        activeSelectedQuotation.buyer?.companyName ||
                        activeSelectedQuotation.buyer?.contactPerson ||
                        'Client'}
                    </span>
                    <span className="text-xs font-normal text-slate-400">
                      &bull; {formatDate(activeSelectedQuotation.quotationDate || activeSelectedQuotation.createdAt)}
                    </span>
                    <span className="text-sm font-semibold text-[#1A2E0A]">
                      {formatINR(activeSelectedQuotation.summary?.grandTotal || 0)}
                    </span>
                    {activeSelectedQuotation.status && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                        {activeSelectedQuotation.status}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-normal text-slate-400 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <span>Search and select an existing quotation by number, client, or buyer...</span>
                  </span>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">
                    {availableQuotations.length} available
                  </span>
                  {isDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Dropdown Menu Panel */}
              {isDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden animate-in fade-in">
                  {/* Search Field */}
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        autoFocus
                        value={quotationSearch}
                        onChange={(e) => setQuotationSearch(e.target.value)}
                        placeholder="Search by quote # (e.g. QT-2026-0001), client name, or buyer..."
                        className="w-full pl-9 pr-8 py-2 text-sm font-normal border border-slate-200 rounded-lg bg-white outline-none focus:border-[#1A2E0A] focus:ring-1 focus:ring-[#1A2E0A]"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {quotationSearch && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuotationSearch('');
                          }}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quotations List */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {filteredQuotations.length === 0 ? (
                      <div className="p-4 text-center text-sm font-normal text-slate-500">
                        No quotations match &ldquo;{quotationSearch}&rdquo;.
                      </div>
                    ) : (
                      filteredQuotations.map((quote) => {
                        const qId = quote.id || quote._id || quote.quotationNumber;
                        const isSelected = selectedQuotationId === qId;
                        const grandTotal = quote.summary?.grandTotal || 0;
                        const buyerName =
                          quote.buyer?.organizationName ||
                          quote.buyer?.companyName ||
                          quote.buyer?.contactPerson ||
                          'Client';
                        const contactPerson = quote.buyer?.contactPerson;

                        return (
                          <div
                            key={qId}
                            onClick={() => handleSelectQuotation(quote)}
                            className={`p-3.5 hover:bg-amber-50/60 cursor-pointer transition-colors flex items-center justify-between ${
                              isSelected ? 'bg-amber-50/80 border-l-4 border-[#1A2E0A]' : ''
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold text-slate-900">
                                  {quote.quotationNumber || qId}
                                </span>
                                {quote.status && (
                                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                    {quote.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm font-normal text-slate-800">
                                {buyerName}
                                {contactPerson && contactPerson !== buyerName && (
                                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                                    ({contactPerson})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-normal text-slate-500 flex items-center gap-2">
                                <span>Date: {formatDate(quote.quotationDate || quote.createdAt)}</span>
                                {quote.items?.length > 0 && (
                                  <span>&bull; {quote.items.length} items</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex items-center gap-3">
                              <div>
                                <div className="text-sm font-semibold text-[#1A2E0A] font-mono">
                                  {formatINR(grandTotal)}
                                </div>
                                <div className="text-xs font-normal text-slate-400">Total Amount</div>
                              </div>
                              {isSelected && (
                                <Check className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active selection feedback */}
          {referenceQuotation.quotationNumber && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-normal text-emerald-800 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Linked to Quotation <strong>#{referenceQuotation.quotationNumber}</strong>. Client details and line items are populated below and can be edited.
                </span>
              </span>
              <button
                type="button"
                onClick={handleUnlinkQuotation}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-900 underline cursor-pointer shrink-0 ml-2"
              >
                Unlink
              </button>
            </div>
          )}
        </div>
      )}

      {/* Option B: Registered Client Picker */}
      {creationMode === 'manual' && clientList.length > 0 && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-normal">
          <div className="flex items-center gap-2 text-slate-700">
            <Building className="w-4 h-4 text-[#F7941D]" />
            <span>Select from registered clients or enter custom client details below:</span>
          </div>
          <select
            onChange={(e) => handleSelectClient(e.target.value)}
            className="px-3 py-1.5 text-sm font-normal border border-slate-300 bg-white rounded-lg outline-none"
          >
            <option value="">-- Select Registered Client (Optional) --</option>
            {clientList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.companyName || c.name} &bull; {c.phone}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Document Details Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-[#F7941D]" />
          <span>Document &amp; Commercial Settings</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Proforma Invoice # <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={proformaNumber}
              onChange={(e) => setProformaNumber(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Issue Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Valid Until Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Ref. Order # (Optional)
            </label>
            <input
              type="text"
              value={referenceOrderNumber}
              onChange={(e) => setReferenceOrderNumber(e.target.value)}
              placeholder="e.g. ORD-2026-0811"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
            />
          </div>
        </div>
      </div>

      {/* Client Details Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Building className="w-5 h-5 text-[#F7941D]" />
          <span>Client &amp; Company Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Company / Client Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={clientSnapshot.companyName}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, companyName: e.target.value }))
              }
              placeholder="e.g. Apollo Hospitals Ltd."
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Contact Person
            </label>
            <input
              type="text"
              value={clientSnapshot.contactPerson}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, contactPerson: e.target.value }))
              }
              placeholder="e.g. Dr. R. K. Saxena"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Official Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              value={clientSnapshot.email}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="procurement@client.com"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={clientSnapshot.phone}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="+91 98765 43210"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Client GSTIN (if registered)
            </label>
            <input
              type="text"
              value={clientSnapshot.gstin}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))
              }
              placeholder="e.g. 23AAACS9981K1ZP"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Client PAN (Optional)
            </label>
            <input
              type="text"
              value={clientSnapshot.pan}
              onChange={(e) =>
                setClientSnapshot((prev) => ({ ...prev, pan: e.target.value.toUpperCase() }))
              }
              placeholder="e.g. AAACS9981K"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-sm uppercase outline-none focus:ring-2 focus:ring-[#1A2E0A]/20 focus:border-[#1A2E0A]"
            />
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
          {/* Billing Address */}
          <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
            <span className="text-sm font-semibold text-slate-800 block">
              Billing Address
            </span>
            <input
              type="text"
              value={clientSnapshot.billingAddress.addressLine1}
              onChange={(e) =>
                setClientSnapshot((prev) => ({
                  ...prev,
                  billingAddress: { ...prev.billingAddress, addressLine1: e.target.value },
                }))
              }
              placeholder="Address Line 1 / Street / Building"
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none focus:border-[#1A2E0A]"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={clientSnapshot.billingAddress.city}
                onChange={(e) =>
                  setClientSnapshot((prev) => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, city: e.target.value },
                  }))
                }
                placeholder="City"
                className="px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
              <input
                type="text"
                value={clientSnapshot.billingAddress.state}
                onChange={(e) =>
                  setClientSnapshot((prev) => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, state: e.target.value },
                  }))
                }
                placeholder="State (e.g. Madhya Pradesh)"
                className="px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
              <input
                type="text"
                value={clientSnapshot.billingAddress.pincode}
                onChange={(e) =>
                  setClientSnapshot((prev) => ({
                    ...prev,
                    billingAddress: { ...prev.billingAddress, pincode: e.target.value },
                  }))
                }
                placeholder="Pincode"
                className="px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">
                Shipping / Delivery Site Address
              </span>
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-normal text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="rounded text-[#1A2E0A] focus:ring-[#1A2E0A]"
                />
                <span>Same as Billing</span>
              </label>
            </div>
            <input
              type="text"
              disabled={sameAsBilling}
              value={clientSnapshot.shippingAddress.addressLine1}
              onChange={(e) =>
                setClientSnapshot((prev) => ({
                  ...prev,
                  shippingAddress: { ...prev.shippingAddress, addressLine1: e.target.value },
                }))
              }
              placeholder="Delivery Site Address / Godown"
              className="w-full px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none disabled:bg-slate-100"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                disabled={sameAsBilling}
                value={clientSnapshot.shippingAddress.city}
                onChange={(e) =>
                  setClientSnapshot((prev) => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, city: e.target.value },
                  }))
                }
                placeholder="City"
                className="px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none disabled:bg-slate-100"
              />
              <input
                type="text"
                disabled={sameAsBilling}
                value={clientSnapshot.shippingAddress.state}
                onChange={(e) =>
                  setClientSnapshot((prev) => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, state: e.target.value },
                  }))
                }
                placeholder="State"
                className="px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none disabled:bg-slate-100"
              />
              <input
                type="text"
                disabled={sameAsBilling}
                value={clientSnapshot.shippingAddress.pincode}
                onChange={(e) =>
                  setClientSnapshot((prev) => ({
                    ...prev,
                    shippingAddress: { ...prev.shippingAddress, pincode: e.target.value },
                  }))
                }
                placeholder="Pincode"
                className="px-3 py-2 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none disabled:bg-slate-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#F7941D]" />
            <span>Line Items &amp; Commercial Specifications</span>
          </h2>
          <button
            type="button"
            onClick={handleAddItem}
            className="px-3.5 py-1.5 text-sm font-medium text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#F7941D]" />
            <span>Add Row</span>
          </button>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#1A2E0A] text-white text-xs sm:text-sm font-semibold">
              <tr>
                <th className="py-3 px-3 w-8 text-center">#</th>
                <th className="py-3 px-3 min-w-[220px]">Product / Service Description</th>
                <th className="py-3 px-2 w-24">HSN/SAC</th>
                <th className="py-3 px-2 w-20 text-center">Qty</th>
                <th className="py-3 px-2 w-24 text-center">Unit</th>
                <th className="py-3 px-2 w-28 text-right">Unit Price (₹)</th>
                <th className="py-3 px-2 w-24 text-right">Disc. %</th>
                <th className="py-3 px-2 w-28 text-center">GST Rate</th>
                <th className="py-3 px-3 w-28 text-right">Total (₹)</th>
                <th className="py-3 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it, idx) => {
                const qty = Math.max(1, Number(it.quantity) || 1);
                const price = Math.max(0, Number(it.unitPrice) || 0);
                const base = qty * price;
                const discAmt = (base * Math.min(100, Number(it.discountValue) || 0)) / 100;
                const taxable = base - discAmt;
                const tax = (taxable * (Number(it.gstRate) || 0)) / 100;
                const rowTotal = taxable + tax;

                return (
                  <tr key={it.id || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-medium text-sm">{idx + 1}</td>

                    {/* Product Name & Description */}
                    <td className="py-2.5 px-3">
                      {productList.length > 0 && (
                        <select
                          onChange={(e) => {
                            const p = productList.find((x) => x._id === e.target.value);
                            handleProductSelect(idx, p);
                          }}
                          className="w-full text-xs mb-1 p-1 bg-slate-50 border border-slate-200 rounded text-slate-600 outline-none"
                        >
                          <option value="">-- Quick Pick from Products --</option>
                          {productList.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} (₹{p.unitPrice})
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="Product / Item Name *"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-sm font-normal text-slate-800 outline-none focus:border-[#1A2E0A]"
                        required
                      />
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="Specifications / Packaging note (optional)"
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-600 mt-1 outline-none"
                      />
                    </td>

                    {/* HSN */}
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        value={it.hsn}
                        onChange={(e) => handleItemChange(idx, 'hsn', e.target.value)}
                        placeholder="HSN"
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-sm text-center outline-none focus:border-[#1A2E0A]"
                      />
                    </td>

                    {/* Quantity */}
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="1"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-normal text-center outline-none focus:border-[#1A2E0A]"
                        required
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2.5 px-2">
                      <select
                        value={it.unit}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded outline-none bg-white text-sm text-center"
                      >
                        {UNIT_OPTIONS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Unit Price */}
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-normal text-right outline-none focus:border-[#1A2E0A]"
                        required
                      />
                    </td>

                    {/* Discount % */}
                    <td className="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={it.discountValue}
                        onChange={(e) => handleItemChange(idx, 'discountValue', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm text-right outline-none focus:border-[#1A2E0A]"
                      />
                    </td>

                    {/* GST Rate */}
                    <td className="py-2.5 px-2">
                      <select
                        value={it.gstRate}
                        onChange={(e) => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded outline-none bg-white text-sm text-center font-normal"
                      >
                        {GST_RATES.map((g) => (
                          <option key={g.value} value={g.value}>
                            {g.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Row Total */}
                    <td className="py-2.5 px-3 text-right text-sm font-medium text-slate-900 font-mono">
                      {formatINR(rowTotal)}
                    </td>

                    {/* Remove button */}
                    <td className="py-2.5 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 p-1 disabled:opacity-30 cursor-pointer"
                        title="Remove Line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustments & Commercial Calculations Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Commercial Terms & Notes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Info className="w-5 h-5 text-[#F7941D]" />
            <span>Terms, Conditions &amp; Payment Milestones</span>
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Payment Terms &amp; Advance Schedule
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:border-[#1A2E0A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Delivery Terms &amp; Timeline
            </label>
            <input
              type="text"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none focus:border-[#1A2E0A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Commercial Remarks &amp; Notes
            </label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-normal text-slate-800 outline-none resize-none focus:border-[#1A2E0A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Terms and Conditions
            </label>
            <textarea
              rows="4"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none font-mono text-xs text-slate-700 leading-relaxed resize-none focus:border-[#1A2E0A]"
            />
          </div>
        </div>

        {/* Right: Financial Summary & Calculations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-600" />
            <span>Financial Calculation Breakdown</span>
          </h2>

          {/* Adjustments inputs */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Special Discount (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Freight &amp; Delivery (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={shippingCharges}
                onChange={(e) => setShippingCharges(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Handling Charges (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={additionalCharges}
                onChange={(e) => setAdditionalCharges(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                Advance Required (%)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={advancePercentage}
                  onChange={(e) => setAdvancePercentage(e.target.value)}
                  className="w-16 px-2 py-1.5 text-sm font-medium border border-slate-300 rounded-lg bg-white outline-none text-center"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Or fixed ₹"
                  value={manualAdvanceAmount}
                  onChange={(e) => setManualAdvanceAmount(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-sm font-normal border border-slate-300 rounded-lg bg-white outline-none text-right placeholder:text-xs"
                  title="Override with fixed Rupee advance amount"
                />
              </div>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="space-y-2.5 border-t border-slate-100 pt-3 text-sm font-normal">
            <div className="flex justify-between text-slate-600">
              <span>Gross Line Subtotal:</span>
              <span className="font-medium text-slate-800">{formatINR(financialSummary.subtotal)}</span>
            </div>

            {financialSummary.totalDiscount > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Total Combined Discounts:</span>
                <span className="font-medium">-{formatINR(financialSummary.totalDiscount)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Net Taxable Value:</span>
              <span className="font-medium text-slate-800">{formatINR(financialSummary.taxableAmount)}</span>
            </div>

            {financialSummary.cgstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>CGST (Intra-State MP):</span>
                <span>{formatINR(financialSummary.cgstAmount)}</span>
              </div>
            )}
            {financialSummary.sgstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>SGST (Intra-State MP):</span>
                <span>{formatINR(financialSummary.sgstAmount)}</span>
              </div>
            )}
            {financialSummary.igstAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>IGST (Inter-State):</span>
                <span>{formatINR(financialSummary.igstAmount)}</span>
              </div>
            )}

            {financialSummary.shippingCharges > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Freight &amp; Delivery:</span>
                <span>{formatINR(financialSummary.shippingCharges)}</span>
              </div>
            )}
            {financialSummary.additionalCharges > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Handling &amp; Additional:</span>
                <span>{formatINR(financialSummary.additionalCharges)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="border-t-2 border-[#1A2E0A] pt-3 flex items-baseline justify-between text-slate-900">
              <span className="text-base sm:text-lg font-semibold">Grand Total:</span>
              <span className="text-xl sm:text-2xl font-semibold font-mono text-[#1A2E0A]">
                {formatINR(financialSummary.grandTotal)}
              </span>
            </div>

            {/* Advance Highlight */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800">
              <span className="text-sm font-semibold">Required Advance ({financialSummary.advancePercentage}%):</span>
              <span className="text-base font-semibold font-mono">
                {formatINR(financialSummary.advanceAmount)}
              </span>
            </div>

            {/* Balance Highlight */}
            <div className="flex items-center justify-between text-slate-600 px-1">
              <span className="text-sm font-normal">Balance Due Prior to Dispatch:</span>
              <span className="font-mono text-slate-800 font-semibold text-sm">
                {formatINR(financialSummary.balanceDue)}
              </span>
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('proforma-invoices')}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('Draft')}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit('Issued')}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[#1A2E0A] hover:bg-[#253f0e] rounded-xl shadow-sm transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#F7941D]" />
                  <span>Issue Proforma Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProformaInvoice;
