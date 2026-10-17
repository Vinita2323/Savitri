import React from 'react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';
import { formatINR } from '../mock/brandMockData';

const Card = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
    <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>
    <p className="mb-3 text-[10px] font-semibold text-amber-600">Read-only demonstration figures</p>
    {children}
  </section>
);

const FinancialOverview = () => {
  const { brands, selectedBrand, expenseRows, captainPerf, sellerPerf } = useBrandSuperAdmin();
  const maxSales = Math.max(...brands.map((b) => b.sales), 1);
  const maxExp = Math.max(...brands.map((b) => b.expenses), 1);

  const brandExpenses = expenseRows.filter((e) => e.brandId === selectedBrand?.id);
  const brandCaptains = captainPerf.filter((c) => c.brandId === selectedBrand?.id);
  const brandSellers = sellerPerf.filter((s) => s.brandId === selectedBrand?.id);

  const commissionDemo = Math.round((selectedBrand?.sales || 0) * 0.08);
  const captainPayoutDemo = brandCaptains.reduce((s, c) => s + c.earnings, 0);
  const codDemo = Math.round((selectedBrand?.sales || 0) * 0.35);
  const refundDemo = Math.round((selectedBrand?.sales || 0) * 0.02);

  return (
    <div className="min-h-full">
      <BrandSuperAdminHeader
        title="Financial Overview"
        subtitle="Mock finance rollups — not live ledger data"
      />

      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Seller commission (demo)', value: formatINR(commissionDemo) },
            { label: 'Captain payouts (demo)', value: formatINR(captainPayoutDemo) },
            { label: 'COD collection (demo)', value: formatINR(codDemo) },
            { label: 'Refunds / settlements (demo)', value: formatINR(refundDemo) },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-bold uppercase text-slate-400">{c.label}</p>
              <p className="mt-1 text-lg font-black text-slate-900">{c.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Sales by brand">
            <div className="space-y-3">
              {brands.map((b) => (
                <div key={b.id}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span>{b.name}</span>
                    <span>{formatINR(b.sales)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#79B433]" style={{ width: `${(b.sales / maxSales) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Recorded expenses by brand">
            <div className="space-y-3">
              {brands.map((b) => (
                <div key={b.id}>
                  <div className="mb-1 flex justify-between text-xs font-bold">
                    <span>{b.name}</span>
                    <span>{formatINR(b.expenses)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#F7941D]" style={{ width: `${(b.expenses / maxExp) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card title={`Seller commission — ${selectedBrand?.name || 'Brand'}`}>
            <ul className="space-y-2 text-xs">
              {brandSellers.map((s) => (
                <li key={s.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-semibold">{s.name}</span>
                  <span className="font-bold">{formatINR(Math.round(s.sales * 0.08))}</span>
                </li>
              ))}
              {brandSellers.length === 0 && <li className="text-slate-400">No demo sellers</li>}
            </ul>
          </Card>
          <Card title={`Captain payout — ${selectedBrand?.name || 'Brand'}`}>
            <ul className="space-y-2 text-xs">
              {brandCaptains.map((c) => (
                <li key={c.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-bold">{formatINR(c.earnings)}</span>
                </li>
              ))}
              {brandCaptains.length === 0 && <li className="text-slate-400">No demo captains</li>}
            </ul>
          </Card>
          <Card title={`Expense lines — ${selectedBrand?.name || 'Brand'}`}>
            <ul className="space-y-2 text-xs">
              {brandExpenses.map((e) => (
                <li key={e.id} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="font-semibold">{e.category}</span>
                  <span className="font-bold">{formatINR(e.amount)}</span>
                </li>
              ))}
              {brandExpenses.length === 0 && <li className="text-slate-400">No demo expenses</li>}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;
