import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import API from '../../../../services/api';

/**
 * Quotation state backed by the server (MongoDB).
 *
 * - Data is loaded from GET /quotations and GET /quotations/requests and is scoped by the backend to the
 *   brand selected in the Super Admin panel (X-Brand-Id header is added by the shared axios instance).
 * - Every action calls the API and then updates local state from the server's response, so the screen
 *   always shows what is stored. Async actions resolve to the stored record, or throw an Error whose
 *   message is the server's message (pages show it).
 * - `brandKey` (optional) makes the provider reload when the active brand changes.
 */
const QuotationContext = createContext(null);

const errMsg = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

export const QuotationProvider = ({ children, brandKey }) => {
  const [quotations, setQuotations] = useState([]);
  const [quotationRequests, setQuotationRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Navigation helpers shared between pages (client-side only)
  const [prefillData, setPrefillData] = useState(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);
  const [editingQuotationId, setEditingQuotationId] = useState(null);

  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const mine = ++seq.current;
    setLoading(true);
    setLoadError('');
    try {
      const [q, r] = await Promise.all([
        API.get('/quotations', { params: { limit: 1000 } }),
        API.get('/quotations/requests'),
      ]);
      if (mine !== seq.current) return; // a newer load (e.g. brand switch) superseded this one
      setQuotations(q.data?.quotations || []);
      setQuotationRequests(r.data?.requests || []);
    } catch (err) {
      if (mine !== seq.current) return;
      setQuotations([]);
      setQuotationRequests([]);
      setLoadError(errMsg(err, 'Could not load quotations.'));
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  // Initial load, and reload (dropping the previous brand's records) when the brand changes
  useEffect(() => {
    setQuotations([]);
    setQuotationRequests([]);
    setSelectedQuotationId(null);
    setEditingQuotationId(null);
    refresh();
  }, [brandKey, refresh]);

  const upsert = (record) =>
    setQuotations((prev) => (prev.some((x) => x.id === record.id) ? prev.map((x) => (x.id === record.id ? record : x)) : [record, ...prev]));

  const call = async (fn, fallback) => {
    try {
      return await fn();
    } catch (err) {
      throw new Error(errMsg(err, fallback));
    }
  };

  // Create (Draft, or Sent when sending straight from the builder). Resolves to the stored quotation.
  const addQuotation = (newQuotation) =>
    call(async () => {
      const { data } = await API.post('/quotations', newQuotation);
      upsert(data.quotation);
      if (newQuotation.originatingRequestId) {
        setQuotationRequests((prev) =>
          prev.map((r) =>
            r.id === newQuotation.originatingRequestId
              ? { ...r, status: 'Quotation Created', quotationNumber: data.quotation.quotationNumber }
              : r
          )
        );
      }
      return data.quotation;
    }, 'Could not save the quotation.');

  const updateQuotation = (id, fields) =>
    call(async () => {
      const { data } = await API.put(`/quotations/${encodeURIComponent(id)}`, fields);
      upsert(data.quotation);
      return data.quotation;
    }, 'Could not update the quotation.');

  const deleteQuotation = (id) =>
    call(async () => {
      await API.delete(`/quotations/${encodeURIComponent(id)}`);
      setQuotations((prev) => prev.filter((q) => q.id !== id));
    }, 'Could not delete the quotation.');

  const duplicateQuotation = (id) =>
    call(async () => {
      const { data } = await API.post(`/quotations/${encodeURIComponent(id)}/duplicate`);
      upsert(data.quotation);
      return data.quotation;
    }, 'Could not duplicate the quotation.');

  const markReadyToSend = (id) =>
    call(async () => {
      const { data } = await API.post(`/quotations/${encodeURIComponent(id)}/ready`);
      upsert(data.quotation);
      return data.quotation;
    }, 'Could not update the quotation.');

  const cancelQuotation = (id, reason = '') =>
    call(async () => {
      const { data } = await API.post(`/quotations/${encodeURIComponent(id)}/cancel`, { reason });
      upsert(data.quotation);
      return data.quotation;
    }, 'Could not cancel the quotation.');

  // Record the buyer's response / move the status (server validates the transition)
  const updateQuotationStatus = (id, status, reason = '') =>
    call(async () => {
      const { data } = await API.patch(`/quotations/${encodeURIComponent(id)}/status`, { status, reason });
      upsert(data.quotation);
      return data.quotation;
    }, 'Could not change the quotation status.');

  // Accepted -> Converted to Order. Resolves to the purchase-order reference.
  const convertToOrder = (id) =>
    call(async () => {
      const { data } = await API.post(`/quotations/${encodeURIComponent(id)}/convert`);
      upsert(data.quotation);
      return data.quotation.purchaseOrderNumber;
    }, 'Could not convert the quotation.');

  /**
   * E-mail the quotation to the client. The server sends the mail and records the attempt
   * (status + log) on the stored quotation; local state is refreshed from its response.
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const sendQuotationEmail = async (id, emailPayload) => {
    try {
      const { data } = await API.post('/quotations/send-email', {
        quotationId: id,
        recipientEmail: emailPayload.recipientEmail,
        recipientName: emailPayload.recipientName || '',
        organizationName: emailPayload.organizationName || '',
        emailSubject: emailPayload.subject,
        emailBody: emailPayload.body,
      });
      if (data.quotation) upsert(data.quotation);
      return { success: data.success === true, message: data.message || `Email sent to ${emailPayload.recipientEmail}.` };
    } catch (err) {
      const stored = err?.response?.data?.quotation;
      if (stored) upsert(stored);
      return { success: false, message: errMsg(err, 'Email delivery failed. Please check SMTP configuration.') };
    }
  };

  // RFQ queue
  const replaceRequest = (r) => setQuotationRequests((prev) => prev.map((x) => (x.id === r.id ? r : x)));

  const updateRequestStatus = (requestId, newStatus) =>
    call(async () => {
      const { data } = await API.patch(`/quotations/requests/${encodeURIComponent(requestId)}/status`, { status: newStatus });
      replaceRequest(data.request);
      return data.request;
    }, 'Could not update the request.');

  const rejectQuotationRequest = (requestId, reason) =>
    call(async () => {
      const { data } = await API.post(`/quotations/requests/${encodeURIComponent(requestId)}/reject`, { reason });
      replaceRequest(data.request);
      return data.request;
    }, 'Could not reject the request.');

  const createQuotationRequest = (payload) =>
    call(async () => {
      const { data } = await API.post('/quotations/requests', payload);
      setQuotationRequests((prev) => [data.request, ...prev]);
      return data.request;
    }, 'Could not create the request.');

  // Prefill the quotation builder from an RFQ (client-side navigation state only)
  const startQuotationFromRequest = (req) => {
    const formattedItems = (req.requestedProducts || []).map((p, idx) => ({
      id: `item-${idx + 1}`,
      name: p.productName || 'Requested Item',
      sku: p.sku || `REQ-SKU-${idx + 1}`,
      description: 'Sourced as per buyer request specifications',
      hsn: '11010000',
      quantity: p.quantity || 1,
      unit: p.unit || 'Pcs',
      unitPrice: p.estimatedPrice || 100,
      discountType: 'percentage',
      discountValue: 0,
      gstRate: 5,
      taxableAmount: (p.quantity || 1) * (p.estimatedPrice || 100),
      taxAmount: ((p.quantity || 1) * (p.estimatedPrice || 100) * 5) / 100,
      lineTotal: (p.quantity || 1) * (p.estimatedPrice || 100) * 1.05,
    }));

    setPrefillData({
      originatingRequestId: req.id,
      quotationType: req.organizationType || 'Government',
      referenceNumber: req.requestNumber || req.id,
      subject: `Quotation for ${req.organizationName} - Bulk Procurement Requirement`,
      buyer: {
        organizationName: req.organizationName || '',
        organizationType: req.organizationType || 'Government',
        department: req.department || '',
        contactPerson: req.contactPerson || '',
        designation: req.designation || '',
        email: req.email || '',
        phone: req.phone || '',
        gstin: req.gstin || '',
        pan: '',
        billingAddress: req.billingAddress || req.deliveryLocation || '',
        shippingAddress: req.shippingAddress || req.deliveryLocation || '',
        city: req.city || '',
        state: req.state || '',
        pincode: req.pincode || '',
      },
      items: formattedItems.length > 0 ? formattedItems : null,
      commercialTerms: {
        deliveryLocation: req.deliveryLocation || '',
        deliveryTimeline: req.requiredDeliveryDate ? `Required by ${req.requiredDeliveryDate}` : 'Within 7 Working Days',
      },
    });
  };

  const getQuotationById = (id) => quotations.find((q) => q.id === id || q.quotationNumber === id) || null;

  return (
    <QuotationContext.Provider
      value={{
        quotations,
        quotationRequests,
        loading,
        loadError,
        refresh,
        prefillData,
        setPrefillData,
        selectedQuotationId,
        setSelectedQuotationId,
        editingQuotationId,
        setEditingQuotationId,
        addQuotation,
        updateQuotation,
        deleteQuotation,
        duplicateQuotation,
        markReadyToSend,
        cancelQuotation,
        updateQuotationStatus,
        convertToOrder,
        sendQuotationEmail,
        updateRequestStatus,
        rejectQuotationRequest,
        createQuotationRequest,
        startQuotationFromRequest,
        getQuotationById,
      }}
    >
      {children}
    </QuotationContext.Provider>
  );
};

export const useQuotations = () => {
  const context = useContext(QuotationContext);
  if (!context) {
    throw new Error('useQuotations must be used within a QuotationProvider');
  }
  return context;
};
