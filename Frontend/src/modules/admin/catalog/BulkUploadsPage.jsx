import React, { useCallback, useEffect, useState } from 'react';
import { Download, Eye, X } from 'lucide-react';
import { catalogAdminService } from '../../../services/bulkProductService';

const inputCls = 'w-full px-3.5 py-2.5 text-[15px] bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500';
const btnGhost = 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer disabled:opacity-60';
const STATUSES = ['ALL', 'validating', 'validated', 'importing', 'completed', 'completed_with_errors', 'failed', 'discarded'];
const LABEL = { validating: 'Checking', validated: 'Ready', importing: 'Importing', completed: 'Completed', completed_with_errors: 'Completed with errors', failed: 'Failed', discarded: 'Discarded' };
const TONE = { validating: 'bg-blue-50 text-blue-700', validated: 'bg-amber-50 text-amber-700', importing: 'bg-blue-50 text-blue-700', completed: 'bg-emerald-50 text-emerald-700', completed_with_errors: 'bg-amber-50 text-amber-800', failed: 'bg-rose-50 text-rose-700', discarded: 'bg-slate-100 text-slate-600' };
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—');

/** Admin / Super Admin: bulk upload history of every seller (brand scoped on the server), with reports. */
export default function BulkUploadsPage() {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const load = useCallback(() => {
    setError('');
    return catalogAdminService.imports({ page, limit: 20, status: status === 'ALL' ? undefined : status, search: q || undefined, from: from || undefined, to: to || undefined }).then(setData).catch((e) => setError(e.message));
  }, [page, status, q, from, to]);
  useEffect(() => { setData(null); load(); }, [load]);

  const report = async (id, fmt) => { setError(''); try { await catalogAdminService.downloadReport(id, fmt); } catch (e) { setError(e.message); } };
  const openDetail = async (id) => { setError(''); try { setDetail(await catalogAdminService.importDetail(id)); } catch (e) { setError(e.message); } };

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 m-0">Bulk uploads</h1>
        <p className="text-[15px] text-slate-500 mt-1 mb-0">Every seller's product uploads, with counts and downloadable reports. Valid products are published automatically; use Catalog control to hide or block a product.</p>
      </div>
      {error && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-[15px] font-medium text-rose-800">{error}</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input className={inputCls} placeholder="Search seller or file name" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={inputCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>{STATUSES.map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : LABEL[s]}</option>)}</select>
        <input type="date" className={inputCls} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label="From date" />
        <input type="date" className={inputCls} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label="To date" />
      </div>

      {!data && !error && <p className="text-[15px] text-slate-500">Loading…</p>}
      {data && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-4 py-3 font-semibold">Upload</th><th className="px-3 py-3 font-semibold">Seller</th><th className="px-3 py-3 font-semibold">Date</th><th className="px-3 py-3 font-semibold">Rows</th><th className="px-3 py-3 font-semibold">Saved</th><th className="px-3 py-3 font-semibold">Published</th><th className="px-3 py-3 font-semibold">Failed</th><th className="px-3 py-3 font-semibold">Skipped</th><th className="px-3 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold text-right">Report</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {data.imports.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">No uploads found.</td></tr>}
                {data.imports.map((i) => (
                  <tr key={i._id} className="align-top hover:bg-slate-50/60">
                    <td className="px-4 py-3"><p className="m-0 font-semibold text-slate-900 break-all max-w-[240px]">{i.fileName}</p><p className="m-0 text-xs text-slate-500">#{String(i._id).slice(-8)} · {i.mode === 'UPDATE' ? 'Update' : 'Create'}</p></td>
                    <td className="px-3 py-3 text-slate-700">{i.sellerName || '—'}</td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fmtDate(i.createdAt)}</td>
                    <td className="px-3 py-3 text-slate-700">{i.totalRows}</td>
                    <td className="px-3 py-3 font-semibold text-emerald-700">{i.successRows}</td>
                    <td className="px-3 py-3 text-slate-700">{i.publishedRows}</td>
                    <td className="px-3 py-3 font-semibold text-rose-600">{i.failedRows || i.invalidRows || 0}</td>
                    <td className="px-3 py-3 text-slate-500">{i.skippedRows}</td>
                    <td className="px-3 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TONE[i.status] || 'bg-slate-100 text-slate-600'}`}>{LABEL[i.status] || i.status}</span></td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-1.5"><button type="button" className={btnGhost} onClick={() => openDetail(i._id)}><Eye className="w-3.5 h-3.5" /> View</button><button type="button" className={btnGhost} onClick={() => report(i._id, 'csv')}><Download className="w-3.5 h-3.5" /> CSV</button><button type="button" className={btnGhost} onClick={() => report(i._id, 'xlsx')}>Excel</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span className="text-slate-500">Page {data.page} of {data.pages} · {data.total} uploads</span>
          <button type="button" className={btnGhost} disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0"><h2 className="text-lg font-extrabold text-slate-900 m-0 break-all">{detail.import.fileName}</h2><p className="text-sm text-slate-500 m-0">{detail.import.sellerName} · {fmtDate(detail.import.createdAt)} · started {fmtDate(detail.import.startedAt)} · finished {fmtDate(detail.import.finishedAt)}</p></div>
              <button type="button" className="bg-transparent border-none cursor-pointer" onClick={() => setDetail(null)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4 text-center">
              {[['Rows', detail.import.totalRows], ['Saved', detail.import.successRows], ['Published', detail.import.publishedRows], ['Failed', detail.import.failedRows || detail.import.invalidRows], ['Skipped', detail.import.skippedRows], ['Created / updated', `${detail.import.createdRows} / ${detail.import.updatedRows}`]].map(([l, v]) => <div key={l} className="bg-slate-50 rounded-xl py-2.5"><p className="m-0 text-lg font-extrabold text-slate-900">{v}</p><p className="m-0 text-[11px] font-semibold text-slate-500 uppercase">{l}</p></div>)}
            </div>
            {detail.import.errorSummary && <div className="px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-[15px] text-rose-800 mb-4">{detail.import.errorSummary}</div>}
            <h3 className="text-[15px] font-bold text-slate-900 mt-0 mb-2">Problem rows {detail.problemRows.length >= 100 ? '(first 100; download the report for all)' : ''}</h3>
            {detail.problemRows.length === 0 ? <p className="text-[15px] text-slate-500 m-0">No problem rows.</p> : (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {detail.problemRows.map((r) => <div key={r.rowNumber} className="px-4 py-2.5 text-sm"><span className="font-semibold text-slate-800">Row {r.rowNumber}</span> <span className="text-slate-500">· {r.raw?.productName || '—'} · {r.raw?.SKU || '—'}</span>{r.errors?.map((e, i) => <p key={i} className="m-0 mt-0.5 text-rose-600">{e}</p>)}</div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
