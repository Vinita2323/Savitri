import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Truck,
  User,
  ShoppingCart,
  Package,
  Calendar,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Search,
  Eye,
  Download,
  Printer,
  Save,
  Send,
  Building,
  MapPin,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import deliveryChallanService from '../../../../services/deliveryChallanService';
import { useDeliveryChallan } from '../context/DeliveryChallanContext';
import DeliveryChallanPreviewModal from '../components/DeliveryChallanPreviewModal';
import { formatDate } from '../utils/deliveryChallanPdfGenerator';

export const CreateDeliveryChallan = ({ onNavigate }) => {
  const { createChallan, downloadPdf, printPdf } = useDeliveryChallan();

  // Multi-step progress: 1: Client -> 2: Order -> 3: Auto-Fill/Verify -> 4: Dispatch Details -> 5: Review & Save
  const [currentStep, setCurrentStep] = useState(1);

  // Clients state (Step A)
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Orders state (Step B)
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Dispatch items & Form details (Step C & D)
  const [challanNumber, setChallanNumber] = useState('');
  const [challanDate, setChallanDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dispatchDate, setDispatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [purpose, setPurpose] = useState('Supply on Sale');
  const [selectedShippingAddressIndex, setSelectedShippingAddressIndex] = useState(0);

  // Transport details
  const [transporterName, setTransporterName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [lrDate, setLrDate] = useState('');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');

  // Notes & terms
  const [shippingNotes, setShippingNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(
    '1. Goods dispatched are under delivery challan as per Rule 55 of CGST Rules, 2017.\n2. Please verify goods description, seal, and quantities upon delivery.\n3. Discrepancies must be endorsed on this challan copy and notified within 24 hours.'
  );

  // Items for dispatch
  const [dispatchItems, setDispatchItems] = useState([]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [previewChallanData, setPreviewChallanData] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showConfirmDispatchedModal, setShowConfirmDispatchedModal] = useState(false);

  // Issuing company details (Savitri B2B)
  const issuingCompany = {
    name: 'SAVITRI B2B ENTERPRISE',
    legalName: 'Savitri Multi-Brand E-Commerce & Institutional Supply Platform',
    address: 'Indore Central Fulfillment Complex, Sector B, Sanwer Road, Indore (MP) - 452015',
    phone: '+91 731 498 7720',
    email: 'dispatch@savitri.com',
    gstin: '23AAACS9981K1ZP',
    cin: 'U74999MP2025PTC049102',
    fssai: '11425850000122',
  };

  // Fetch next challan number on mount
  useEffect(() => {
    deliveryChallanService
      .getNextChallanNumber()
      .then((res) => {
        if (res.success && res.challanNumber) {
          setChallanNumber(res.challanNumber);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch clients on mount
  useEffect(() => {
    setClientsLoading(true);
    deliveryChallanService
      .getClients('', 100)
      .then((res) => {
        if (res.success) {
          setClients(res.clients || []);
        }
      })
      .catch((err) => {
        setValidationError('Failed to load clients. Please refresh.');
      })
      .finally(() => {
        setClientsLoading(false);
      });
  }, []);

  // Filter clients by search term
  const filteredClients = useMemo(() => {
    if (!clientSearchTerm.trim()) return clients;
    const term = clientSearchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term))
    );
  }, [clients, clientSearchTerm]);

  // Step A: Handle Client Selection
  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setSelectedOrder(null);
    setDispatchItems([]);
    setValidationError('');
    setOrdersLoading(true);

    try {
      const res = await deliveryChallanService.getEligibleOrders(client._id);
      if (res.success) {
        setEligibleOrders(res.orders || []);
      }
      setCurrentStep(2);
    } catch (err) {
      setValidationError('Failed to load eligible orders for this client.');
    } finally {
      setOrdersLoading(false);
    }
  };

  // Step B: Handle Order Selection
  const handleSelectOrder = async (order) => {
    setSelectedOrder(order);
    setValidationError('');

    try {
      // Fetch detailed dispatch summary with HSN, unit, and item-by-item balances
      const res = await deliveryChallanService.getOrderDispatchSummary(order._id);
      if (res.success && Array.isArray(res.items)) {
        // Initialize dispatch items with default dispatchQuantity = remainingQuantity
        const itemsWithDispatch = res.items.map((item) => ({
          ...item,
          dispatchedQuantity: item.remainingQuantity > 0 ? item.remainingQuantity : 0,
        }));
        setDispatchItems(itemsWithDispatch);
      } else {
        // Fallback from order.items
        const fallback = (order.items || []).map((item) => ({
          product: item.product,
          name: item.name,
          sku: item.sku || item.variantSku || '',
          variantSku: item.variantSku || '',
          variantTitle: item.variantTitle || '',
          hsn: '',
          unit: 'Units',
          unitPrice: item.price || 0,
          orderedQuantity: Number(item.quantity) || 0,
          previouslyDispatchedQuantity: Number(item.previouslyDispatched) || 0,
          remainingQuantity: Number(item.remainingQuantity) || 0,
          dispatchedQuantity: Number(item.remainingQuantity) || 0,
        }));
        setDispatchItems(fallback);
      }
      setCurrentStep(3);
    } catch (err) {
      setValidationError('Failed to load order item details.');
    }
  };

  // Step D: Update dispatch quantity for an item
  const handleQuantityChange = (index, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setDispatchItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], dispatchedQuantity: num };
      return updated;
    });
  };

  // Quick fill remaining
  const handleFillRemaining = (index) => {
    setDispatchItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], dispatchedQuantity: updated[index].remainingQuantity };
      return updated;
    });
  };

  const handleFillAllRemaining = () => {
    setDispatchItems((prev) =>
      prev.map((item) => ({
        ...item,
        dispatchedQuantity: item.remainingQuantity,
      }))
    );
  };

  // Calculate totals
  const totalDispatchedCount = useMemo(() => {
    return dispatchItems.reduce((sum, item) => sum + (Number(item.dispatchedQuantity) || 0), 0);
  }, [dispatchItems]);

  // Validation
  const validateForm = (isFinalize = false) => {
    setValidationError('');

    if (!selectedClient) {
      setValidationError('Please select a client.');
      return false;
    }
    if (!selectedOrder) {
      setValidationError('Please select an eligible order.');
      return false;
    }
    if (!dispatchItems || dispatchItems.length === 0) {
      setValidationError('The order has no dispatchable items.');
      return false;
    }

    if (isFinalize) {
      if (totalDispatchedCount <= 0) {
        setValidationError('Total dispatch quantity must be greater than zero.');
        return false;
      }

      // Check each item for over-dispatch
      for (const item of dispatchItems) {
        const qty = Number(item.dispatchedQuantity) || 0;
        if (qty > item.remainingQuantity) {
          setValidationError(
            `Quantity for "${item.name}" (${qty}) exceeds remaining dispatchable quantity (${item.remainingQuantity}).`
          );
          return false;
        }
      }
    }

    return true;
  };

  // Assemble Payload
  const assembleChallanPayload = (status = 'Draft') => {
    const shippingAddress =
      selectedOrder?.shippingAddress ||
      selectedClient?.addresses?.[selectedShippingAddressIndex] ||
      selectedClient?.address ||
      {};

    const billingAddress =
      selectedClient?.addresses?.find((a) => a.isDefault) ||
      selectedClient?.address ||
      shippingAddress;

    return {
      challanNumber: challanNumber.trim(),
      challanDate: new Date(challanDate),
      dispatchDate: new Date(dispatchDate),
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      client: selectedClient._id,
      clientSnapshot: {
        name: selectedClient.name,
        companyName: selectedClient.companyName || selectedClient.name,
        phone: selectedClient.phone,
        email: selectedClient.email,
        gstin: selectedClient.gstin || '',
        billingAddress,
        shippingAddress,
      },
      issuingCompany,
      order: selectedOrder._id,
      orderNumber: selectedOrder.orderId,
      orderDate: selectedOrder.orderDate || selectedOrder.createdAt,
      orderGrandTotal: selectedOrder.grandTotal || 0,
      items: dispatchItems.map((item) => ({
        product: item.product,
        name: item.name,
        sku: item.sku || '',
        variantSku: item.variantSku || '',
        variantTitle: item.variantTitle || '',
        hsn: item.hsn || '',
        unit: item.unit || 'Units',
        unitPrice: item.unitPrice || 0,
        orderedQuantity: item.orderedQuantity,
        previouslyDispatchedQuantity: item.previouslyDispatchedQuantity || 0,
        dispatchedQuantity: Number(item.dispatchedQuantity) || 0,
        remainingQuantity: Math.max(0, item.remainingQuantity - (Number(item.dispatchedQuantity) || 0)),
        notes: item.notes || '',
      })),
      totalDispatchedQuantity: totalDispatchedCount,
      transportDetails: {
        transporterName: transporterName.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        lrNumber: lrNumber.trim().toUpperCase(),
        lrDate: lrDate ? new Date(lrDate) : null,
        ewayBillNumber: ewayBillNumber.trim().toUpperCase(),
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
      },
      purpose,
      shippingNotes: shippingNotes.trim(),
      termsAndConditions,
      status,
    };
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    if (!validateForm(false)) return;
    try {
      setSubmitting(true);
      const payload = assembleChallanPayload('Draft');
      const res = await createChallan(payload);
      if (res.success) {
        if (onNavigate) {
          onNavigate('delivery_challans');
        }
      }
    } catch (err) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to save draft.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save and Finalize (Mark as Dispatched)
  const handleFinalizeDispatch = async () => {
    if (!validateForm(true)) return;
    setShowConfirmDispatchedModal(false);
    try {
      setSubmitting(true);
      const payload = assembleChallanPayload('Dispatched');
      const res = await createChallan(payload);
      if (res.success) {
        if (onNavigate) {
          onNavigate('delivery_challans/details', res.challan);
        }
      }
    } catch (err) {
      setValidationError(err.response?.data?.message || err.message || 'Failed to finalize dispatch.');
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Challan
  const handleOpenPreview = () => {
    const previewData = assembleChallanPayload('Draft');
    setPreviewChallanData(previewData);
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 font-sans">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (currentStep > 1) {
                setCurrentStep((s) => s - 1);
              } else if (onNavigate) {
                onNavigate('delivery_challans');
              }
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Create Delivery Challan</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                {challanNumber || 'DC-NEW'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Issue an official goods dispatch note linked to client order records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStep >= 3 && (
            <button
              onClick={handleOpenPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            >
              <Eye size={15} />
              <span>Preview</span>
            </button>
          )}

          {currentStep === 5 && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save size={15} />
                <span>Save as Draft</span>
              </button>

              <button
                onClick={() => {
                  if (validateForm(true)) {
                    setShowConfirmDispatchedModal(true);
                  }
                }}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-[#1A2E0A] hover:bg-[#253f10] text-white transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <Truck size={15} className="text-[#F7941D]" />
                <span>Mark as Dispatched</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Step Wizard Progress Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[540px]">
          {[
            { num: 1, label: 'Select Client', icon: User },
            { num: 2, label: 'Select Order', icon: ShoppingCart },
            { num: 3, label: 'Auto-Fill Details', icon: Building },
            { num: 4, label: 'Dispatch Information', icon: Truck },
            { num: 5, label: 'Review & Finalize', icon: CheckCircle },
          ].map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => {
                    if (s.num <= currentStep || (s.num === 2 && selectedClient) || (s.num === 3 && selectedOrder)) {
                      setCurrentStep(s.num);
                    }
                  }}
                  disabled={s.num > currentStep && !((s.num === 2 && selectedClient) || (s.num === 3 && selectedOrder))}
                  className="flex items-center gap-2.5 bg-transparent border-none cursor-pointer group disabled:cursor-not-allowed"
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                      isCurrent
                        ? 'bg-[#1A2E0A] text-white ring-4 ring-[#1A2E0A]/10 shadow-sm'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle size={15} /> : s.num}
                  </div>
                  <span
                    className={`text-xs font-medium whitespace-nowrap ${
                      isCurrent
                        ? 'text-slate-900 font-bold'
                        : isCompleted
                        ? 'text-emerald-800 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </span>
                </button>

                {idx < 4 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 transition-colors ${
                      currentStep > idx + 1 ? 'bg-emerald-600' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Validation Banner */}
      {validationError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 1: SELECT CLIENT / FIRM */}
      {/* ========================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User size={18} className="text-[#1A2E0A]" />
              <span>Step A: Select Client / Firm</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose an existing client or firm to fetch their active eligible orders for dispatch.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by client name, mobile number, or email..."
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-[#F7941D] rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 outline-none transition font-medium"
            />
          </div>

          {/* Clients Grid */}
          {clientsLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw size={26} className="animate-spin mx-auto text-[#1A2E0A]" />
              <p className="text-xs">Loading client records...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <User size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-medium">No clients match your search query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {filteredClients.map((client) => {
                const isSelected = selectedClient?._id === client._id;
                const addr = client.address || client.addresses?.[0] || {};
                return (
                  <div
                    key={client._id}
                    onClick={() => handleSelectClient(client)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-[#1A2E0A] bg-emerald-50/50 shadow-sm ring-2 ring-[#1A2E0A]/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900 text-sm">
                        {client.companyName || client.name}
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                        {client.orderCount} Orders
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400 shrink-0" />
                        <span>{client.phone || '-'}</span>
                      </p>
                      {client.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </p>
                      )}
                      {(addr.city || addr.state) && (
                        <p className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span className="truncate">
                            {[addr.city, addr.state].filter(Boolean).join(', ')}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-[#1A2E0A] font-bold group-hover:underline flex items-center gap-1">
                        <span>Select & View Orders</span>
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 2: SELECT ELIGIBLE ORDER */}
      {/* ========================================================= */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart size={18} className="text-[#1A2E0A]" />
                <span>Step B: Select Order to Dispatch</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Eligible orders for client:{' '}
                <span className="font-bold text-slate-800">
                  {selectedClient?.companyName || selectedClient?.name}
                </span>{' '}
                ({selectedClient?.phone})
              </p>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-[#1A2E0A] font-semibold hover:underline cursor-pointer"
            >
              Change Client
            </button>
          </div>

          {ordersLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <RefreshCw size={26} className="animate-spin mx-auto text-[#1A2E0A]" />
              <p className="text-xs">Fetching eligible orders...</p>
            </div>
          ) : eligibleOrders.length === 0 ? (
            <div className="py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
              <div className="p-4 bg-amber-50 text-amber-700 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
                <Package size={28} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No Eligible Orders Available for Dispatch</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This client currently has no pending or partially fulfilled orders. Orders that are fully dispatched,
                cancelled, or returned are excluded by business rules.
              </p>
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Choose Another Client
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eligibleOrders.map((order) => {
                const isSelected = selectedOrder?._id === order._id;
                const orderedQty = order.totalOrderedQuantity || 0;
                const dispatchedQty = order.totalDispatchedQuantity || 0;
                const remainingQty = order.totalRemainingQuantity || 0;
                const progressPct = orderedQty > 0 ? Math.round((dispatchedQty / orderedQty) * 100) : 0;

                return (
                  <div
                    key={order._id}
                    onClick={() => handleSelectOrder(order)}
                    className={`p-5 rounded-2xl border text-left cursor-pointer transition-all space-y-3 ${
                      isSelected
                        ? 'border-[#1A2E0A] bg-emerald-50/50 shadow-md ring-2 ring-[#1A2E0A]/10'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          Order #{order.orderId}
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Placed on: {formatDate(order.orderDate)}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-slate-900 block">
                          ₹{Number(order.grandTotal).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {order.orderStatus}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Dispatch */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>Dispatch Progress: {progressPct}%</span>
                        <span className="font-bold text-[#F7941D]">
                          {remainingQty} units remaining
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Quantities summary */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Ordered</span>
                        <span className="font-bold text-slate-800">{orderedQty}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Prev. Disp</span>
                        <span className="font-bold text-slate-800">{dispatchedQty}</span>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <span className="text-[10px] text-emerald-800 block uppercase font-bold">Remaining</span>
                        <span className="font-bold text-emerald-800">{remainingQty}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2 bg-[#1A2E0A] text-white rounded-xl text-xs font-bold hover:bg-[#2A4515] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <span>Issue Challan for this Order</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 3: AUTO-FILL DETAILS & VERIFICATION */}
      {/* ========================================================= */}
      {currentStep === 3 && (
        <div className="space-y-5">
          {/* Top Info Banner */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Building size={18} className="text-[#1A2E0A]" />
                  <span>Step C: Verified Document & Address Snapshot</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm seller issuing entity, buyer snapshot, and delivery destination details.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-slate-600 hover:underline cursor-pointer"
                >
                  Change Order
                </button>
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 bg-[#1A2E0A] text-white text-xs font-bold rounded-xl hover:bg-[#2A4515] transition cursor-pointer flex items-center gap-1"
                >
                  <span>Continue to Dispatch Info</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            {/* Document Meta Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Challan Number</label>
                <input
                  type="text"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  className="font-mono font-bold text-sm text-[#1A2E0A] bg-transparent border-none outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Challan Date</label>
                <input
                  type="date"
                  value={challanDate}
                  onChange={(e) => setChallanDate(e.target.value)}
                  className="font-semibold text-slate-800 bg-transparent border-none outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase">Linked Order</label>
                <span className="font-mono font-bold text-slate-900">
                  #{selectedOrder?.orderId} ({formatDate(selectedOrder?.orderDate)})
                </span>
              </div>
            </div>

            {/* Seller & Client Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seller / Consignor */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-[#1A2E0A] uppercase tracking-wider block">
                  Seller / Consignor
                </span>
                <p className="font-black text-slate-900 text-sm">{issuingCompany.name}</p>
                <p className="text-slate-600">{issuingCompany.address}</p>
                <p className="text-slate-600 font-mono">GSTIN: {issuingCompany.gstin} | CIN: {issuingCompany.cin}</p>
                <p className="text-slate-600">Phone: {issuingCompany.phone}</p>
              </div>

              {/* Client / Consignee */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-[#1A2E0A] uppercase tracking-wider block">
                  Consignee / Client
                </span>
                <p className="font-black text-slate-900 text-sm">
                  {selectedClient?.companyName || selectedClient?.name}
                </p>
                <p className="text-slate-600">Contact: {selectedClient?.name}</p>
                <p className="text-slate-600">Phone: {selectedClient?.phone} | Email: {selectedClient?.email || '-'}</p>
                <p className="text-slate-600">
                  GSTIN: {selectedClient?.gstin || 'Consumer / Unregistered'}
                </p>
              </div>
            </div>

            {/* Delivery Destination Address */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                Shipping Destination (From Order Record)
              </span>
              <p className="font-bold text-slate-900">
                {selectedOrder?.shippingAddress?.fullName || selectedClient?.name}
              </p>
              <p className="text-slate-700">
                {[
                  selectedOrder?.shippingAddress?.addressLine1,
                  selectedOrder?.shippingAddress?.addressLine2,
                  selectedOrder?.shippingAddress?.landmark,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="text-slate-700 font-medium">
                {[
                  selectedOrder?.shippingAddress?.city,
                  selectedOrder?.shippingAddress?.state,
                  selectedOrder?.shippingAddress?.pincode,
                ]
                  .filter(Boolean)
                  .join(' - ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 4: ENTER DISPATCH INFORMATION */}
      {/* ========================================================= */}
      {currentStep === 4 && (
        <div className="space-y-5">
          {/* Product Items & Dispatch Quantities Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package size={18} className="text-[#1A2E0A]" />
                  <span>Step D: Enter Actual Dispatch Quantities</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set actual goods quantity being dispatched. Over-dispatch is prevented by business logic.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFillAllRemaining}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto border border-emerald-200"
              >
                Fill All Remaining Quantities
              </button>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#1A2E0A] text-white font-semibold">
                  <tr>
                    <th className="py-3 px-3 text-center w-10">#</th>
                    <th className="py-3 px-3">Product Name & SKU</th>
                    <th className="py-3 px-3 text-center">HSN</th>
                    <th className="py-3 px-3 text-center">Unit</th>
                    <th className="py-3 px-3 text-center">Ordered</th>
                    <th className="py-3 px-3 text-center">Prev. Disp</th>
                    <th className="py-3 px-3 text-center font-bold text-amber-300">Remaining</th>
                    <th className="py-3 px-3 text-center w-36 bg-[#253f10]">Actual Dispatch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {dispatchItems.map((item, idx) => {
                    const isOver = (Number(item.dispatchedQuantity) || 0) > item.remainingQuantity;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          {item.variantTitle && (
                            <span className="text-[11px] text-slate-500 block">Variant: {item.variantTitle}</span>
                          )}
                          {item.sku && (
                            <span className="text-[11px] font-mono text-slate-400">SKU: {item.sku}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-600">{item.hsn || '-'}</td>
                        <td className="py-3 px-3 text-center text-slate-600">{item.unit || 'Units'}</td>
                        <td className="py-3 px-3 text-center text-slate-700">{item.orderedQuantity}</td>
                        <td className="py-3 px-3 text-center text-slate-500">
                          {item.previouslyDispatchedQuantity || 0}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-800">
                          {item.remainingQuantity}
                        </td>

                        {/* Quantity input */}
                        <td className="py-3 px-3 text-center bg-slate-50">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={item.remainingQuantity}
                              value={item.dispatchedQuantity}
                              onChange={(e) => handleQuantityChange(idx, e.target.value)}
                              className={`w-20 text-center font-bold py-1.5 px-2 text-sm rounded-lg border outline-none ${
                                isOver
                                  ? 'border-rose-500 bg-rose-50 text-rose-800'
                                  : 'border-slate-300 focus:border-[#F7941D] bg-white text-slate-900'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleFillRemaining(idx)}
                              title="Set to max remaining"
                              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded text-[10px] font-bold text-slate-700 transition cursor-pointer"
                            >
                              Max
                            </button>
                          </div>
                          {isOver && (
                            <span className="text-[10px] text-rose-600 font-bold block mt-1">
                              Exceeds remaining ({item.remainingQuantity})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <td colSpan={4} className="py-3 px-3 text-right">
                      TOTAL DISPATCH UNITS
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700">
                      {dispatchItems.reduce((sum, i) => sum + (Number(i.orderedQuantity) || 0), 0)}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-500">-</td>
                    <td className="py-3 px-3 text-center text-emerald-800">
                      {dispatchItems.reduce((sum, i) => sum + (Number(i.remainingQuantity) || 0), 0)}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-950 font-black text-base bg-amber-100">
                      {totalDispatchedCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Transport & Purpose Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck size={17} className="text-[#1A2E0A]" />
              <span>Logistics & Transport Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Purpose of Challan <span className="text-rose-500">*</span>
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium"
                >
                  <option value="Supply on Sale">Supply on Sale</option>
                  <option value="Job Work">Job Work</option>
                  <option value="Exhibition / Demo">Exhibition / Demo</option>
                  <option value="For Approval">For Approval</option>
                  <option value="Transfer / Shift">Transfer / Shift</option>
                  <option value="Replacement">Replacement</option>
                  <option value="Returnable">Returnable</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dispatch Date</label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Expected Delivery Date (Optional)</label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transporter Name</label>
                <input
                  type="text"
                  placeholder="e.g. DTDC, VRL Logistics, Self"
                  value={transporterName}
                  onChange={(e) => setTransporterName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  placeholder="e.g. MP-09-AB-1234"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">LR / Docket / Tracking No</label>
                <input
                  type="text"
                  placeholder="e.g. LR-987456"
                  value={lrNumber}
                  onChange={(e) => setLrNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">E-Way Bill Number (If applicable)</label>
                <input
                  type="text"
                  placeholder="e.g. 121548796541"
                  value={ewayBillNumber}
                  onChange={(e) => setEwayBillNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium uppercase font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Driver Full Name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Driver Mobile (Optional)</label>
                <input
                  type="text"
                  placeholder="10-digit mobile"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Shipping Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Special delivery instructions or gate security notes..."
                value={shippingNotes}
                onChange={(e) => setShippingNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#F7941D] outline-none text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateForm(false)) {
                    setCurrentStep(5);
                  }
                }}
                className="px-5 py-2.5 bg-[#1A2E0A] hover:bg-[#2A4515] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <span>Proceed to Review & Finalize</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* STEP 5: REVIEW AND SAVE */}
      {/* ========================================================= */}
      {currentStep === 5 && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle size={18} className="text-emerald-600" />
                  <span>Step E: Review & Confirmation</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify the final delivery challan summary before saving or marking as dispatched.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenPreview}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <Eye size={15} />
                  <span>Document Preview</span>
                </button>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Challan Number</span>
                <span className="font-bold font-mono text-slate-900 text-sm">{challanNumber}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Client</span>
                <span className="font-bold text-slate-900 truncate block">
                  {selectedClient?.companyName || selectedClient?.name}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Linked Order</span>
                <span className="font-bold font-mono text-slate-900">#{selectedOrder?.orderId}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Units Dispatched</span>
                <span className="font-black font-mono text-amber-900 text-base">{totalDispatchedCount} units</span>
              </div>
            </div>

            {/* Product Summary */}
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-center">Ordered</th>
                    <th className="py-2.5 px-3 text-center">Prev. Disp</th>
                    <th className="py-2.5 px-3 text-center font-bold text-emerald-800">Dispatch Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatchItems.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.name}</td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'Units'}</td>
                      <td className="py-2.5 px-3 text-center text-slate-700">{item.orderedQuantity}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500">
                        {item.previouslyDispatchedQuantity || 0}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-emerald-900 bg-emerald-50/50">
                        {item.dispatchedQuantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Transport Recap */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Transporter</span>
                <span className="font-semibold text-slate-800">{transporterName || 'Self / Direct'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Vehicle Number</span>
                <span className="font-mono font-bold text-slate-800">{vehicleNumber || 'Local Handover'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">LR / Docket</span>
                <span className="font-mono font-bold text-slate-800">{lrNumber || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase">Purpose</span>
                <span className="font-bold text-[#F7941D]">{purpose}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer w-full sm:w-auto"
              >
                Back to Edit Quantities
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{submitting ? 'Saving...' : 'Save as Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateForm(true)) {
                      setShowConfirmDispatchedModal(true);
                    }
                  }}
                  disabled={submitting}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl bg-[#1A2E0A] hover:bg-[#253f10] text-white transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Truck size={16} className="text-[#F7941D]" />
                  <span>{submitting ? 'Processing...' : 'Save & Mark as Dispatched'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Finalizing Dispatch */}
      {showConfirmDispatchedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-700">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <Truck size={24} className="text-[#1A2E0A]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Order Dispatch</h3>
                <p className="text-xs text-slate-500 font-mono">Challan #{challanNumber}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are about to finalize dispatch of{' '}
              <span className="font-bold text-slate-900">{totalDispatchedCount} units</span> for Order{' '}
              <span className="font-mono font-bold text-slate-900">#{selectedOrder?.orderId}</span>.
              Once marked as dispatched, order dispatch balances will be deducted atomically and a permanent audit trail
              will be created.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDispatchedModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleFinalizeDispatch}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold bg-[#1A2E0A] hover:bg-[#253f10] text-white rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {submitting ? 'Finalizing...' : 'Confirm & Finalize Dispatch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <DeliveryChallanPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        challan={previewChallanData}
      />
    </div>
  );
};

export default CreateDeliveryChallan;
