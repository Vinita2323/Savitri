import React, { useMemo, useState } from 'react';
import { Eye, ArrowRight } from 'lucide-react';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  ConfirmDialog,
  Drawer,
  EmptyState,
  FilterBar,
  Pagination,
  formatINR,
  btnPrimaryClass,
  btnSecondaryClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
  fieldClass,
  labelClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_PAYOUTS } from '../data/mockData';

const PayoutOverview = () => {
  const ctx = useMyWillBookSuperAdmin();
  const [localPayouts, setLocalPayouts] = useState(INITIAL_PAYOUTS);

  const payouts = ctx?.payouts ?? localPayouts;

  const transitionPayout =
    ctx?.transitionPayout ||
    ((id, nextStatus) => {
      const transitions = {
        Pending: ['Approved', 'Rejected'],
        Approved: ['Processing', 'Rejected'],
        Processing: ['Paid', 'Rejected'],
        Paid: [],
        Rejected: [],
      };
      setLocalPayouts((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          if (!(transitions[p.status] || []).includes(nextStatus)) return p;
          return { ...p, status: nextStatus, updatedAt: new Date().toISOString() };
        })
      );
    });

  const getPayoutTransitions =
    ctx?.getPayoutTransitions ||
    ((status) => {
      const transitions = {
        Pending: ['Approved', 'Rejected'],
        Approved: ['Processing', 'Rejected'],
        Processing: ['Paid', 'Rejected'],
        Paid: [],
        Rejected: [],
      };
      return transitions[status] || [];
    });

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const [drawerPayout, setDrawerPayout] = useState(null);
  const [confirmTransition, setConfirmTransition] = useState(null);

  const summary = useMemo(() => {
    const seller = payouts.filter((p) => p.type === 'Seller');
    const captain = payouts.filter((p) => p.type === 'Captain');
    const sum = (arr) => arr.reduce((s, p) => s + (p.amount || 0), 0);
    const open = (arr) =>
      arr.filter((p) => ['Pending', 'Approved', 'Processing'].includes(p.status));
    return {
      sellerCount: seller.length,
      sellerAmount: sum(seller),
      sellerPending: sum(open(seller)),
      captainCount: captain.length,
      captainAmount: sum(captain),
      captainPending: sum(open(captain)),
    };
  }, [payouts]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return payouts.filter((p) => {
      const matchesQ =
        !term ||
        (p.ref || '').toLowerCase().includes(term) ||
        (p.payee || '').toLowerCase().includes(term) ||
        (p.brand || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      return matchesQ && matchesStatus && matchesType;
    });
  }, [payouts, q, statusFilter, typeFilter]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const formatAt = (iso) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString('en-IN');
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payout Overview"
        subtitle="Seller vs captain payout pipeline — demo transitions only"
        breadcrumbs={['MyWillBook', 'Finance', 'Payout Overview']}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Seller payouts"
          value={summary.sellerCount}
          hint={`Total ${formatINR(summary.sellerAmount)} (demo)`}
          accent="#FF9418"
        />
        <StatCard
          label="Seller pending"
          value={formatINR(summary.sellerPending)}
          hint="Open seller pipeline"
          accent="#f59e0b"
        />
        <StatCard
          label="Captain payouts"
          value={summary.captainCount}
          hint={`Total ${formatINR(summary.captainAmount)} (demo)`}
          accent="#6366f1"
        />
        <StatCard
          label="Captain pending"
          value={formatINR(summary.captainPending)}
          hint="Open captain pipeline"
          accent="#0ea5e9"
        />
      </div>

      <FilterBar>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search ref, payee, brand…"
          className={`${fieldClass} sm:min-w-[220px] sm:flex-1`}
        />
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="all">All types</option>
          <option value="Seller">Seller</option>
          <option value="Captain">Captain</option>
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
          <option value="Processing">Processing</option>
          <option value="Paid">Paid</option>
          <option value="Rejected">Rejected</option>
        </select>
      </FilterBar>

      {pageRows.length === 0 ? (
        <EmptyState title="No payouts match." description="Demo empty state — adjust filters." />
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Ref</th>
                <th className={thClass}>Payee</th>
                <th className={thClass}>Brand</th>
                <th className={thClass}>Type</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Requested</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => {
                const nexts = getPayoutTransitions(p.status);
                return (
                  <tr key={p.id}>
                    <td className={`${tdClass} font-extrabold`}>{p.ref}</td>
                    <td className={tdClass}>{p.payee}</td>
                    <td className={tdClass}>{p.brand}</td>
                    <td className={tdClass}>{p.type}</td>
                    <td className={`${tdClass} font-extrabold text-[#31551C]`}>
                      {formatINR(p.amount)}
                    </td>
                    <td className={tdClass}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td className={tdClass}>{formatAt(p.requestedAt)}</td>
                    <td className={tdClass}>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDrawerPayout(p)}
                          className={btnSecondaryClass}
                        >
                          <Eye size={12} /> Details
                        </button>
                        {nexts.map((ns) => (
                          <button
                            key={ns}
                            type="button"
                            onClick={() => setConfirmTransition({ payout: p, nextStatus: ns })}
                            className={btnSecondaryClass}
                          >
                            <ArrowRight size={12} /> {ns}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />

      <Drawer
        open={!!drawerPayout}
        onClose={() => setDrawerPayout(null)}
        title="Payout details (demo)"
      >
        {drawerPayout && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-black text-slate-900">{drawerPayout.ref}</h4>
              <StatusBadge status={drawerPayout.status} />
            </div>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Payee</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerPayout.payee}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Type</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerPayout.type}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Brand</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerPayout.brand}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Amount</dt>
                <dd className="mt-1 font-black text-[#31551C]">{formatINR(drawerPayout.amount)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Requested</dt>
                <dd className="mt-1 font-bold text-slate-800">{formatAt(drawerPayout.requestedAt)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Updated</dt>
                <dd className="mt-1 font-bold text-slate-800">{formatAt(drawerPayout.updatedAt)}</dd>
              </div>
            </dl>
            <div>
              <p className={labelClass}>Allowed transitions (demo)</p>
              <div className="flex flex-wrap gap-1.5">
                {getPayoutTransitions(drawerPayout.status).length === 0 ? (
                  <span className="text-xs font-semibold text-slate-500">Terminal status</span>
                ) : (
                  getPayoutTransitions(drawerPayout.status).map((ns) => (
                    <button
                      key={ns}
                      type="button"
                      className={btnPrimaryClass}
                      onClick={() => {
                        setConfirmTransition({ payout: drawerPayout, nextStatus: ns });
                      }}
                    >
                      Move to {ns}
                    </button>
                  ))
                )}
              </div>
            </div>
            <p className="text-[11px] font-semibold text-amber-700">
              Demonstration only — no real bank transfer.
            </p>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!confirmTransition}
        onClose={() => setConfirmTransition(null)}
        title="Transition payout?"
        message={
          confirmTransition
            ? `Demo only: move ${confirmTransition.payout.ref} from ${confirmTransition.payout.status} → ${confirmTransition.nextStatus}?`
            : ''
        }
        confirmLabel={`Set ${confirmTransition?.nextStatus || ''}`}
        danger={confirmTransition?.nextStatus === 'Rejected'}
        onConfirm={() => {
          if (confirmTransition) {
            transitionPayout(confirmTransition.payout.id, confirmTransition.nextStatus);
            setDrawerPayout((cur) =>
              cur && cur.id === confirmTransition.payout.id
                ? { ...cur, status: confirmTransition.nextStatus }
                : cur
            );
          }
        }}
      />
    </div>
  );
};

export default PayoutOverview;
