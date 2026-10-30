import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_QUOTATIONS,
  INITIAL_QUOTATION_REQUESTS,
} from '../data/mockQuotations';
import { generateNextQuotationNumber } from '../utils/quotationCalculations';

const QuotationContext = createContext(null);

const getQuoteKey = (suffix) => {
  const brand =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('shippnex_super_admin_brand') || 'brand_fg'
      : 'brand_fg';
  return `savitri_mock_${suffix}_${brand}`;
};

export const QuotationProvider = ({ children }) => {
  // Load quotations from localStorage or fallback to initial mock data
  const [quotations, setQuotations] = useState(() => {
    try {
      const saved = localStorage.getItem(getQuoteKey('quotations'));
      return saved ? JSON.parse(saved) : INITIAL_QUOTATIONS;
    } catch (e) {
      return INITIAL_QUOTATIONS;
    }
  });

  // Load quotation requests from localStorage or fallback
  const [quotationRequests, setQuotationRequests] = useState(() => {
    try {
      const saved = localStorage.getItem(getQuoteKey('quotation_requests'));
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
      localStorage.setItem(getQuoteKey('quotations'), JSON.stringify(quotations));
    } catch (e) {}
  }, [quotations]);

  useEffect(() => {
    try {
      localStorage.setItem(getQuoteKey('quotation_requests'), JSON.stringify(quotationRequests));
    } catch (e) {}
  }, [quotationRequests]);

  // Create new quotation (Draft)
  const addQuotation = (newQuotation) => {
    const quoteNumber = newQuotation.quotationNumber || generateNextQuotationNumber(quotations);
    const quotationWithMeta = {
      ...newQuotation,
      id: quoteNumber,
      quotationNumber: quoteNumber,
      createdAt: newQuotation.createdAt || new Date().toISOString(),
      status: newQuotation.status || 'Draft',
      emailStatus: newQuotation.emailStatus || 'Not Sent',
      emailLog: newQuotation.emailLog || [],
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
      emailStatus: 'Not Sent',
      emailLog: [],
      subject: `${source.subject} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: null,
      sentAt: null,
    };

    setQuotations((prev) => [duplicated, ...prev]);
    return duplicated;
  };

  // Mark quotation as "Ready to Send" (status update only — no email)
  const markReadyToSend = (id) => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: 'Ready to Send',
              updatedAt: new Date().toISOString(),
            }
          : q
      )
    );
  };

  // Cancel / close a quotation
  const cancelQuotation = (id, reason = '') => {
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              status: 'Cancelled',
              cancellationReason: reason,
              cancelledAt: new Date().toISOString(),
            }
          : q
      )
    );
  };

  /**
   * Send quotation email to client via backend API.
   * Records the attempt result (success/failure) in the quotation's emailLog.
   *
   * @param {string} id - Quotation ID
   * @param {Object} emailPayload - { recipientEmail, subject, body }
   * @returns {Promise<{success: boolean, message: string}>}
   */
  const sendQuotationEmail = async (id, emailPayload) => {
    const quotation = quotations.find((q) => q.id === id);
    if (!quotation) {
      return { success: false, message: 'Quotation not found.' };
    }

    // Optimistically mark as Sending
    setQuotations((prev) =>
      prev.map((q) =>
        q.id === id ? { ...q, emailStatus: 'Sending' } : q
      )
    );

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiBase}/quotations/send-email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quotationId: id,
          quotationNumber: quotation.quotationNumber,
          recipientEmail: emailPayload.recipientEmail,
          recipientName: emailPayload.recipientName || quotation.buyer?.contactPerson || '',
          organizationName: emailPayload.organizationName || quotation.buyer?.organizationName || '',
          emailSubject: emailPayload.subject,
          emailBody: emailPayload.body,
          grandTotal: quotation.summary?.grandTotal || 0,
          validUntil: quotation.validUntil,
        }),
      });

      const data = await response.json();

      const logEntry = {
        timestamp: new Date().toISOString(),
        recipientEmail: emailPayload.recipientEmail,
        subject: emailPayload.subject,
        success: data.success === true,
        error: data.success ? null : (data.message || 'Unknown error'),
        messageId: data.messageId || null,
      };

      if (data.success) {
        setQuotations((prev) =>
          prev.map((q) =>
            q.id === id
              ? {
                  ...q,
                  status: q.status === 'Draft' ? 'Sent' : q.status,
                  emailStatus: 'Sent',
                  sentAt: new Date().toISOString(),
                  lastEmailSentAt: new Date().toISOString(),
                  emailLog: [...(q.emailLog || []), logEntry],
                }
              : q
          )
        );
        return { success: true, message: `Email successfully sent to ${emailPayload.recipientEmail}.` };
      } else {
        setQuotations((prev) =>
          prev.map((q) =>
            q.id === id
              ? {
                  ...q,
                  emailStatus: 'Failed',
                  emailLog: [...(q.emailLog || []), logEntry],
                }
              : q
          )
        );
        return { success: false, message: data.message || 'Email delivery failed. Please check SMTP configuration.' };
      }
    } catch (err) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        recipientEmail: emailPayload.recipientEmail,
        subject: emailPayload.subject,
        success: false,
        error: err.message || 'Network error',
        messageId: null,
      };

      setQuotations((prev) =>
        prev.map((q) =>
          q.id === id
            ? {
                ...q,
                emailStatus: 'Failed',
                emailLog: [...(q.emailLog || []), logEntry],
              }
            : q
        )
      );
      return { success: false, message: `Network error: ${err.message}. Is the backend server running?` };
    }
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
        markReadyToSend,
        cancelQuotation,
        sendQuotationEmail,
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
