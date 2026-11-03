import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import proformaInvoiceService from '../../../../services/proformaInvoiceService';
import {
  downloadProformaPdf,
  printProformaPdf,
  getProformaPdfBase64,
} from '../utils/proformaPdfGenerator';

/**
 * Proforma Invoice state - the server (MongoDB) is the only source of truth.
 * There is no localStorage copy and no offline fallback. Failed requests reject with the original
 * axios error, so callers can show `err.response.data.message`; list/detail loads record the message in `error`.
 */
const EMPTY_STATS = {
  total: 0, draft: 0, issued: 0, sent: 0, confirmed: 0, expired: 0, cancelled: 0,
  unpaidCount: 0, paidCount: 0, totalValue: 0, totalBalanceDue: 0,
};

const messageOf = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

const ProformaInvoiceContext = createContext(null);

export const ProformaInvoiceProvider = ({ children }) => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalItems: 0 });
  const [stats, setStats] = useState(EMPTY_STATS);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Keep the cached list row and the open detail in step with the server's version of a document.
  const applyServerInvoice = useCallback((invoice) => {
    if (!invoice?._id) return;
    setSelectedInvoice(invoice);
    setInvoices((prev) => prev.map((item) => (item._id === invoice._id ? invoice : item)));
  }, []);

  const fetchInvoices = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.getProformaInvoices(params);
      setInvoices(res.invoices || []);
      if (res.pagination) setPagination(res.pagination);
      setStats({ ...EMPTY_STATS, ...(res.stats || {}) });
      return res;
    } catch (err) {
      setError(messageOf(err, 'Could not load Proforma Invoices from the server.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoiceById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await proformaInvoiceService.getProformaInvoiceById(id);
      if (res?.invoice) {
        setSelectedInvoice(res.invoice);
        return res.invoice;
      }
      return null;
    } catch (err) {
      setError(messageOf(err, 'Could not load the Proforma Invoice.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Wrap a mutating call: no silent fallback - success only if the server accepted it.
  const mutate = useCallback(async (call) => {
    setError(null);
    const res = await call();
    if (res?.invoice) applyServerInvoice(res.invoice);
    return res;
  }, [applyServerInvoice]);

  const createInvoice = useCallback(async (data) => {
    const res = await proformaInvoiceService.createProformaInvoice(data);
    if (res?.invoice) setInvoices((prev) => [res.invoice, ...prev]);
    return res;
  }, []);

  const updateInvoice = useCallback((id, data) => mutate(() => proformaInvoiceService.updateProformaInvoice(id, data)), [mutate]);

  const sendEmail = useCallback(async (id, emailPayload) => {
    let target = selectedInvoice && selectedInvoice._id === id ? selectedInvoice : invoices.find((i) => i._id === id);
    if (!target) {
      target = (await proformaInvoiceService.getProformaInvoiceById(id))?.invoice;
    }
    let pdfBase64 = null;
    if (target) {
      try { pdfBase64 = await getProformaPdfBase64(target); } catch { /* PDF attachment is optional */ }
    }
    try {
      return await mutate(() => proformaInvoiceService.sendEmail(id, { ...emailPayload, pdfBase64 }));
    } catch (err) {
      // A failed delivery is recorded on the document by the server - bring the real state in.
      if (err?.response?.data?.invoice) applyServerInvoice(err.response.data.invoice);
      throw err;
    }
  }, [selectedInvoice, invoices, mutate, applyServerInvoice]);

  const recordConfirmation = useCallback((id, data) => mutate(() => proformaInvoiceService.recordConfirmation(id, data)), [mutate]);
  const recordPayment = useCallback((id, data) => mutate(() => proformaInvoiceService.recordPayment(id, data)), [mutate]);
  const cancelInvoice = useCallback((id, reason) => mutate(() => proformaInvoiceService.cancelProformaInvoice(id, reason)), [mutate]);

  const duplicateInvoice = useCallback(async (id) => {
    const res = await proformaInvoiceService.duplicateProformaInvoice(id);
    if (res?.invoice) setInvoices((prev) => [res.invoice, ...prev]);
    return res;
  }, []);

  // The backend reports (422) when there is no Tax Invoice module - the error propagates to the page.
  const convertToInvoice = useCallback((id) => mutate(() => proformaInvoiceService.convertToInvoice(id)), [mutate]);

  const downloadPdf = useCallback((invoice) => downloadProformaPdf(invoice), []);
  const printPdf = useCallback((invoice) => printProformaPdf(invoice), []);
  const openPreview = useCallback((invoice) => { setPreviewInvoice(invoice); setIsPreviewOpen(true); }, []);
  const closePreview = useCallback(() => { setPreviewInvoice(null); setIsPreviewOpen(false); }, []);

  // Drop any state that belongs to a previous session/brand if the provider is reused.
  useEffect(() => () => { setInvoices([]); setSelectedInvoice(null); }, []);

  const value = {
    invoices, loading, error, pagination, stats, selectedInvoice, setSelectedInvoice,
    previewInvoice, isPreviewOpen,
    fetchInvoices, fetchInvoiceById, createInvoice, updateInvoice, sendEmail,
    recordConfirmation, recordPayment, cancelInvoice, duplicateInvoice, convertToInvoice,
    downloadPdf, printPdf, openPreview, closePreview,
  };

  return <ProformaInvoiceContext.Provider value={value}>{children}</ProformaInvoiceContext.Provider>;
};

export const useProformaInvoice = () => {
  const context = useContext(ProformaInvoiceContext);
  if (!context) {
    throw new Error('useProformaInvoice must be used within a ProformaInvoiceProvider');
  }
  return context;
};

export default ProformaInvoiceContext;
