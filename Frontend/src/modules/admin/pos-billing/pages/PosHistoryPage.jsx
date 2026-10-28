import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { posService } from '../../../../services/posService';
import { PosReceiptModal } from '../components/PosReceiptModal';
import { PosProvider, usePos } from '../context/PosContext';
import { downloadPosReceiptPdf } from '../utils/posPdfGenerator';
import {
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  Printer,
  FileDown,
  ShoppingBag,
  Truck,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Eye,
} from 'lucide-react';

const PosHistoryContent = () => {
  const navigate = useNavigate();
  const { setLastCompletedSale, setIsReceiptModalOpen } = usePos();

  const [sales, setSales] = useState([]);
  const [metrics, setMetrics] = useState({
    todaySales: 0,
    todayTransactionsCount: 0,
    counterSalesTotal: 0,
    counterSalesCount: 0,
    deliveryOrdersTotal: 0,
    deliveryOrdersCount: 0,
    pendingBalanceDue: 0,
    pendingPaymentsCount: 0,
    heldBillsCount: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [saleTypeFilter, setSaleTypeFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [historyData, summaryData] = await Promise.all([
        posService.getPosHistory({
          search: searchQuery,
          saleType: saleTypeFilter,
          paymentStatus: paymentStatusFilter,
          paymentMethod: paymentMethodFilter,
        }),
        posService.getDashboardSummary(),
      ]);

      setSales(historyData.sales || []);
      setMetrics(summaryData || {});
    } catch (err) {
      console.error('Error loading POS history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [saleTypeFilter, paymentStatusFilter, paymentMethodFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleViewReceipt = (sale) => {
    setLastCompletedSale(sale);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="p-6 bg-gray-50/50 min-h-[calc(100vh-4rem)] space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/super-admin/pos-billing')}
            className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-colors"
            title="Back to POS Terminal"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
              POS Sales History & Analytics
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Complete audit log of Counter Sales and Admin-created Delivery Orders
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/super-admin/pos-billing')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open POS Terminal</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today's POS Sales
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-gray-900">
              ₹{(metrics.todaySales || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {metrics.todayTransactionsCount || 0} bills today
            </span>
          </div>
        </div>

        {/* Counter Sales (Walk-ins) */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Counter Sales (Walk-in)
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-800">
              ₹{(metrics.counterSalesTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {metrics.counterSalesCount || 0} sales
            </span>
          </div>
        </div>

        {/* Delivery Orders via POS */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              POS Delivery Orders
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-900">
              ₹{(metrics.deliveryOrdersTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-gray-500">
              {metrics.deliveryOrdersCount || 0} orders
            </span>
          </div>
        </div>

        {/* Pending & Held Balances */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Pending / Held Queue
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-900">
              {metrics.heldBillsCount || 0} Bills
            </span>
            <span className="text-xs font-medium text-amber-700">
              ₹{(metrics.pendingBalanceDue || 0).toFixed(0)} due
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-3">
          {/* Search text box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice number, order ID, customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Sale Type */}
          <select
            value={saleTypeFilter}
            onChange={(e) => setSaleTypeFilter(e.target.value)}
            className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Sale Types</option>
            <option value="COUNTER_SALE">Counter Sales (Walk-in)</option>
            <option value="DELIVERY_ORDER">Delivery Orders</option>
          </select>

          {/* Payment Status */}
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Fully Paid</option>
            <option value="PARTIAL">Partial Payment</option>
            <option value="PENDING">Pending (COD)</option>
          </select>

          {/* Payment Method */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI / QR</option>
            <option value="CARD">Card POS</option>
            <option value="NETBANKING">Net Banking</option>
            <option value="COD">Cash on Delivery</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Apply Filters
          </button>
        </form>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Invoice / Date</th>
                <th className="py-3.5 px-4">Sale Type</th>
                <th className="py-3.5 px-4">Store Location</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4 text-center">Items</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    Loading sales records...
                  </td>
                </tr>
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale._id || sale.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Invoice & Date */}
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-gray-900 text-xs">
                        {sale.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        {new Date(sale.createdAt || Date.now()).toLocaleString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>

                    {/* Sale Type */}
                    <td className="py-3 px-4">
                      {sale.saleType === 'DELIVERY_ORDER' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Truck className="w-3 h-3" /> Delivery Order
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShoppingBag className="w-3 h-3" /> Counter Sale
                        </span>
                      )}
                      {sale.orderId && (
                        <span className="block font-mono text-[10px] text-gray-500 mt-0.5">
                          {sale.orderId}
                        </span>
                      )}
                    </td>

                    {/* Store */}
                    <td className="py-3 px-4 font-medium text-gray-700">
                      {sale.store?.storeName || 'Indore Hub'}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        {sale.customer?.name || 'Walk-in Customer'}
                      </div>
                      {sale.customer?.phone && (
                        <div className="text-[11px] text-gray-400 font-mono">
                          +91 {sale.customer.phone}
                        </div>
                      )}
                    </td>

                    {/* Items Count */}
                    <td className="py-3 px-4 text-center font-bold text-gray-600">
                      {sale.items?.length || 0}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-extrabold text-sm text-gray-900">
                        ₹{Number(sale.grandTotal || 0).toFixed(2)}
                      </span>
                    </td>

                    {/* Payment Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-gray-800">
                          {sale.payment?.method || 'CASH'}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            sale.payment?.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sale.payment?.status === 'PARTIAL'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {sale.payment?.status || 'PAID'}
                        </span>
                      </div>
                      {sale.payment?.balanceDue > 0 && (
                        <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          Bal: ₹{sale.payment.balanceDue.toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => downloadPosReceiptPdf(sale, 'A4')}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1 border border-blue-200 transition-colors"
                          title="Download Tax Invoice PDF"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleViewReceipt(sale)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-emerald-50 text-gray-700 hover:text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Print or View Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    No transactions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embedded Receipt Modal for Past Sales */}
      <PosReceiptModal />
    </div>
  );
};

export const PosHistoryPage = () => {
  return (
    <PosProvider>
      <PosHistoryContent />
    </PosProvider>
  );
};

export default PosHistoryPage;
