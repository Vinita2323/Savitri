import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  FilterBar,
  Pagination,
  formatINR,
  btnPrimaryClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
  fieldClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_COMMISSIONS, INITIAL_BRANDS } from '../data/mockData';

const CommissionReports = () => {
  const ctx = useMyWillBookSuperAdmin();
  const commissions = ctx?.commissions ?? INITIAL_COMMISSIONS;
  const brands = ctx?.brands ?? INITIAL_BRANDS;

  const [q, setQ] = useState('');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const rateForBrand = (brandId, fallback) => {
    const b = brands.find((x) => x.id === brandId);
    return b?.commissionRate ?? b?.config?.commissionPercent ?? fallback;
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return commissions.filter((c) => {
      const matchesQ =
        !term ||
        (c.brand || '').toLowerCase().includes(term) ||
        (c.seller || '').toLowerCase().includes(term) ||
        (c.orderId || '').toLowerCase().includes(term) ||
        (c.period || '').toLowerCase().includes(term);
      const matchesBrand = brandFilter === 'all' || c.brandId === brandFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesQ && matchesBrand && matchesStatus;
    });
  }, [commissions, q, brandFilter, statusFilter]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const byBrand = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const key = c.brandId || c.brand;
      if (!map[key]) {
        map[key] = {
          brand: c.brand,
          brandId: c.brandId,
          orders: 0,
          amount: 0,
          rate: rateForBrand(c.brandId, c.rate),
        };
      }
      map[key].orders += c.orders || 0;
      map[key].amount += c.amount || 0;
    });
    return Object.values(map);
  }, [filtered, brands]);

  const bySeller = useMemo(() => {
    const map = {};
    filtered.forEach((c) => {
      const key = `${c.seller}|${c.brandId}`;
      if (!map[key]) {
        map[key] = {
          seller: c.seller,
          brand: c.brand,
          orders: 0,
          amount: 0,
        };
      }
      map[key].orders += c.orders || 0;
      map[key].amount += c.amount || 0;
    });
    return Object.values(map);
  }, [filtered]);

  const exportCsv = () => {
    const headers = [
      'id',
      'brand',
      'seller',
      'orderId',
      'period',
      'orders',
      'rate',
      'brandRate',
      'amount',
      'status',
    ];
    const lines = [
      headers.join(','),
      ...filtered.map((c) =>
        [
          c.id,
          `"${c.brand || ''}"`,
          `"${c.seller || ''}"`,
          c.orderId,
          `"${c.period || ''}"`,
          c.orders,
          c.rate,
          rateForBrand(c.brandId, c.rate),
          c.amount,
          c.status,
        ].join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commission-report-demo-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Commission Reports"
        subtitle="Brand, seller, and order commission breakdowns (demo rates from brands)"
        breadcrumbs={['MyWillBook', 'Finance', 'Commission Reports']}
        actions={
          <button type="button" onClick={exportCsv} className={btnPrimaryClass}>
            <Download size={14} /> Export CSV
          </button>
        }
      />

      <FilterBar>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search brand, seller, order…"
          className={`${fieldClass} sm:min-w-[220px] sm:flex-1`}
        />
        <select
          value={brandFilter}
          onChange={(e) => {
            setBrandFilter(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="all">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="all">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Paid">Paid</option>
        </select>
      </FilterBar>

      <div>
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">By brand</h2>
        {byBrand.length === 0 ? (
          <EmptyState title="No brand commissions." description="Adjust filters (demo)." />
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>Rate (from brand)</th>
                  <th className={thClass}>Orders</th>
                  <th className={thClass}>Commission</th>
                </tr>
              </thead>
              <tbody>
                {byBrand.map((row) => (
                  <tr key={row.brandId || row.brand}>
                    <td className={`${tdClass} font-extrabold`}>{row.brand}</td>
                    <td className={tdClass}>{row.rate}%</td>
                    <td className={tdClass}>{row.orders.toLocaleString('en-IN')}</td>
                    <td className={`${tdClass} font-extrabold text-[#31551C]`}>
                      {formatINR(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">By seller</h2>
        {bySeller.length === 0 ? (
          <EmptyState title="No seller commissions." description="Adjust filters (demo)." />
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Seller</th>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>Orders</th>
                  <th className={thClass}>Commission</th>
                </tr>
              </thead>
              <tbody>
                {bySeller.map((row) => (
                  <tr key={`${row.seller}-${row.brand}`}>
                    <td className={`${tdClass} font-extrabold`}>{row.seller}</td>
                    <td className={tdClass}>{row.brand}</td>
                    <td className={tdClass}>{row.orders.toLocaleString('en-IN')}</td>
                    <td className={`${tdClass} font-extrabold text-[#31551C]`}>
                      {formatINR(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">By order</h2>
        {pageRows.length === 0 ? (
          <EmptyState title="No order commissions." description="Demo empty state." />
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Order</th>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>Seller</th>
                  <th className={thClass}>Period</th>
                  <th className={thClass}>Rate</th>
                  <th className={thClass}>Brand rate</th>
                  <th className={thClass}>Amount</th>
                  <th className={thClass}>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr key={c.id}>
                    <td className={`${tdClass} font-extrabold`}>{c.orderId}</td>
                    <td className={tdClass}>{c.brand}</td>
                    <td className={tdClass}>{c.seller}</td>
                    <td className={tdClass}>{c.period}</td>
                    <td className={tdClass}>{c.rate}%</td>
                    <td className={tdClass}>{rateForBrand(c.brandId, c.rate)}%</td>
                    <td className={`${tdClass} font-extrabold text-[#31551C]`}>
                      {formatINR(c.amount)}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default CommissionReports;
