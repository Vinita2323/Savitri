import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_QUOTATIONS,
  INITIAL_QUOTATION_REQUESTS,
} from '../data/mockQuotations';
import { generateNextQuotationNumber } from '../utils/quotationCalculations';

const QuotationContext = createContext(null);

export const QuotationProvider = ({ children }) => {
  // Load quotations from localStorage or fallback to initial mock data
  const [quotations, setQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem('savitri_mock_quotations');
      return saved ? JSON.parse(saved) : INITIAL_QUOTATIONS;
    } catch (e) {
      return INITIAL_QUOTATIONS;
    }
  });

  // Load quotation requests from localStorage or fallback
  const [quotationRequests, setQuotationRequests] = useState(() => {
    try {
      const saved = localStorage.getItem('savitri_mock_quotation_requests');
      return saved ? JSON.parse(saved) : INITIAL_QUOTATION_REQUESTS;
    } catch (e) {
      return INITIAL_QUOTATION_REQUESTS;
    }
  });

  // State to pass prefilled data from RFQ to Create Quotation page
  const [prefillData, setPrefillData] = useState(null);

  // State for actively viewed quotation details / print / preview
  const [selectedQuotationId, setSelectedQuotationId] = useState(null);

  // Editing draft state
  const [editingQuotationId, setEditingQuotationId] = useState(null);

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('savitri_mock_quotations', JSON.stringify(quotations));
    } catch (e) {}
  }, [quotations]);

  useEffect(() => {
    try {
      localStorage.setItem('savitri_mock_quotation_requests', JSON.stringify(quotationRequests));
    } catch (e) {}
  }, [quotationRequests]);

  // Create new quotation (Draft or Sent)
  const addQuotation = (newQuotation) => {
    const quoteNumber = newQuotation.quotationNumber || generateNextQuotationNumber(quotations);
    const quotationWithMeta = {
      ...newQuotation,
      id: quoteNumber,
      quotationNumber: quoteNumber,
      createdAt: newQuotation.createdAt || new Date().toISOString(),
      status: newQuotation.status || 'Draft',
    };

    setQuotations((prev) => [quotationWithMeta, ...prev]);

    // If originated from an RFQ, mark request as "Quotation Created"
    if (newQuotation.originatingRequestId) {
      setQuotationRequests((prevReqs) =>
        prevReqs.map((req) =>
          req.id === newQuotation.originatingRequestId
            ? { ...req, status: 'Quotation Created', quotationNumber: quoteNumber }
            : req
        )
      );
    }

    return quotationWithMeta;
  };

  // Update existing quotation
  const updateQuotation = (id, updatedFields) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updatedFields, updatedAt: new Date().toISOString() } : q))
    );
  };

  // Delete draft quotation
  const deleteQuotation = (id) => {
    setQuotations((prev) => prev.filter((q) => q.id !== id));
  };

  // Duplicate an existing quotation as a new Draft
  const duplicateQuotation = (id) => {
    const source = quotations.find((q) => q.id === id);
    if (!source) return null;

    const newNumber = generateNextQuotationNumber(quotations);
    const today = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const duplicated = {
      ...source,
      id: newNumber,
      quotationNumber: newNumber,
      quotationDate: today,
      validUntil: validUntil,
      status: 'Draft',
      subject: `${source.subject} (Copy)`,
      createdAt: new Date().toISOString(),
      acceptedAt: null,
      convertedOrderId: null,
    };

    setQuotations((prev) => [duplicated, ...prev]);
    return duplicated;
  };

  // Simulate sending quotation
  const sendQuotation = (id) => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: 'Sent',
              sentAt: new Date().toISOString(),
            }
          : q
      )
    );
  };

  // Simulate accepting quotation
  const acceptQuotation = (id) => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: 'Accepted',
              acceptedAt: new Date().toISOString(),
            }
          : q
      )
    );
  };

  // Simulate rejecting quotation
  const rejectQuotation = (id, reason = 'Client decided to postpone requirement') => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: 'Rejected',
              rejectedAt: new Date().toISOString(),
              rejectionReason: reason,
            }
          : q
      )
    );
  };

  // Convert accepted quotation to order
  const convertToOrder = (id) => {
    const orderNumber = `ORD-QT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: 'Converted to Order',
              convertedOrderId: orderNumber,
              convertedAt: new Date().toISOString(),
            }
          : q
      )
    );
    return orderNumber;
  };

  // Update RFQ request status
  const updateRequestStatus = (requestId, newStatus) => {
    setQuotationRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status: newStatus } : req))
    );
  };

  // Reject quotation request
  const rejectQuotationRequest = (requestId, reason) => {
    setQuotationRequests((prev) =>
      prev.map((req) =>
        req.id === requestId ? { ...req, status: 'Rejected', rejectionReason: reason } : req
      )
    );
  };

  // Start creating quotation from RFQ request
  const startQuotationFromRequest = (req) => {
    const formattedItems = (req.requestedProducts || []).map((p, idx) => ({
      id: `item-${idx + 1}`,
      name: p.productName || 'Requested Item',
      sku: p.sku || `REQ-SKU-${idx + 1}`,
      description: `Sourced as per buyer request specifications`,
      hsn: '11010000',
      quantity: p.quantity || 1,
      unit: p.unit || 'Pcs',
      unitPrice: p.estimatedPrice || 100,
      discountType: 'percentage',
      discountValue: 0,
      gstRate: 5,
      taxableAmount: (p.quantity || 1) * (p.estimatedPrice || 100),
      taxAmount: ((p.quantity || 1) * (p.estimatedPrice || 100) * 5) / 100,
      lineTotal: ((p.quantity || 1) * (p.estimatedPrice || 100) * 1.05),
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
        city: req.city || 'Indore',
        state: req.state || 'Madhya Pradesh',
        pincode: req.pincode || '452001',
      },
      items: formattedItems.length > 0 ? formattedItems : null,
      commercialTerms: {
        deliveryLocation: req.deliveryLocation || '',
        deliveryTimeline: req.requiredDeliveryDate ? `Required by ${req.requiredDeliveryDate}` : 'Within 7 Working Days',
      },
    });
  };

  const getQuotationById = (id) => {
    return quotations.find((q) => q.id === id || q.quotationNumber === id) || null;
  };

  return (
    <QuotationContext.Provider
      value={{
        quotations,
        quotationRequests,
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
        sendQuotation,
        acceptQuotation,
        rejectQuotation,
        convertToOrder,
        updateRequestStatus,
        rejectQuotationRequest,
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
