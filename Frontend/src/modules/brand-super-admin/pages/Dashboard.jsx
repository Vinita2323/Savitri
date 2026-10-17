import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  Users,
  Truck,
  ShoppingBag,
  IndianRupee,
  Receipt,
  Clock3,
} from 'lucide-react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { useBrandSuperAdmin } from '../context/BrandSuperAdminContext';
import { formatINR } from '../mock/brandMockData';

const StatCard = ({ icon: Icon, label, value, tone }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
        <p className="mt-1 text-[10px] font-semibold text-amber-600">Demo metric</p>
      </div>
      <div className={`rounded-xl p-2 ${tone}`}>
        <Icon size={16} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { summary, brands, monthlyTrends, recentActivity } = useBrandSuperAdmin();
  const maxSales = Math.max(...brands.map((b) => b.sales), 1);
  const maxRev = Math.max(...monthlyTrends.map((m) => m.revenue), 1);

  return (
    <div className="min-h-full">
      <BrandSuperAdminHeader
        title="Platform Dashboard"
        subtitle="Cross-brand operational snapshot (demonstration data)"
      />

      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Store} label="Total Brands" value={summary.totalBrands} tone="bg-emerald-50 text-emerald-700" />
          <StatCard icon={MapPin} label="Total Cities" value={summary.totalCities} tone="bg-sky-50 text-sky-700" />
          <StatCard icon={Users} label="Total Sellers" value={summary.totalSellers} tone="bg-violet-50 text-violet-700" />
          <StatCard icon={Truck} label="Delivery Captains" value={summary.totalCaptains} tone="bg-orange-50 text-orange-700" />
          <StatCard icon={ShoppingBag} label="Total Orders" value={summary.totalOrders.toLocaleString('en-IN')} tone="bg-blue-50 text-blue-700" />
          <StatCard icon={IndianRupee} label="Combined Sales" value={formatINR(summary.combinedSales)} tone="bg-lime-50 text-[#689A2B]" />
          <StatCard icon={Receipt} label="Recorded Expenses" value={formatINR(summary.totalExpenses)} tone="bg-rose-50 text-rose-700" />
          <StatCard icon={Clock3} label="Pending Approvals" value={summary.pendingApprovals} tone="bg-amber-50 text-amber-700" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900">Brand-wise sales comparison</h2>
            <p className="mb-4 text-[10px] font-semibold text-amber-600">Demo chart — mock sales figures</p>
            <div className="space-y-3">
              {brands.map((b) => (
                <div key={b.id}>
                  <div className="mb-1 flex justify-between text-xs font-bold text-slate-700">
                    <span>{b.name}</span>
                    <span>{formatINR(b.sales)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#79B433]"
                      style={{ width: `${Math.max(6, (b.sales / maxSales) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <h2 className="text-sm font-extrabold text-slate-900">Orders & revenue trends</h2>
            <p className="mb-4 text-[10px] font-semibold text-amber-600">Demo trend — last 6 months (mock)</p>
            <div className="flex h-40 items-end gap-2">
              {monthlyTrends.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-[#79B433] to-[#F7941D]/80"
                    style={{ height: `${Math.max(12, (m.revenue / maxRev) * 100)}%` }}
                    title={`${m.month}: ${m.orders} orders · ${formatINR(m.revenue)}`}
                  />
                  <span className="text-[10px] font-bold text-slate-500">{m.month}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Brand performance</h2>
                <p className="text-[10px] font-semibold text-amber-600">Demo table</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/brand-super-admin/brands')}
                className="cursor-pointer rounded-lg border-none bg-[#79B433]/10 px-3 py-1.5 text-[11px] font-bold text-[#689A2B]"
              >
                Manage brands
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-100 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="py-2 pr-3 font-bold">Brand</th>
                    <th className="py-2 pr-3 font-bold">City</th>
                    <th className="py-2 pr-3 font-bold">Orders</th>
                    <th className="py-2 pr-3 font-bold">Sales</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b.id} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3 font-bold text-slate-800">{b.name}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{b.city}</td>
                      <td className="py-2.5 pr-3 font-semibold">{b.orders}</td>
                      <td className="py-2.5 pr-3 font-semibold">{formatINR(b.sales)}</td>
                      <td className="py-2.5">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            b.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-2">
            <h2 className="text-sm font-extrabold text-slate-900">Recent activity</h2>
            <p className="mb-3 text-[10px] font-semibold text-amber-600">Demo feed</p>
            <ul className="space-y-3">
              {recentActivity.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800">{a.text}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">{a.time}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h2 className="text-sm font-extrabold text-slate-900">Brand-wise operational summary</h2>
          <p className="mb-4 text-[10px] font-semibold text-amber-600">Demo cards</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => navigate(`/brand-super-admin/brands/${b.id}`)}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[#79B433]"
              >
                <p className="text-sm font-extrabold text-slate-900">{b.name}</p>
                <p className="text-[11px] font-medium text-slate-500">{b.city} · {b.code}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-black text-slate-900">{b.sellers}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400">Sellers</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{b.captains}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400">Captains</p>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{b.products}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400">SKUs</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
