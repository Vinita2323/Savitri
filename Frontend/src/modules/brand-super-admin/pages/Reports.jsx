import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';
import { formatINR } from '../mock/brandMockData';
import { downloadCsv } from '../utils/csvExport';

const TABS = [
  { id: 'sales', label: 'Brand sales' },
  { id: 'orders', label: 'Orders' },
  { id: 'sellers', label: 'Seller performance' },
  { id: 'captains', label: 'Captain performance' },
  { id: 'expenses', label: 'Expenses' },
];

const Reports = () => {
  const { brands, sellerPerf, captainPerf, expenseRows } = useBrandSuperAdmin();
  const [tab, setTab] = useState('sales');
  const [brandFilter, setBrandFilter] = useState('all');
  const [from, setFrom] = useState('2026-05-01');
  const [to, setTo] = useState('2026-10-17');

  const brandFiltered = (brandId) => brandFilter === 'all' || brandId === brandFilter;

  const rows = useMemo(() => {
    if (tab === 'sales') {
      return brands.filter((b) => brandFiltered(b.id)).map((b) => ({
        brand: b.name,
        city: b.city,
        sales: b.sales,
        orders: b.orders,
        expenses: b.expenses,
      }));
    }
    if (tab === 'orders') {
      return brands.filter((b) => brandFiltered(b.id)).map((b) => ({
        brand: b.name,
        orders: b.orders,
        avgOrder: Math.round(b.sales / Math.max(b.orders, 1)),
        status: b.status,
      }));
    }
    if (tab === 'sellers') {
      return sellerPerf.filter((s) => brandFiltered(s.brandId)).map((s) => ({
        seller: s.name,
        brand: brands.find((b) => b.id === s.brandId)?.name,
        orders: s.orders,
        sales: s.sales,
        rating: s.rating,
      }));
    }
    if (tab === 'captains') {
      return captainPerf.filter((c) => brandFiltered(c.brandId)).map((c) => ({
        captain: c.name,
        brand: brands.find((b) => b.id === c.brandId)?.name,
        deliveries: c.deliveries,
        earnings: c.earnings,
        onTime: c.onTime,
      }));
    }
    return expenseRows
      .filter((e) => brandFiltered(e.brandId) && e.date >= from && e.date <= to)
      .map((e) => ({
        category: e.category,
        brand: brands.find((b) => b.id === e.brandId)?.name,
        date: e.date,
        amount: e.amount,
      }));
  }, [tab, brands, sellerPerf, captainPerf, expenseRows, brandFilter, from, to]);

  const exportCsv = () => {
    if (!rows.length) return;
    const columns = Object.keys(rows[0]).map((key) => ({
      key,
      label: key,
      value: (row) => (typeof row[key] === 'number' && (key.includes('sales') || key.includes('amount') || key.includes('earnings') || key === 'avgOrder') ? row[key] : row[key]),
    }));
    downloadCsv(`demo-${tab}-report.csv`, rows, columns);
  };

  const cell = (key, val) => {
    if (['sales', 'expenses', 'earnings', 'amount', 'avgOrder'].includes(key) && typeof val === 'number') {
      return formatINR(val);
    }
    return val;
  };

  return (
    <div className="min-h-full">
      <BrandSuperAdminHeader
        title="Reports"
        subtitle="Frontend filters + CSV export of mock rows only"
        actions={
          <button
            type="button"
            onClick={exportCsv}
            disabled={!rows.length}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-none bg-[#79B433] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"
          >
            <Download size={14} /> Export CSV (demo)
          </button>
        }
      />

      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                tab === t.id ? 'border-[#79B433] bg-[#79B433] text-white' : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none"
          >
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          {rows.length === 0 ? (
            <p className="p-8 text-center text-xs font-semibold text-slate-400">No demo rows for current filters.</p>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase text-slate-400">
                <tr>
                  {Object.keys(rows[0]).map((k) => (
                    <th key={k} className="px-4 py-3 font-bold">
                      {k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    {Object.keys(row).map((k) => (
                      <td key={k} className="px-4 py-2.5 font-semibold text-slate-700">
                        {cell(k, row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
