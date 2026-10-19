import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  PageHeader,
  StatCard,
  StatusBadge,
  Drawer,
  EmptyState,
  FilterBar,
  Pagination,
  formatINR,
  btnSecondaryClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
  fieldClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_RECONCILIATION } from '../data/mockData';

const PaymentReconciliation = () => {
  const ctx = useMyWillBookSuperAdmin();
  const reconciliation = ctx?.reconciliation ?? INITIAL_RECONCILIATION;

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;
  const [drawerRow, setDrawerRow] = useState(null);

  const counts = useMemo(() => {
    const matched = reconciliation.filter((r) => r.status === 'Matched').length;
    const unmatched = reconciliation.filter((r) => r.status === 'Unmatched').length;
    const mismatch = reconciliation.filter((r) => r.status === 'Mismatch').length;
    return { matched, unmatched, mismatch, total: reconciliation.length };
  }, [reconciliation]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return reconciliation.filter((r) => {
      const matchesQ =
        !term ||
        (r.ref || '').toLowerCase().includes(term) ||
        (r.orderRef || '').toLowerCase().includes(term) ||
        (r.brand || '').toLowerCase().includes(term) ||
        (r.gateway || '').toLowerCase().includes(term) ||
        (r.method || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [reconciliation, q, statusFilter]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payment Reconciliation"
        subtitle="Demo ledger only — not connected to a live payment gateway"
        breadcrumbs={['MyWillBook', 'Finance', 'Payment Reconciliation']}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total rows" value={counts.total} hint="Demo sample" accent="#64748b" />
        <StatCard label="Matched" value={counts.matched} hint="Aligned (demo)" accent="#059669" />
        <StatCard
          label="Unmatched"
          value={counts.unmatched}
          hint="Awaiting match (demo)"
          accent="#f59e0b"
        />
        <StatCard
          label="Mismatch"
          value={counts.mismatch}
          hint="Amount / status drift (demo)"
          accent="#e11d48"
        />
      </div>

      <FilterBar>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search ref, order, brand, gateway…"
          className={`${fieldClass} sm:min-w-[240px] sm:flex-1`}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className={fieldClass}
        >
          <option value="all">All statuses</option>
          <option value="Matched">Matched</option>
          <option value="Unmatched">Unmatched</option>
          <option value="Mismatch">Mismatch</option>
        </select>
      </FilterBar>

      {pageRows.length === 0 ? (
        <EmptyState
          title="No reconciliation rows."
          description="Demo empty state — try another filter."
        />
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Txn ref</th>
                <th className={thClass}>Order</th>
                <th className={thClass}>Brand</th>
                <th className={thClass}>Gateway</th>
                <th className={thClass}>Method</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Txn status</th>
                <th className={thClass}>Match</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td className={`${tdClass} font-extrabold`}>{r.ref}</td>
                  <td className={tdClass}>{r.orderRef}</td>
                  <td className={tdClass}>{r.brand}</td>
                  <td className={tdClass}>
                    {r.gateway}
                    <span className="ml-1 text-[10px] font-bold text-amber-600">(demo)</span>
                  </td>
                  <td className={tdClass}>{r.method}</td>
                  <td className={`${tdClass} font-extrabold text-[#31551C]`}>
                    {formatINR(r.amount)}
                  </td>
                  <td className={tdClass}>{r.txnStatus}</td>
                  <td className={tdClass}>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className={tdClass}>{r.at}</td>
                  <td className={tdClass}>
                    <button
                      type="button"
                      onClick={() => setDrawerRow(r)}
                      className={btnSecondaryClass}
                    >
                      <Eye size={12} /> Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />

      <Drawer
        open={!!drawerRow}
        onClose={() => setDrawerRow(null)}
        title="Reconciliation detail (demo)"
      >
        {drawerRow && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-base font-black text-slate-900">{drawerRow.ref}</h4>
              <StatusBadge status={drawerRow.status} />
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
              Demonstration data only — gateway names are fictional labels, not a live connection.
            </p>
            <dl className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Order</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerRow.orderRef}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Brand</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerRow.brand}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Gateway</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerRow.gateway} (demo)</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Method</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerRow.method}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Amount</dt>
                <dd className="mt-1 font-black text-[#31551C]">{formatINR(drawerRow.amount)}</dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Txn status</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerRow.txnStatus}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <dt className="font-bold uppercase text-slate-400">Date</dt>
                <dd className="mt-1 font-bold text-slate-800">{drawerRow.at}</dd>
              </div>
            </dl>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default PaymentReconciliation;
