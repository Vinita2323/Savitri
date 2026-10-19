import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  ShoppingBag,
  IndianRupee,
  Wallet,
  Users,
  Truck,
  Clock3,
  CircleDot,
  Ban,
} from 'lucide-react';
import {
  PageHeader,
  StatCard,
  SimpleBarChart,
  formatINR,
  StatusBadge,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import {
  INITIAL_BRANDS,
  RECENT_ACTIVITY,
  RECENT_FINANCIAL,
  ANALYTICS_SERIES,
  FINANCE_SUMMARY,
} from '../data/mockData';

const BASE = '/mywillbook-super-admin';

const QUICK_LINKS = [
  { to: `${BASE}/brands`, label: 'Brand Management' },
  { to: `${BASE}/cities`, label: 'Cities & Service Areas' },
  { to: `${BASE}/brand-configuration`, label: 'Brand Configuration' },
  { to: `${BASE}/analytics`, label: 'Platform Analytics' },
  { to: `${BASE}/finance`, label: 'Financial Overview' },
  { to: `${BASE}/admins`, label: 'Admin Management' },
];

const buildSummary = (brands, financeSummary, pendingPayoutAmount) => {
  const active = brands.filter((b) => b.status === 'Active');
  const inactive = brands.filter((b) => b.status !== 'Active');
  const grossSales = brands.reduce((s, b) => s + (b.sales || 0), 0);
  const commission =
    financeSummary?.commissionEarned ??
    brands.reduce((s, b) => s + (b.commission || 0), 0);
  const pendingPayout =
    pendingPayoutAmount ??
    brands.reduce((s, b) => s + (b.pendingPayout || 0), 0);
  return {
    totalBrands: brands.length,
    activeBrands: active.length,
    inactiveBrands: inactive.length,
    totalOrders: brands.reduce((s, b) => s + (b.orders || 0), 0),
    grossSales,
    commission,
    pendingPayout,
    totalSellers: brands.reduce((s, b) => s + (b.sellers || 0), 0),
    totalCaptains: brands.reduce((s, b) => s + (b.captains || 0), 0),
    pendingApprovals: inactive.length + 3,
  };
};

const Dashboard = () => {
  const ctx = useMyWillBookSuperAdmin();
  const [localBrands] = useState(INITIAL_BRANDS);

  const brands = ctx?.brands ?? localBrands;
  const financeSummary = ctx?.financeSummary ?? FINANCE_SUMMARY;
  const analyticsSeries = ctx?.analyticsSeries ?? ANALYTICS_SERIES;
  const recentActivity = ctx?.recentActivity ?? RECENT_ACTIVITY;
  const recentFinancial = RECENT_FINANCIAL;

  const metrics = useMemo(
    () =>
      buildSummary(
        brands,
        financeSummary,
        ctx?.summary?.pendingPayoutAmount
      ),
    [brands, financeSummary, ctx?.summary?.pendingPayoutAmount]
  );

  const brandSales =
    analyticsSeries?.brandSales ||
    brands.map((b) => ({ label: b.name, value: b.sales || 0 }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Platform Dashboard"
        subtitle="Cross-brand operational snapshot for MyWillBook Super Admin"
        breadcrumbs={['MyWillBook', 'Overview', 'Dashboard']}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={Store} label="Total Brands" value={metrics.totalBrands} accent="#31551C" />
        <StatCard icon={CircleDot} label="Active Brands" value={metrics.activeBrands} accent="#31551C" />
        <StatCard icon={Ban} label="Inactive Brands" value={metrics.inactiveBrands} accent="#64748b" />
        <StatCard
          icon={ShoppingBag}
          label="Orders"
          value={metrics.totalOrders.toLocaleString('en-IN')}
          accent="#0284c7"
        />
        <StatCard icon={IndianRupee} label="Gross Sales" value={formatINR(metrics.grossSales)} />
        <StatCard icon={Wallet} label="Commission" value={formatINR(metrics.commission)} accent="#b45309" />
        <StatCard
          icon={IndianRupee}
          label="Pending Payout"
          value={formatINR(metrics.pendingPayout)}
          accent="#e11d48"
        />
        <StatCard icon={Users} label="Sellers" value={metrics.totalSellers} accent="#7c3aed" />
        <StatCard icon={Truck} label="Captains" value={metrics.totalCaptains} accent="#0f766e" />
        <StatCard icon={Clock3} label="Pending Approvals" value={metrics.pendingApprovals} accent="#d97706" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-extrabold text-slate-700">Brand-wise sales</p>
          <p className="mb-2 text-[10px] font-semibold text-amber-600">Demo chart — mock sales figures</p>
          <SimpleBarChart data={brandSales} color="#FF9418" valueFormatter={formatINR} />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-extrabold text-slate-700">Quick links</p>
          <p className="mb-3 text-[10px] font-semibold text-amber-600">Navigate key demo modules</p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700 no-underline transition hover:border-[#FF9418] hover:bg-orange-50 hover:text-[#FF9418]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tableWrapClass}>
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-extrabold text-slate-800">Recent activity</p>
            <p className="text-[10px] font-semibold text-amber-600">Demo audit trail</p>
          </div>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Time</th>
                <th className={thClass}>Actor</th>
                <th className={thClass}>Action</th>
                <th className={thClass}>Target</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>
                    {row.time ||
                      (row.at ? new Date(row.at).toLocaleString('en-IN') : '—')}
                  </td>
                  <td className={`${tdClass} font-bold text-slate-800`}>
                    {row.actor || row.detail?.split('·')[0]?.trim() || '—'}
                  </td>
                  <td className={tdClass}>{row.action || row.title}</td>
                  <td className={`${tdClass} font-semibold text-[#31551C]`}>
                    {row.target || row.detail || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={tableWrapClass}>
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-extrabold text-slate-800">Recent financial activity</p>
            <p className="text-[10px] font-semibold text-amber-600">Demo ledger rows</p>
          </div>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Time</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Brand</th>
                <th className={thClass}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentFinancial.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>{row.time}</td>
                  <td className={tdClass}>{row.type}</td>
                  <td className={tdClass}>
                    <StatusBadge status={row.brand === 'Platform' ? 'Active' : 'Pending'} />
                    <span className="ml-2 font-bold text-slate-800">{row.brand}</span>
                  </td>
                  <td
                    className={`${tdClass} font-extrabold ${
                      row.amount < 0 ? 'text-rose-600' : 'text-[#31551C]'
                    }`}
                  >
                    {formatINR(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
