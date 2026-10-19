import React, { useMemo, useState } from 'react';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  FilterBar,
  Pagination,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
  fieldClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_ACTIVITY_LOGS } from '../data/mockData';

const ActivityLogs = () => {
  const ctx = useMyWillBookSuperAdmin();
  const activityLogs = ctx?.activityLogs ?? INITIAL_ACTIVITY_LOGS;

  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return activityLogs.filter((row) => {
      const matchesQ =
        !term ||
        (row.actor || '').toLowerCase().includes(term) ||
        (row.role || '').toLowerCase().includes(term) ||
        (row.action || '').toLowerCase().includes(term) ||
        (row.ip || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      return matchesQ && matchesStatus;
    });
  }, [activityLogs, q, statusFilter]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const formatAt = (iso) => {
    try {
      return new Date(iso).toLocaleString('en-IN');
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity Logs"
        subtitle="Staff login and action history — fictional IPs labeled demo"
        breadcrumbs={['MyWillBook', 'Access', 'Activity Logs']}
      />

      <FilterBar>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search actor, role, action, IP…"
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
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>
      </FilterBar>

      {pageRows.length === 0 ? (
        <EmptyState
          title="No activity matches your filters."
          description="Demo empty state — try clearing search."
        />
      ) : (
        <div className={tableWrapClass}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Actor</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Action</th>
                <th className={thClass}>At</th>
                <th className={thClass}>IP</th>
                <th className={thClass}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr key={row.id}>
                  <td className={tdClass}>
                    <span className="font-extrabold text-slate-900">{row.actor}</span>
                  </td>
                  <td className={tdClass}>{row.role}</td>
                  <td className={tdClass}>{row.action}</td>
                  <td className={tdClass}>{formatAt(row.at)}</td>
                  <td className={tdClass}>
                    <code className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                      {row.ip}
                    </code>
                  </td>
                  <td className={tdClass}>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
    </div>
  );
};

export default ActivityLogs;
