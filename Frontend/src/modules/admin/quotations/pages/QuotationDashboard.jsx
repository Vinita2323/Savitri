import React, { useMemo } from 'react';
import {
  FileText,
  Clock,
  Send,
  Eye,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  Building2,
  Inbox,
  AlertCircle,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';
import { useQuotations } from '../context/QuotationContext';
import { formatINR } from '../utils/quotationCalculations';
import { QuotationStatusChip } from '../components/QuotationStatusChip';

export const QuotationDashboard = ({ onNavigate }) => {
  const { quotations, quotationRequests, setSelectedQuotationId, startQuotationFromRequest } = useQuotations();

  // Metrics calculations
  const stats = useMemo(() => {
    const total = quotations.length;
    const drafts = quotations.filter((q) => q.status === 'Draft').length;
    const sent = quotations.filter((q) => q.status === 'Sent').length;
    const pendingResponses = quotations.filter(
      (q) => q.status === 'Sent' || q.status === 'Under Review' || q.status === 'Revision Requested'
    ).length;
    const accepted = quotations.filter(
      (q) => q.status === 'Accepted' || q.status === 'Converted to Order'
    ).length;

    const totalValue = quotations.reduce((acc, q) => acc + (q.summary?.grandTotal || 0), 0);
    const acceptedValue = quotations
      .filter((q) => q.status === 'Accepted' || q.status === 'Converted to Order')
      .reduce((acc, q) => acc + (q.summary?.grandTotal || 0), 0);

    return {
      total,
      drafts,
      sent,
      pendingResponses,
      accepted,
      totalValue,
      acceptedValue,
    };
  }, [quotations]);

  // Recent 5 quotations
  const recentQuotations = useMemo(() => {
    return [...quotations]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);
  }, [quotations]);

  // Recent pending requests
  const recentRequests = useMemo(() => {
    return [...quotationRequests]
      .filter((r) => r.status !== 'Rejected')
      .slice(0, 4);
  }, [quotationRequests]);

  // Simulated Monthly Activity data for visual chart
  const monthlyActivity = [
    { month: 'May 2026', count: 4, value: 185000, height: '40%' },
    { month: 'Jun 2026', count: 7, value: 320000, height: '60%' },
    { month: 'Jul 2026', count: 9, value: 410000, height: '75%' },
    { month: 'Aug 2026', count: 6, value: 290000, height: '55%' },
    { month: 'Sep 2026', count: 12, value: 580000, height: '90%' },
    { month: 'Oct 2026', count: 15, value: 720000, height: '100%' },
  ];

  const handleViewQuotation = (id) => {
    setSelectedQuotationId(id);
    onNavigate('quotations/details');
  };

  const handleCreateFromRequest = (req) => {
    startQuotationFromRequest(req);
    onNavigate('quotations/create');
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#1A2E0A] text-[#F7941D]">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                Quotation Management Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Enterprise B2B procurement & commercial quote pipeline for Government & Institutional clients
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('quotations')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            All Quotations
          </button>
          <button
            type="button"
            onClick={() => onNavigate('quotations/create')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-all cursor-pointer shadow-xs border-none"
          >
            <PlusCircle size={15} className="text-[#F7941D]" />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Total */}
        <div
          onClick={() => onNavigate('quotations')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs transition-all hover:shadow-md hover:border-[#F7941D] cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Quotes</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <FileText size={16} />
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-900">{stats.total}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">All generated bids</p>
          </div>
        </div>

        {/* Card 2: Drafts */}
        <div
          onClick={() => onNavigate('quotations')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs transition-all hover:shadow-md hover:border-slate-400 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drafts</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <Clock size={16} />
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-slate-700">{stats.drafts}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">Work in progress</p>
          </div>
        </div>

        {/* Card 3: Sent */}
        <div
          onClick={() => onNavigate('quotations')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs transition-all hover:shadow-md hover:border-blue-400 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Sent Quotes</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Send size={16} />
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-blue-900">{stats.sent}</h3>
            <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Dispatched to buyers</p>
          </div>
        </div>

        {/* Card 4: Pending Responses */}
        <div
          onClick={() => onNavigate('quotations')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs transition-all hover:shadow-md hover:border-amber-400 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Resp.</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Eye size={16} />
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-amber-900">{stats.pendingResponses}</h3>
            <p className="text-[11px] text-amber-700 mt-0.5 font-medium">Awaiting decision</p>
          </div>
        </div>

        {/* Card 5: Accepted */}
        <div
          onClick={() => onNavigate('quotations/accepted')}
          className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs transition-all hover:shadow-md hover:border-emerald-400 cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Accepted</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-emerald-900">{stats.accepted}</h3>
            <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">Ready for PO / Order</p>
          </div>
        </div>

        {/* Card 6: Total Value */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A2E0A]">Total Pipeline</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-[#1A2E0A]">
              <TrendingUp size={16} />
            </span>
          </div>
          <div className="mt-2.5">
            <h3 className="text-lg sm:text-xl font-black font-mono text-[#1A2E0A] truncate">
              {formatINR(stats.totalValue)}
            </h3>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
              Won: {formatINR(stats.acceptedValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Grid: Activity Chart & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Activity Chart (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Quotation Volume & Activity</h3>
              <p className="text-xs text-slate-500">6-Month historical quotation dispatch & valuation trend</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              +28% MoM Growth
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-56 pt-6 pb-2 flex items-end justify-between gap-3 px-2">
            {monthlyActivity.map((bar, bIdx) => (
              <div key={bIdx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatINR(bar.value)}
                </div>
                <div className="w-full bg-slate-100 rounded-t-xl h-40 flex items-end p-1">
                  <div
                    style={{ height: bar.height }}
                    className="w-full rounded-lg bg-gradient-to-t from-[#1A2E0A] to-[#79B433] group-hover:from-[#F7941D] group-hover:to-[#fba33f] transition-all relative flex items-center justify-center shadow-xs"
                  >
                    <span className="text-[10px] font-bold text-white font-mono opacity-80 group-hover:opacity-100">
                      {bar.count}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-600 text-center truncate max-w-full">
                  {bar.month.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#1A2E0A]" />
                <span>Quotation Volume (Count)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F7941D]" />
                <span>Pipeline Value</span>
              </span>
            </div>
            <span className="font-semibold text-slate-700">Financial Year 2026-27</span>
          </div>
        </div>

        {/* Status Distribution Breakdown (1 col) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Quotation Status Breakdown</h3>
            <p className="text-xs text-slate-500">Live operational quote lifecycle state</p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: 'Accepted / Won', count: stats.accepted, color: 'bg-emerald-500', total: stats.total },
              { label: 'Sent & Dispatched', count: stats.sent, color: 'bg-blue-500', total: stats.total },
              { label: 'Drafts in Preparation', count: stats.drafts, color: 'bg-slate-400', total: stats.total },
              { label: 'Pending Review / Revision', count: stats.pendingResponses - stats.sent, color: 'bg-amber-500', total: stats.total },
              { label: 'Expired / Closed', count: quotations.filter((q) => q.status === 'Expired' || q.status === 'Rejected').length, color: 'bg-rose-400', total: stats.total },
            ].map((st, sIdx) => {
              const pct = stats.total > 0 ? Math.round((st.count / stats.total) * 100) : 0;
              return (
                <div key={sIdx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{st.label}</span>
                    <span className="font-mono font-bold text-slate-900">
                      {st.count} <span className="text-[11px] text-slate-400">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${st.color}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => onNavigate('quotations')}
              className="w-full py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer text-center"
            >
              View Full Quotations Audit
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Quotations & Recent RFQ Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotations Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent Generated Quotations</h3>
              <p className="text-xs text-slate-500">Latest business bids in platform</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('quotations')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#F7941D] hover:underline cursor-pointer bg-transparent border-none"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Quote #</th>
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentQuotations.map((q) => (
                  <tr
                    key={q.id}
                    onClick={() => handleViewQuotation(q.id)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-[#1A2E0A]">{q.quotationNumber}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800 block truncate max-w-[190px]">
                        {q.buyer?.organizationName || 'N/A'}
                      </span>
                      <span className="text-[11px] text-slate-500 block">{q.quotationType}</span>
                    </td>
                    <td className="py-3 px-3">
                      <QuotationStatusChip status={q.status} size="sm" />
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(q.summary?.grandTotal || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Incoming Quotation Requests (RFQs) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Incoming Buyer Requests (RFQs)</h3>
                <p className="text-xs text-slate-500">Institutional & Government inquiries pending quote</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('quotations/requests')}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#F7941D] hover:underline cursor-pointer bg-transparent border-none"
            >
              <span>Manage RFQs</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-slate-200 p-3.5 hover:border-slate-300 bg-slate-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-600 bg-slate-200/80 px-1.5 py-0.5 rounded text-[10px]">
                      {req.requestNumber || req.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                      {req.organizationType}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900">{req.organizationName}</h4>
                  <p className="text-[11px] text-slate-500">
                    Required by: <strong>{req.requiredDeliveryDate}</strong> • Location: {req.city || 'Indore'}
                  </p>
                </div>

                <div className="sm:text-right shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCreateFromRequest(req)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A2E0A] hover:bg-[#2F5218] text-white text-xs font-bold transition-colors cursor-pointer border-none shadow-2xs"
                  >
                    <PlusCircle size={13} className="text-[#F7941D]" />
                    <span>Create Quote</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
