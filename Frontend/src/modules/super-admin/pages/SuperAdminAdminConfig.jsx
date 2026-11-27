import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import adminConfigService from '../../../services/adminConfigService';
import { CreateAdminDialog, Dialog, EditAdminDialog, Note, Spinner, StatusChip, btnGhost, btnPrimary, inputCls } from '../components/admin-config/AdminConfigParts';

const Stat = ({ label, value, testId, hint }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="m-0 text-xs font-bold text-slate-500">{label}</p>
    <p className="m-0 mt-1 text-2xl font-extrabold text-slate-900" data-testid={testId}>{value}</p>
    {hint && <p className="m-0 text-[11px] text-slate-400">{hint}</p>}
  </div>
);

const Pager = ({ page, pages, onPage }) => (pages > 1 ? (
  <div className="flex items-center justify-end gap-2 text-sm font-semibold text-slate-600">
    <button type="button" data-testid="ac-prev" className={btnGhost} disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
    <span data-testid="ac-page">Page {page} of {pages}</span>
    <button type="button" data-testid="ac-next" className={btnGhost} disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
  </div>
) : null);

const ACTION_LABEL = { ASSIGNED: 'Assigned', REMOVED: 'Removed', TRANSFERRED: 'Moved', SHARED: 'Shared' };

const History = () => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); adminConfigService.history({ page, limit: 20 }).then(setData).catch((e) => setError(e.message)); }, [page]);
  if (error) return <Note>{error}</Note>;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm" data-testid="ac-history">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date and time</th><th className="px-4 py-3">Brand</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Previous admin</th><th className="px-4 py-3">New admin</th><th className="px-4 py-3">Changed by</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.history.map((h) => (
              <tr key={h._id} data-testid="ac-history-row">
                <td className="whitespace-nowrap px-4 py-3">{new Date(h.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td className="px-4 py-3 font-bold">{h.brandName || h.brandId}</td>
                <td className="px-4 py-3">{ACTION_LABEL[h.action] || h.action}</td>
                <td className="px-4 py-3">{h.previousAdmin?.name || '-'}</td>
                <td className="px-4 py-3">{h.newAdmin?.name || '-'}</td>
                <td className="px-4 py-3">{h.changedBy?.name || h.changedBy?.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.history.length === 0 && <p className="m-0 p-8 text-center text-sm text-slate-500">No assignment changes recorded yet.</p>}
      </div>
      <Pager page={data.page} pages={data.pages} onPage={setPage} />
    </div>
  );
};

const BrandOverview = ({ brands }) => {
  const [only, setOnly] = useState('all');
  const rows = brands.filter((b) => only === 'all' || (only === 'free' ? b.holders.length === 0 : b.holders.length > 0));
  return (
    <div className="space-y-3">
      <select data-testid="ac-overview-filter" aria-label="Show brands" className={`${inputCls} !w-auto`} value={only} onChange={(e) => setOnly(e.target.value)}>
        <option value="all">All brands</option><option value="assigned">Assigned</option><option value="free">Unassigned</option>
      </select>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm" data-testid="ac-overview">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Brand</th><th className="px-4 py-3">City</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Brand status</th><th className="px-4 py-3">Managed by</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((b) => (
              <tr key={b.brandId} data-testid="ac-overview-row" data-brand={b.brandId}>
                <td className="px-4 py-3 font-bold">{b.name}</td><td className="px-4 py-3">{b.city}</td><td className="px-4 py-3">{b.state}</td><td className="px-4 py-3">{b.status}</td>
                <td className="px-4 py-3">{b.holders.length === 0 ? <span className="text-slate-400">Unassigned</span> : b.holders.map((h) => `${h.name}${h.type === 'CITY_ADMIN' ? ' (City Admin)' : ''}${h.status !== 'active' ? ' (inactive)' : ''}`).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="m-0 p-8 text-center text-sm text-slate-500">No brands to show.</p>}
      </div>
    </div>
  );
};

const PERMISSION_CHANGE = { CONFIGURED: 'Configured', UPDATED: 'Changed', REVOKED: 'Removed' };
/** "Orders +edit, -delete" for each module that differs */
const describeChange = (before, after, catalog) => {
  const a = before?.permissions || {}; const b = after?.permissions || {};
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].map((key) => {
    const added = (b[key] || []).filter((x) => !(a[key] || []).includes(x));
    const removed = (a[key] || []).filter((x) => !(b[key] || []).includes(x));
    if (!added.length && !removed.length) return '';
    return `${catalog?.modules.find((m) => m.key === key)?.label || key}: ${[...added.map((x) => `+${x}`), ...removed.map((x) => `-${x}`)].join(' ')}`;
  }).filter(Boolean).join('; ') || 'No module change';
};

const PermissionHistory = ({ catalog }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { setError(''); adminConfigService.permissionHistory({ page, limit: 20 }).then(setData).catch((e) => setError(e.message)); }, [page]);
  if (error) return <Note>{error}</Note>;
  if (!data) return <Spinner />;
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm" data-testid="ac-perm-history">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Date and time</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Brand</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Permissions</th><th className="px-4 py-3">Changed by</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {data.history.map((h) => (
              <tr key={h._id} data-testid="ac-perm-history-row">
                <td className="whitespace-nowrap px-4 py-3">{new Date(h.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                <td className="px-4 py-3 font-bold">{h.admin?.name || h.admin?.email || '-'}</td>
                <td className="px-4 py-3">{h.brandName || h.brandId}</td>
                <td className="px-4 py-3">{PERMISSION_CHANGE[h.action] || h.action}</td>
                <td className="max-w-md px-4 py-3 text-xs text-slate-600">{describeChange(h.before, h.after, catalog)}</td>
                <td className="px-4 py-3">{h.changedBy?.name || h.changedBy?.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.history.length === 0 && <p className="m-0 p-8 text-center text-sm text-slate-500">No permission changes recorded yet.</p>}
      </div>
      <Pager page={data.page} pages={data.pages} onPage={setPage} />
    </div>
  );
};

/** Super Admin: Admin accounts (same Admin login and panel as before) and which brands each of them manages. */
export const SuperAdminAdminConfig = () => {
  const [tab, setTab] = useState('admins');
  const [overview, setOverview] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [list, setList] = useState(null);
  const [filters, setFilters] = useState({ search: '', status: '', brandId: '' });
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const ticket = useRef(0);

  const load = useCallback(async () => {
    const mine = ++ticket.current;
    try {
      const [o, l, c] = await Promise.all([adminConfigService.overview(), adminConfigService.list({ ...filters, page, limit: 10 }), adminConfigService.permissionCatalog()]);
      if (mine !== ticket.current) return; // an older, slower answer must not replace a newer one
      setOverview(o); setList(l); setCatalog(c); setError('');
    } catch (e) { if (mine === ticket.current) setError(e.message); }
  }, [filters, page]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const filter = (p) => { setFilters((x) => ({ ...x, ...p })); setPage(1); };
  const s = overview?.stats;
  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] font-sans text-slate-800">
      <SuperAdminHeader title="Admin Configuration" subtitle="Create admins, choose their brands and what they may do in each brand" titleClassName="m-0 text-xl font-semibold tracking-tight text-[#1A2E0A] sm:text-2xl" subtitleClassName="m-0 mt-0.5 text-sm font-normal text-slate-500" />
      <div className="w-full flex-1 space-y-4 p-4 sm:p-6" data-testid="admin-config">
        {error && <Note testId="ac-page-error">{error} <button type="button" data-testid="ac-retry" className="cursor-pointer border-0 bg-transparent font-bold text-rose-800 underline" onClick={load}>Try again</button></Note>}
        {msg && <Note type="success" testId="ac-page-msg">{msg}</Note>}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Stat label="Total Admins" value={s?.totalAdmins ?? '…'} testId="ac-total" hint={s?.allBrandAdmins ? `${s.allBrandAdmins} older account(s) with all brands` : ''} />
          <Stat label="Active Admins" value={s?.activeAdmins ?? '…'} testId="ac-active" />
          <Stat label="Inactive Admins" value={s?.inactiveAdmins ?? '…'} testId="ac-inactive" />
          <Stat label="Assigned Brands" value={s?.assignedBrands ?? '…'} testId="ac-assigned" hint={s ? `of ${s.totalBrands} brands` : ''} />
          <Stat label="Unassigned Brands" value={s?.unassignedBrands ?? '…'} testId="ac-unassigned" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {[['admins', 'Admins'], ['brands', 'Brand Assignment'], ['history', 'Change History'], ['permissions', 'Permission History']].map(([k, l]) => (
              <button key={k} type="button" data-testid={`ac-view-${k}`} aria-pressed={tab === k} onClick={() => { setTab(k); setMsg(''); }} className={`cursor-pointer rounded-xl border px-3.5 py-2 text-sm font-bold ${tab === k ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>{l}</button>
            ))}
          </div>
          <button type="button" data-testid="ac-new" className={`${btnPrimary} inline-flex items-center gap-1.5`} disabled={!overview || !catalog} onClick={() => { setMsg(''); setCreating(true); }}><Plus size={16} /> Create Admin</button>
        </div>

        {tab === 'admins' && (
          <>
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3">
              <div className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input data-testid="ac-search" className={`${inputCls} pl-9`} placeholder="Search by name, email or mobile" value={filters.search} onChange={(e) => filter({ search: e.target.value })} /></div>
              <select data-testid="ac-filter-status" aria-label="Status" className={`${inputCls} !w-auto`} value={filters.status} onChange={(e) => filter({ status: e.target.value })}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
              <select data-testid="ac-filter-brand" aria-label="Brand" className={`${inputCls} !w-auto max-w-[260px]`} value={filters.brandId} onChange={(e) => filter({ brandId: e.target.value })}><option value="">All brands</option>{overview?.brands.map((b) => <option key={b.brandId} value={b.brandId}>{b.name} ({b.city})</option>)}</select>
            </div>
            {!list && !error && <Spinner />}
            {list && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-sm" data-testid="ac-table">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Admin name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3">Assigned brands</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {list.admins.map((a) => (
                      <tr key={a.id} data-testid="ac-row" data-email={a.email}>
                        <td className="px-4 py-3 font-bold">{a.name}</td>
                        <td className="px-4 py-3">{a.email}</td>
                        <td className="px-4 py-3">{a.mobile || '-'}</td>
                        <td className="px-4 py-3" data-testid="ac-count">{a.access === 'ALL' ? <span className="font-bold text-amber-700">All brands</span> : <span className="font-bold">{a.brandCount}</span>}{a.unconfiguredBrands > 0 && <span className="block text-xs font-bold text-amber-700" data-testid="ac-unconfigured">{a.unconfiguredBrands} not configured</span>}{a.permissionMode === 'FULL' && a.access !== 'ALL' && a.brandCount > 0 && <span className="block text-xs text-slate-400">Full access in brands</span>}</td>
                        <td className="px-4 py-3"><StatusChip status={a.status} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <button type="button" data-testid="ac-view-brands" className={`${btnGhost} mr-2`} onClick={() => setViewing(a)}>View Brands</button>
                          <button type="button" data-testid="ac-edit-btn" className={btnGhost} onClick={() => { setMsg(''); setEditing(a); }}>Edit</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {list.admins.length === 0 && <p className="m-0 p-8 text-center text-sm text-slate-500" data-testid="ac-empty">{filters.search || filters.status || filters.brandId ? 'No admin matches these filters.' : 'No admins yet. Use "Create Admin" to add the first one.'}</p>}
              </div>
            )}
            {list && <Pager page={list.page} pages={list.pages} onPage={setPage} />}
          </>
        )}
        {tab === 'brands' && (overview ? <BrandOverview brands={overview.brands} /> : <Spinner />)}
        {tab === 'history' && <History />}
        {tab === 'permissions' && <PermissionHistory catalog={catalog} />}
      </div>

      {creating && overview && catalog && <CreateAdminDialog catalog={catalog} brands={overview.brands} onClose={() => setCreating(false)} onSaved={(text) => { setCreating(false); setMsg(text); load(); }} />}
      {editing && overview && catalog && <EditAdminDialog catalog={catalog} key={editing.id} admin={editing} startTab={editing.openOn} brands={overview.brands} onClose={() => setEditing(null)} onChanged={load} />}
      {viewing && (
        <Dialog title={`Brands of ${viewing.name}`} subtitle={viewing.email} onClose={() => setViewing(null)} testId="ac-brands-view" footer={<button type="button" data-testid="ac-brands-edit" className={btnPrimary} onClick={() => { setEditing({ ...viewing, openOn: 'brands' }); setViewing(null); }}>Edit assignment</button>}>
          {viewing.access === 'ALL' ? <Note type="warn">This older account can use every brand.</Note> : viewing.brands.length === 0 ? <p className="m-0 text-sm text-slate-500">No brand assigned.</p> : (
            <ul className="m-0 list-none divide-y divide-slate-100 p-0">
              {viewing.brands.map((b) => (
                <li key={b.brandId} data-testid="ac-brands-item" className="flex items-center justify-between gap-3 py-2.5 text-sm"><span><b>{b.name}</b><span className="block text-xs text-slate-500">{b.city}, {b.state} · {b.status}</span><span className="block text-xs font-semibold text-slate-600">{viewing.permissionMode === 'PER_BRAND' ? (b.permissions.configured ? `${b.permissions.enabledModules} module(s) enabled` : 'Access not configured') : 'Full access in this brand'}</span></span>{b.shared && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">Shared</span>}</li>
              ))}
            </ul>
          )}
        </Dialog>
      )}
    </div>
  );
};

export default SuperAdminAdminConfig;
