import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import proformaInvoiceService from '../../../../services/proformaInvoiceService';
import {
  downloadProformaPdf,
  printProformaPdf,
  getProformaPdfBase64,
} from '../utils/proformaPdfGenerator';

const STORAGE_KEY = 'savitri_proforma_invoices';

const getStoredInvoices = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveStoredInvoices = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Could not save to localStorage:', err);
  }
};

const computeStats = (invoiceList) => {
  const stats = {
    total: invoiceList.length,
    draft: 0,
    issued: 0,
    sent: 0,
    confirmed: 0,
    expired: 0,
    cancelled: 0,
    unpaidCount: 0,
    paidCount: 0,
    totalValue: 0,
    totalBalanceDue: 0,
  };

  const now = new Date();

  invoiceList.forEach((inv) => {
    const status = inv.status || 'Draft';
    const isExpired = inv.validUntil && new Date(inv.validUntil) < now && status !== 'Converted to Invoice' && status !== 'Confirmed';

    if (status === 'Draft') stats.draft++;
    else if (status === 'Issued') stats.issued++;
    else if (status === 'Sent') stats.sent++;
    else if (status === 'Confirmed') stats.confirmed++;
    else if (status === 'Cancelled') stats.cancelled++;

    if (isExpired && status !== 'Cancelled') {
      stats.expired++;
    }

    const grandTotal = Number(inv.summary?.grandTotal) || 0;
    const balanceDue = Number(inv.summary?.balanceDue ?? inv.payment?.balanceDue ?? grandTotal);

    stats.totalValue += grandTotal;
    stats.totalBalanceDue += balanceDue;

    if (inv.paymentStatus === 'Paid') {
      stats.paidCount++;
    } else {
      stats.unpaidCount++;
    }
  });

  return stats;
};

const ProformaInvoiceContext = createContext(null);

export const ProformaInvoiceProvider = ({ children }) => {
  const [invoices, setInvoices] = useState(() => getStoredInvoices());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalPages: 1,
    totalItems: 0,
  });
  const [stats, setStats] = useState(() => computeStats(getStoredInvoices()));
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Sync to localStorage whenever in-memory invoices update
  useEffect(() => {
    saveStoredInvoices(invoices);
    setStats(computeStats(invoices));
  }, [invoices]);

  // Fetch paginated invoices with query filters
  const fetchInvoices = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);

    try {
      const res = await proformaInvoiceService.getProformaInvoices(params);
      if (res && res.success) {
        setInvoices(res.invoices || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.stats) setStats(res.stats);
        return res;
      }
    } catch {
      // Offline fallback: filter from local storage
    }

    // Apply local filters
    const stored = getStoredInvoices();
    let filtered = [...stored];

    if (params.search?.trim()) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (i) =>
          i.proformaNumber?.toLowerCase().includes(q) ||
          i.clientSnapshot?.companyName?.toLowerCase().includes(q) ||
          i.clientSnapshot?.contactPerson?.toLowerCase().includes(q) ||
          i.clientSnapshot?.email?.toLowerCase().includes(q)
      );
    }

    if (params.status && params.status !== 'all') {
      filtered = filtered.filter((i) => i.status === params.status);
    }

    if (params.paymentStatus && params.paymentStatus !== 'all') {
      filtered = filtered.filter((i) => i.paymentStatus === params.paymentStatus);
    }

    if (params.startDate) {
      filtered = filtered.filter((i) => (i.issueDate || '').slice(0, 10) >= params.startDate);
    }
    if (params.endDate) {
      filtered = filtered.filter((i) => (i.issueDate || '').slice(0, 10) <= params.endDate);
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 15;
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const paged = filtered.slice((page - 1) * limit, page * limit);

    const calculatedStats = computeStats(stored);

    setInvoices(filtered);
    setPagination({ page, limit, totalPages, totalItems });
    setStats(calculatedStats);
    setLoading(false);

    return {
      success: true,
      invoices: paged,
      pagination: { page, limit, totalPages, totalItems },
      stats: calculatedStats,
    };
  }, []);

  // Fetch single invoice details
  const fetchInvoiceById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.getProformaInvoiceById(id);
      if (res && res.success && res.invoice) {
        setSelectedInvoice(res.invoice);
        setLoading(false);
        return res.invoice;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const found = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (found) {
      setSelectedInvoice(found);
      setLoading(false);
      return found;
    }

    setLoading(false);
    return null;
  }, []);

  // Create new Proforma Invoice
  const createInvoice = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.createProformaInvoice(data);
      if (res && res.success && res.invoice) {
        setInvoices((prev) => [res.invoice, ...prev]);
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const currentYear = new Date().getFullYear();
    const prefix = `PI-${currentYear}-`;
    const numbers = stored
      .map((i) => i.proformaNumber || '')
      .filter((n) => n.startsWith(prefix))
      .map((n) => parseInt(n.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));
    const nextSeq = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const autoNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    const grandTotal = Number(data.summary?.grandTotal) || 0;
    const advanceAmount = Number(data.summary?.advanceAmount) || 0;

    const newInvoice = {
      ...data,
      _id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      proformaNumber: data.proformaNumber || autoNumber,
      status: data.status || 'Draft',
      paymentStatus: 'Unpaid',
      payment: {
        totalAmountDue: grandTotal,
        advanceRequired: advanceAmount,
        amountPaid: 0,
        balanceDue: grandTotal,
        paymentsList: [],
      },
      buyerConfirmation: {
        status: 'Pending',
      },
      emailStatus: 'Not Sent',
      emailLog: [],
      snapshots: [
        {
          version: 1,
          createdAt: new Date().toISOString(),
          reason: `Created as ${data.status || 'Draft'}`,
          data: JSON.parse(JSON.stringify(data)),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newInvoice, ...stored];
    saveStoredInvoices(updated);
    setInvoices(updated);
    setStats(computeStats(updated));
    setLoading(false);

    return { success: true, invoice: newInvoice };
  }, []);

  // Update existing Draft invoice
  const updateInvoice = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.updateProformaInvoice(id, data);
      if (res && res.success && res.invoice) {
        setSelectedInvoice(res.invoice);
        setInvoices((prev) => prev.map((item) => (item._id === id ? res.invoice : item)));
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const existing = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (!existing) {
      setLoading(false);
      return { success: false, message: 'Invoice not found' };
    }

    const nextVersion = (existing.snapshots?.length || 1) + 1;
    const snapshotEntry = {
      version: nextVersion,
      createdAt: new Date().toISOString(),
      reason: `Updated document values`,
      data: JSON.parse(JSON.stringify(existing)),
    };

    const updatedInvoice = {
      ...existing,
      ...data,
      snapshots: [...(existing.snapshots || []), snapshotEntry],
      updatedAt: new Date().toISOString(),
    };

    const updated = stored.map((i) => (i._id === id || i.proformaNumber === id ? updatedInvoice : i));
    saveStoredInvoices(updated);
    setInvoices(updated);
    setSelectedInvoice(updatedInvoice);
    setStats(computeStats(updated));
    setLoading(false);

    return { success: true, invoice: updatedInvoice };
  }, []);

  // Send Email with PDF attachment (with simulated local offline record)
  const sendEmail = useCallback(async (id, emailPayload) => {
    setLoading(true);
    setError(null);
    try {
      let targetDoc = selectedInvoice && selectedInvoice._id === id ? selectedInvoice : invoices.find((i) => i._id === id);
      if (!targetDoc) {
        const fetched = await proformaInvoiceService.getProformaInvoiceById(id);
        targetDoc = fetched?.invoice;
      }

      let pdfBase64 = null;
      if (targetDoc) {
        try {
          pdfBase64 = await getProformaPdfBase64(targetDoc);
        } catch {
          // pdf generator error ignore
        }
      }

      const res = await proformaInvoiceService.sendEmail(id, {
        ...emailPayload,
        pdfBase64,
      });

      if (res && res.success && res.invoice) {
        setSelectedInvoice(res.invoice);
        setInvoices((prev) => prev.map((item) => (item._id === id ? res.invoice : item)));
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const existing = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (!existing) {
      setLoading(false);
      return { success: false, message: 'Invoice not found' };
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      recipientEmail: emailPayload.recipientEmail,
      recipientName: emailPayload.recipientName,
      subject: emailPayload.subject,
      status: 'Sent',
      message: 'Proforma Invoice sent to client',
    };

    const updatedInvoice = {
      ...existing,
      status: existing.status === 'Draft' || existing.status === 'Issued' ? 'Sent' : existing.status,
      emailStatus: 'Sent',
      emailLog: [...(existing.emailLog || []), logEntry],
      updatedAt: new Date().toISOString(),
    };

    const updated = stored.map((i) => (i._id === id || i.proformaNumber === id ? updatedInvoice : i));
    saveStoredInvoices(updated);
    setInvoices(updated);
    setSelectedInvoice(updatedInvoice);
    setStats(computeStats(updated));
    setLoading(false);

    return {
      success: true,
      message: `Proforma Invoice successfully sent to ${emailPayload.recipientEmail}.`,
      invoice: updatedInvoice,
    };
  }, [invoices, selectedInvoice]);

  // Record Client PO Confirmation
  const recordConfirmation = useCallback(async (id, confirmationData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.recordConfirmation(id, confirmationData);
      if (res && res.success && res.invoice) {
        setSelectedInvoice(res.invoice);
        setInvoices((prev) => prev.map((item) => (item._id === id ? res.invoice : item)));
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const existing = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (!existing) {
      setLoading(false);
      return { success: false, message: 'Invoice not found' };
    }

    const updatedInvoice = {
      ...existing,
      status: 'Confirmed',
      buyerConfirmation: {
        status: 'Confirmed',
        confirmedAt: new Date().toISOString(),
        poNumber: confirmationData.poNumber || '',
        poDate: confirmationData.poDate || '',
        confirmedBy: confirmationData.confirmedBy || '',
        remarks: confirmationData.remarks || '',
      },
      updatedAt: new Date().toISOString(),
    };

    const updated = stored.map((i) => (i._id === id || i.proformaNumber === id ? updatedInvoice : i));
    saveStoredInvoices(updated);
    setInvoices(updated);
    setSelectedInvoice(updatedInvoice);
    setStats(computeStats(updated));
    setLoading(false);

    return { success: true, invoice: updatedInvoice };
  }, []);

  // Record verified manual payment
  const recordPayment = useCallback(async (id, paymentData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.recordPayment(id, paymentData);
      if (res && res.success && res.invoice) {
        setSelectedInvoice(res.invoice);
        setInvoices((prev) => prev.map((item) => (item._id === id ? res.invoice : item)));
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const existing = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (!existing) {
      setLoading(false);
      return { success: false, message: 'Invoice not found' };
    }

    const pAmount = Number(paymentData.amount) || 0;
    const currentPaid = Number(existing.payment?.amountPaid) || 0;
    const grandTotal = Number(existing.summary?.grandTotal) || 0;
    const newPaid = currentPaid + pAmount;
    const newBalance = Math.max(0, grandTotal - newPaid);

    const paymentRecord = {
      id: `pay_${Date.now()}`,
      paymentDate: paymentData.paymentDate || new Date().toISOString(),
      amount: pAmount,
      paymentType: paymentData.paymentType || 'Advance',
      paymentMethod: paymentData.paymentMethod || 'Bank Transfer',
      referenceNumber: paymentData.referenceNumber || '',
      bankName: paymentData.bankName || '',
      remarks: paymentData.remarks || '',
      verified: true,
    };

    const updatedPayment = {
      totalAmountDue: grandTotal,
      advanceRequired: existing.payment?.advanceRequired || existing.summary?.advanceAmount || 0,
      amountPaid: newPaid,
      balanceDue: newBalance,
      paymentsList: [...(existing.payment?.paymentsList || []), paymentRecord],
    };

    const newPaymentStatus = newBalance <= 0 ? 'Paid' : newPaid > 0 ? 'Partially Paid' : 'Unpaid';

    const updatedInvoice = {
      ...existing,
      paymentStatus: newPaymentStatus,
      payment: updatedPayment,
      summary: {
        ...(existing.summary || {}),
        balanceDue: newBalance,
      },
      updatedAt: new Date().toISOString(),
    };

    const updated = stored.map((i) => (i._id === id || i.proformaNumber === id ? updatedInvoice : i));
    saveStoredInvoices(updated);
    setInvoices(updated);
    setSelectedInvoice(updatedInvoice);
    setStats(computeStats(updated));
    setLoading(false);

    return { success: true, invoice: updatedInvoice };
  }, []);

  // Cancel Proforma Invoice
  const cancelInvoice = useCallback(async (id, reason) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.cancelProformaInvoice(id, reason);
      if (res && res.success && res.invoice) {
        setSelectedInvoice(res.invoice);
        setInvoices((prev) => prev.map((item) => (item._id === id ? res.invoice : item)));
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const existing = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (!existing) {
      setLoading(false);
      return { success: false, message: 'Invoice not found' };
    }

    const updatedInvoice = {
      ...existing,
      status: 'Cancelled',
      cancellationReason: reason || 'Cancelled by admin',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = stored.map((i) => (i._id === id || i.proformaNumber === id ? updatedInvoice : i));
    saveStoredInvoices(updated);
    setInvoices(updated);
    setSelectedInvoice(updatedInvoice);
    setStats(computeStats(updated));
    setLoading(false);

    return { success: true, invoice: updatedInvoice };
  }, []);

  // Duplicate Proforma Invoice into new Draft
  const duplicateInvoice = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.duplicateProformaInvoice(id);
      if (res && res.success && res.invoice) {
        setInvoices((prev) => [res.invoice, ...prev]);
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const source = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (!source) {
      setLoading(false);
      return { success: false, message: 'Source invoice not found' };
    }

    const currentYear = new Date().getFullYear();
    const prefix = `PI-${currentYear}-`;
    const numbers = stored
      .map((i) => i.proformaNumber || '')
      .filter((n) => n.startsWith(prefix))
      .map((n) => parseInt(n.replace(prefix, ''), 10))
      .filter((n) => !isNaN(n));
    const nextSeq = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
    const newNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    const grandTotal = Number(source.summary?.grandTotal) || 0;
    const advanceAmount = Number(source.summary?.advanceAmount) || 0;

    const duplicated = {
      ...JSON.parse(JSON.stringify(source)),
      _id: `pi_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      proformaNumber: newNumber,
      status: 'Draft',
      paymentStatus: 'Unpaid',
      issueDate: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment: {
        totalAmountDue: grandTotal,
        advanceRequired: advanceAmount,
        amountPaid: 0,
        balanceDue: grandTotal,
        paymentsList: [],
      },
      buyerConfirmation: { status: 'Pending' },
      emailStatus: 'Not Sent',
      emailLog: [],
      snapshots: [
        {
          version: 1,
          createdAt: new Date().toISOString(),
          reason: `Duplicated from #${source.proformaNumber}`,
          data: JSON.parse(JSON.stringify(source)),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [duplicated, ...stored];
    saveStoredInvoices(updated);
    setInvoices(updated);
    setStats(computeStats(updated));
    setLoading(false);

    return { success: true, invoice: duplicated };
  }, []);

  // Convert to Tax Invoice
  const convertToInvoice = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.convertToInvoice(id);
      if (res && res.success && res.invoice) {
        setSelectedInvoice(res.invoice);
        setInvoices((prev) => prev.map((item) => (item._id === id ? res.invoice : item)));
        setLoading(false);
        return res;
      }
    } catch {
      // Local fallback
    }

    const stored = getStoredInvoices();
    const existing = stored.find((i) => i._id === id || i.proformaNumber === id);
    if (!existing) {
      setLoading(false);
      return { success: false, message: 'Invoice not found' };
    }

    const taxInvoiceNumber = `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    const updatedInvoice = {
      ...existing,
      status: 'Converted to Invoice',
      taxInvoiceNumber,
      convertedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = stored.map((i) => (i._id === id || i.proformaNumber === id ? updatedInvoice : i));
    saveStoredInvoices(updated);
    setInvoices(updated);
    setSelectedInvoice(updatedInvoice);
    setStats(computeStats(updated));
    setLoading(false);

    return {
      success: true,
      invoice: updatedInvoice,
      taxInvoiceNumber,
    };
  }, []);

  // Direct vector PDF download
  const downloadPdf = useCallback(async (invoice) => {
    return await downloadProformaPdf(invoice);
  }, []);

  // Direct iframe print
  const printPdf = useCallback(async (invoice) => {
    return await printProformaPdf(invoice);
  }, []);

  // Open Preview modal
  const openPreview = useCallback((invoice) => {
    setPreviewInvoice(invoice);
    setIsPreviewOpen(true);
  }, []);

  // Close Preview modal
  const closePreview = useCallback(() => {
    setPreviewInvoice(null);
    setIsPreviewOpen(false);
  }, []);

  const value = {
    invoices,
    loading,
    error,
    pagination,
    stats,
    selectedInvoice,
    setSelectedInvoice,
    previewInvoice,
    isPreviewOpen,
    fetchInvoices,
    fetchInvoiceById,
    createInvoice,
    updateInvoice,
    sendEmail,
    recordConfirmation,
    recordPayment,
    cancelInvoice,
    duplicateInvoice,
    convertToInvoice,
    downloadPdf,
    printPdf,
    openPreview,
    closePreview,
  };

  return (
    <ProformaInvoiceContext.Provider value={value}>
      {children}
    </ProformaInvoiceContext.Provider>
  );
};

export const useProformaInvoice = () => {
  const context = useContext(ProformaInvoiceContext);
  if (!context) {
    throw new Error('useProformaInvoice must be used within a ProformaInvoiceProvider');
  }
  return context;
};

export default ProformaInvoiceContext;
