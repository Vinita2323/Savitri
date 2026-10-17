import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';
import { formatINR } from '../mock/brandMockData';

const Metric = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
    <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
    <p className="mt-1 text-base font-black text-slate-900">{value}</p>
    <p className="text-[9px] font-semibold text-amber-600">Demo</p>
  </div>
);

const BrandOverview = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { brands, setSelectedBrandId, sellerPerf, captainPerf, expenseRows } = useBrandSuperAdmin();

  const brand = useMemo(() => brands.find((b) => b.id === brandId), [brands, brandId]);

  useEffect(() => {
    if (brand) setSelectedBrandId(brand.id);
  }, [brand, setSelectedBrandId]);

  if (!brand) {
    return (
      <div className="p-6">
        <p className="text-sm font-bold text-slate-600">Brand not found in demonstration data.</p>
        <button type="button" className="mt-3 cursor-pointer text-[#79B433]" onClick={() => navigate('/brand-super-admin/brands')}>
          Back
        </button>
      </div>
    );
  }

  const sellers = sellerPerf.filter((s) => s.brandId === brand.id);
  const captains = captainPerf.filter((c) => c.brandId === brand.id);
  const expenses = expenseRows.filter((e) => e.brandId === brand.id);

  return (
    <div className="min-h-full">
      <BrandSuperAdminHeader
        title={brand.name}
        subtitle={`${brand.code} · ${brand.city} · brand overview (demo)`}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/brand-super-admin/brands')}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
            >
              <ArrowLeft size={14} /> Brands
            </button>
            <button
              type="button"
              onClick={() => navigate(`/brand-super-admin/brands/${brand.id}/edit`)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border-none bg-[#79B433] px-3 py-2 text-xs font-bold text-white"
            >
              <Pencil size={14} /> Edit
            </button>
          </div>
        }
      />

      <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img src={brand.logo} alt="" className="h-16 w-16 rounded-2xl border border-slate-100 object-contain bg-slate-50 p-1" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-600">{brand.address}</p>
              <p className="mt-1 text-xs text-slate-500">
                Contact {brand.contact} · GST {brand.gst}
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                brand.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {brand.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Sales / Revenue" value={formatINR(brand.sales)} />
          <Metric label="Orders" value={brand.orders.toLocaleString('en-IN')} />
          <Metric label="Recorded Expenses" value={formatINR(brand.expenses)} />
          <Metric label="Inventory Value" value={formatINR(brand.inventoryValue)} />
          <Metric label="Sellers" value={brand.sellers} />
          <Metric label="Captains" value={brand.captains} />
          <Metric label="Products / SKUs" value={brand.products} />
          <Metric label="Net (demo)" value={formatINR(brand.sales - brand.expenses)} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-extrabold">Top sellers (demo)</h3>
            {sellers.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">No demo seller rows for this brand.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sellers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-bold text-slate-800">{s.name}</span>
                    <span className="font-semibold text-slate-600">
                      {s.orders} orders · {formatINR(s.sales)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-extrabold">Captains (demo)</h3>
            {captains.length === 0 ? (
              <p className="mt-3 text-xs text-slate-400">No demo captain rows for this brand.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {captains.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-bold text-slate-800">{c.name}</span>
                    <span className="font-semibold text-slate-600">
                      {c.deliveries} trips · {formatINR(c.earnings)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-extrabold">Recorded expenses (demo)</h3>
          {expenses.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">No demo expense rows.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2 font-bold">Category</th>
                    <th className="py-2 font-bold">Date</th>
                    <th className="py-2 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t border-slate-50">
                      <td className="py-2 font-semibold">{e.category}</td>
                      <td className="py-2 text-slate-500">{e.date}</td>
                      <td className="py-2 font-bold">{formatINR(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default BrandOverview;
