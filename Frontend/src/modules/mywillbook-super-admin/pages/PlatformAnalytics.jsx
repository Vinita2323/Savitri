import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  PageHeader,
  FilterBar,
  SimpleBarChart,
  formatINR,
  StatusBadge,
  btnPrimaryClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import {
  ANALYTICS_SERIES,
  CANCELLATION_STATS,
  SELLER_PERF,
  CAPTAIN_PERF,
  ANALYTICS_EXPORT_ROWS,
} from '../data/mockData';

const fieldClass =
  'rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#FF9418]';

const downloadCsv = (filename, rows, columns) => {
  if (!rows?.length || !columns?.length) return;
  const escape = (val) => {
    const s = String(val ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = columns.map((c) => escape(c.label)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escape(typeof c.value === 'function' ? c.value(row) : row[c.key])).join(','))
    .join('\n');
  const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const PlatformAnalytics = () => {
  const ctx = useMyWillBookSuperAdmin();
  const series = ctx?.analyticsSeries ?? ANALYTICS_SERIES;
  const [fromDate, setFromDate] = useState('2026-10-01');
  const [toDate, setToDate] = useState('2026-10-19');
  const [compareBy, setCompareBy] = useState('brand');

  const comparison = useMemo(
    () => (compareBy === 'city' ? series.citySales : series.brandSales),
    [compareBy, series]
  );

  const handleExport = () => {
    downloadCsv('mywillbook-platform-analytics-demo.csv', ANALYTICS_EXPORT_ROWS, [
      { key: 'brand', label: 'Brand' },
      { key: 'city', label: 'City' },
      { key: 'orders', label: 'Orders' },
      { key: 'sales', label: 'Sales' },
      { key: 'cancellations', label: 'Cancellations' },
      { key: 'range', label: 'Date Range', value: () => `${fromDate} to ${toDate}` },
    ]);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Platform Analytics"
        subtitle="Brand and city comparisons, trends, and performance (demo)"
        breadcrumbs={['MyWillBook', 'Overview', 'Platform Analytics']}
        actions={
          <button type="button" onClick={handleExport} className={btnPrimaryClass}>
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <FilterBar>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">From</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">To</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={fieldClass} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Compare</label>
          <select value={compareBy} onChange={(e) => setCompareBy(e.target.value)} className={fieldClass}>
            <option value="brand">Brand-wise</option>
            <option value="city">City-wise</option>
          </select>
        </div>
        <p className="text-[10px] font-semibold text-amber-600 sm:ml-auto">
          Demo filter — static sample series ({fromDate} → {toDate})
        </p>
      </FilterBar>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-700">
            {compareBy === 'city' ? 'City-wise' : 'Brand-wise'} comparison
          </p>
          <SimpleBarChart data={comparison || []} color="#FF9418" valueFormatter={formatINR} />
        </div>
        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-700">Membership revenue trend</p>
          <SimpleBarChart
            data={series.membershipRevenue || []}
            color="#31551C"
            valueFormatter={formatINR}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-700">Sales trend</p>
          <SimpleBarChart data={series.salesTrend || []} color="#FF9418" valueFormatter={formatINR} />
        </div>
        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-700">Order trend</p>
          <SimpleBarChart data={series.orderTrend || []} color="#31551C" />
        </div>
      </div>

      <div className={tableWrapClass}>
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-extrabold text-slate-800">Cancellation stats</p>
          <p className="text-[10px] font-semibold text-amber-600">Top cancellation reasons (demo)</p>
        </div>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Reason</th>
              <th className={thClass}>Count</th>
              <th className={thClass}>Rate</th>
            </tr>
          </thead>
          <tbody>
            {CANCELLATION_STATS.map((row) => (
              <tr key={row.id}>
                <td className={`${tdClass} font-bold text-slate-800`}>{row.reason}</td>
                <td className={tdClass}>{row.count}</td>
                <td className={tdClass}>
                  <StatusBadge status="Pending" />
                  <span className="ml-2 font-bold text-amber-700">{row.rate}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tableWrapClass}>
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-extrabold text-slate-800">Seller performance</p>
          </div>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Seller</th>
                <th className={thClass}>Brand</th>
                <th className={thClass}>Orders</th>
                <th className={thClass}>Sales</th>
                <th className={thClass}>Rating</th>
              </tr>
            </thead>
            <tbody>
              {SELLER_PERF.map((row) => (
                <tr key={row.id}>
                  <td className={`${tdClass} font-bold`}>{row.name}</td>
                  <td className={tdClass}>{row.brand}</td>
                  <td className={tdClass}>{row.orders}</td>
                  <td className={`${tdClass} font-extrabold text-[#31551C]`}>{formatINR(row.sales)}</td>
                  <td className={`${tdClass} font-bold text-[#FF9418]`}>{row.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={tableWrapClass}>
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-extrabold text-slate-800">Captain performance</p>
          </div>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Captain</th>
                <th className={thClass}>City</th>
                <th className={thClass}>Deliveries</th>
                <th className={thClass}>Earnings</th>
                <th className={thClass}>On-time</th>
              </tr>
            </thead>
            <tbody>
              {CAPTAIN_PERF.map((row) => (
                <tr key={row.id}>
                  <td className={`${tdClass} font-bold`}>{row.name}</td>
                  <td className={tdClass}>{row.city}</td>
                  <td className={tdClass}>{row.deliveries}</td>
                  <td className={`${tdClass} font-extrabold text-[#31551C]`}>{formatINR(row.earnings)}</td>
                  <td className={`${tdClass} font-bold text-[#FF9418]`}>{row.onTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalytics;
