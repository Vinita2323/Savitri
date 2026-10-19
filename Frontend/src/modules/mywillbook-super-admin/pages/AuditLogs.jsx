import React, { useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import {
  PageHeader,
  Drawer,
  EmptyState,
  FilterBar,
  Pagination,
  fieldClass,
  labelClass,
  btnGhostClass,
  tableWrapClass,
  tableClass,
  thClass,
  tdClass,
} from '../components/ui';
import { useMyWillBookSuperAdmin } from '../context/MyWillBookSuperAdminContext';
import { INITIAL_AUDIT_LOGS } from '../data/mockData';

const formatAt = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

const AuditLogs = () => {
  const ctx = useMyWillBookSuperAdmin();
  const auditLogs = ctx?.auditLogs ?? INITIAL_AUDIT_LOGS;

  const [q, setQ] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actorFilter, setActorFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const pageSize = 8;

  const modules = useMemo(
    () => [...new Set(auditLogs.map((l) => l.module).filter(Boolean))].sort(),
    [auditLogs]
  );
  const actors = useMemo(
    () => [...new Set(auditLogs.map((l) => l.actor).filter(Boolean))].sort(),
    [auditLogs]
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return auditLogs.filter((l) => {
      const matchesQ =
        !term ||
        (l.change || '').toLowerCase().includes(term) ||
        (l.entity || '').toLowerCase().includes(term) ||
        (l.entityId || '').toLowerCase().includes(term) ||
        (l.actor || '').toLowerCase().includes(term) ||
        (l.module || '').toLowerCase().includes(term);
      const matchesModule = moduleFilter === 'all' || l.module === moduleFilter;
      const matchesActor = actorFilter === 'all' || l.actor === actorFilter;
      return matchesQ && matchesModule && matchesActor;
    });
  }, [auditLogs, q, moduleFilter, actorFilter]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Logs"
        subtitle="Configuration and entity change history"
        breadcrumbs={['MyWillBook', 'Security', 'Audit Logs']}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
        Demo disclaimer — audit entries are simulated locally and do not reflect a production system of record.
      </div>

      <FilterBar>
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search change, entity, actor…"
          className={`${fieldClass} sm:min-w-[220px] sm:flex-1`}
        />
        <select
          className={fieldClass}
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={actorFilter}
          onChange={(e) => {
            setActorFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </FilterBar>

      {pageRows.length === 0 ? (
        <EmptyState title="No audit entries" description="Try clearing search or filters." />
      ) : (
        <>
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>When</th>
                  <th className={thClass}>Actor</th>
                  <th className={thClass}>Module</th>
                  <th className={thClass}>Entity</th>
                  <th className={thClass}>Change</th>
                  <th className={thClass}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className={tdClass}>{formatAt(row.at)}</td>
                    <td className={tdClass}>{row.actor}</td>
                    <td className={tdClass}>{row.module || '—'}</td>
                    <td className={tdClass}>
                      <span className="font-bold text-slate-800">{row.entity}</span>
                      {row.entityId ? (
                        <p className="text-[10px] font-medium text-slate-400">{row.entityId}</p>
                      ) : null}
                    </td>
                    <td className={tdClass}>{row.change}</td>
                    <td className={tdClass}>
                      <button type="button" className={btnGhostClass} onClick={() => setSelected(row)}>
                        <Eye size={14} /> Before/After
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Audit detail"
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <p className={labelClass}>When</p>
              <p className="text-sm font-bold text-slate-800">{formatAt(selected.at)}</p>
            </div>
            <div>
              <p className={labelClass}>Actor</p>
              <p className="text-sm font-bold text-slate-800">{selected.actor}</p>
            </div>
            <div>
              <p className={labelClass}>Module</p>
              <p className="text-sm font-bold text-slate-800">{selected.module || '—'}</p>
            </div>
            <div>
              <p className={labelClass}>Entity</p>
              <p className="text-sm font-bold text-slate-800">
                {selected.entity}
                {selected.entityId ? ` · ${selected.entityId}` : ''}
              </p>
            </div>
            <div>
              <p className={labelClass}>Change</p>
              <p className="text-sm font-medium text-slate-700">{selected.change}</p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-3">
                <p className={labelClass}>Before</p>
                <pre className="whitespace-pre-wrap text-xs font-semibold text-rose-800">
                  {selected.before ?? '—'}
                </pre>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className={labelClass}>After</p>
                <pre className="whitespace-pre-wrap text-xs font-semibold text-emerald-800">
                  {selected.after ?? '—'}
                </pre>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AuditLogs;
