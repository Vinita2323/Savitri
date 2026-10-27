import React, { createContext, useContext, useState, useCallback } from 'react';
import deliveryChallanService from '../../../../services/deliveryChallanService';
import { downloadDeliveryChallanPdf, printDeliveryChallanPdf } from '../utils/deliveryChallanPdfGenerator';

const DeliveryChallanContext = createContext();

export const DeliveryChallanProvider = ({ children }) => {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalItems: 0 });
  const [stats, setStats] = useState({ total: 0, draft: 0, dispatched: 0, partiallyDelivered: 0, delivered: 0, cancelled: 0 });
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [previewChallanData, setPreviewChallanData] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fetchChallans = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deliveryChallanService.getChallans(params);
      if (res.success) {
        setChallans(res.challans || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.stats) setStats(res.stats);
      }
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load delivery challans';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChallanById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deliveryChallanService.getChallanById(id);
      if (res.success && res.challan) {
        setSelectedChallan(res.challan);
      }
      return res.challan;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load challan details';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createChallan = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deliveryChallanService.createChallan(data);
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create delivery challan';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateChallan = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deliveryChallanService.updateChallan(id, data);
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update delivery challan';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const finalizeChallan = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deliveryChallanService.finalizeChallan(id);
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to finalize delivery challan';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id, data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deliveryChallanService.updateStatus(id, data);
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update delivery status';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelChallan = useCallback(async (id, reason) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deliveryChallanService.cancelChallan(id, reason);
      return res;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to cancel delivery challan';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const openPreview = useCallback((challanData) => {
    setPreviewChallanData(challanData);
    setIsPreviewOpen(true);
  }, []);

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewChallanData(null);
  }, []);

  const downloadPdf = useCallback(async (challan) => {
    return await downloadDeliveryChallanPdf(challan);
  }, []);

  const printPdf = useCallback(async (challan) => {
    return await printDeliveryChallanPdf(challan);
  }, []);

  return (
    <DeliveryChallanContext.Provider
      value={{
        challans,
        loading,
        error,
        pagination,
        stats,
        selectedChallan,
        setSelectedChallan,
        previewChallanData,
        isPreviewOpen,
        fetchChallans,
        fetchChallanById,
        createChallan,
        updateChallan,
        finalizeChallan,
        updateStatus,
        cancelChallan,
        openPreview,
        closePreview,
        downloadPdf,
        printPdf,
      }}
    >
      {children}
    </DeliveryChallanContext.Provider>
  );
};

export const useDeliveryChallan = () => {
  const context = useContext(DeliveryChallanContext);
  if (!context) {
    throw new Error('useDeliveryChallan must be used within a DeliveryChallanProvider');
  }
  return context;
};

export default DeliveryChallanContext;
