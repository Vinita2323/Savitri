import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, FileText, History, Image as ImageIcon, Loader2, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import bulkProductService from '../../../services/bulkProductService';

const ORANGE = 'bg-[#ff7526] hover:bg-[#e65507]';
const btn = `${ORANGE} text-white font-medium py-2.5 px-4 rounded-lg shadow-sm transition-colors cursor-pointer border-none inline-flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed`;
const btnGhost = 'bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-4 rounded-lg border border-slate-300 transition-colors cursor-pointer inline-flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed';

const STATUS_LABEL = {
  validating: 'Checking file…', validated: 'Ready to import', importing: 'Importing…', completed: 'Completed',
  completed_with_errors: 'Completed with errors', failed: 'Failed', discarded: 'Discarded',
};
const STATUS_TONE = {
  validating: 'bg-blue-50 text-blue-700', validated: 'bg-amber-50 text-amber-700', importing: 'bg-blue-50 text-blue-700',
  completed: 'bg-emerald-50 text-emerald-700', completed_with_errors: 'bg-amber-50 text-amber-800', failed: 'bg-rose-50 text-rose-700', discarded: 'bg-slate-100 text-slate-600',
};
const ROW_TONE = { valid: 'bg-emerald-50 text-emerald-700', invalid: 'bg-rose-50 text-rose-700', failed: 'bg-rose-50 text-rose-700', skipped: 'bg-slate-100 text-slate-600', imported: 'bg-emerald-50 text-emerald-700' };
const ROW_LABEL = { valid: 'Ready', invalid: 'Problem', failed: 'Failed', skipped: 'No change', imported: 'Imported' };

const Pill = ({ tone, children }) => <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${tone}`}>{children}</span>;
const Tile = ({ label, value, tone = 'text-slate-900' }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
    <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
    <p className={`m-0 mt-1 text-2xl font-semibold ${tone}`}>{value}</p>
  </div>
);
const fmtDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—');

export default function BulkUpload() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const importId = params.get('import');

  const [mode, setMode] = useState('CREATE');
  const [file, setFile] = useState(null);
  const [zip, setZip] = useState(null);
  const [uploadPct, setUploadPct] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [imp, setImp] = useState(null);
  const [rows, setRows] = useState(null);
  const [rowFilter, setRowFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState(null);
  const [pollKey, setPollKey] = useState(0); // bumped to restart progress polling after Import is pressed
  const fileRef = useRef(null);
  const zipRef = useRef(null);

  const open = (id) => setParams(id ? { import: id } : {}, { replace: false });
  const loadHistory = useCallback(() => bulkProductService.history({ limit: 10 }).then(setHistory).catch(() => {}), []);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // load + poll the current upload while it is working
  useEffect(() => {
    if (!importId) { setImp(null); setRows(null); return undefined; }
    let alive = true;
    let timer;
    const tick = async () => {
      try {
        const data = await bulkProductService.status(importId);
        if (!alive) return;
        setImp(data);
        if (['validating', 'importing'].includes(data.status)) timer = setTimeout(tick, 1200);
        else loadHistory();
      } catch (e) {
        if (alive) { setError(e.message); setImp(null); }
      }
    };
    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [importId, pollKey, loadHistory]);

  // rows for the preview / result table
  useEffect(() => {
    if (!imp || ['validating'].includes(imp.status) || imp.status === 'discarded') { setRows(null); return undefined; }
    if (imp.status === 'failed' && !imp.totalRows) return undefined;
    let alive = true;
    const statusParam = rowFilter === 'all' ? undefined : rowFilter;
    bulkProductService.rows(imp._id, { status: statusParam, page, limit: 25 }).then((d) => alive && setRows(d)).catch(() => {});
    return () => { alive = false; };
  }, [imp?._id, imp?.status, imp?.processed, rowFilter, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (!file) return setError('Choose your product file (.xlsx or .csv) first.');
    setBusy(true); setUploadPct(0);
    try {
      const res = await bulkProductService.upload({ file, images: zip, mode }, setUploadPct);
      setFile(null); setZip(null);
      if (fileRef.current) fileRef.current.value = '';
      if (zipRef.current) zipRef.current.value = '';
      setRowFilter('all'); setPage(1);
      open(res.importId);
    } catch (err) {
      setError(err.message);
      if (err.data?.importId) open(err.data.importId); // duplicate: show the existing upload
    } finally { setBusy(false); setUploadPct(null); }
  };

  const startImport = async () => {
    setError(''); setMsg(''); setBusy(true);
    try { await bulkProductService.startImport(imp._id); setImp((i) => ({ ...i, status: 'importing', processed: 0 })); setPollKey((k) => k + 1); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const discard = async () => {
    if (!window.confirm('Discard this upload? Nothing has been saved yet.')) return;
    try { await bulkProductService.discard(imp._id); open(null); loadHistory(); } catch (err) { setError(err.message); }
  };

  const tryDownload = async (fn) => { setError(''); try { await fn(); } catch (err) { setError(err.message); } };

  const working = imp && ['validating', 'importing'].includes(imp.status);
  const total = imp?.status === 'importing' ? imp.validRows || 1 : imp?.totalRows || 1;
  const pct = imp ? Math.min(100, Math.round(((imp.processed || 0) / Math.max(1, imp.status === 'importing' ? imp.validRows : imp.totalRows || 1)) * 100)) : 0;
  const finished = imp && ['completed', 'completed_with_errors'].includes(imp.status);
  const canImport = imp && (imp.status === 'validated' || (imp.status === 'failed' && imp.validRows > 0 && imp.successRows + imp.failedRows < imp.validRows && imp.errorSummary && !/checked|upload it again/i.test(imp.errorSummary)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/seller/products')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 cursor-pointer bg-transparent border-none p-0 mb-2"><ArrowLeft size={16} /> Back to products</button>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight m-0">Bulk upload products</h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">Add or update many products from one Excel / CSV file. Valid products go live straight away; no approval is needed.</p>
        </div>
      </div>

      {error && <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800"><AlertTriangle size={18} className="shrink-0 mt-0.5" /><span>{error}</span><button type="button" onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-rose-500"><X size={16} /></button></div>}
      {msg && <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">{msg}</div>}

      {/* ── Step 1 + 2 ── */}
      {!importId && (
        <div className="grid lg:grid-cols-5 gap-6">
          <section className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 m-0">1. Download the template</h2>
            <p className="text-sm text-slate-500 m-0">The template already contains the current category list. Fill one product per row; the Instructions sheet explains each column.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => tryDownload(() => bulkProductService.downloadTemplate('xlsx'))}><FileSpreadsheet size={16} /> Excel template</button>
              <button type="button" className={btnGhost} onClick={() => tryDownload(() => bulkProductService.downloadTemplate('csv'))}><FileText size={16} /> CSV template</button>
            </div>
            <ul className="text-xs text-slate-500 m-0 pl-4 space-y-1">
              <li>Required for new products: productName, SKU, category, MRP, sellingPrice, stock.</li>
              <li>Your SKUs are your own: another seller can use the same SKU.</li>
              <li>Images: https links, or file names from your ZIP. Without a column value, files named SKU.jpg, SKU_1.jpg… are matched automatically.</li>
            </ul>
          </section>

          <form onSubmit={submit} className="lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 m-0">2. Upload your file</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[['CREATE', 'Add new products', 'A SKU that already exists in your catalogue is rejected.'], ['UPDATE', 'Update existing products', 'Found by SKU. Empty cells are left unchanged.']].map(([val, title, help]) => (
                <label key={val} className={`cursor-pointer rounded-lg border p-3 ${mode === val ? 'border-[#ff7526] bg-orange-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name="mode" value={val} checked={mode === val} onChange={() => setMode(val)} className="mr-2 accent-[#ff7526]" />
                  <span className="text-sm font-semibold text-slate-900">{title}</span>
                  <span className="block text-xs text-slate-500 mt-1 ml-5">{help}</span>
                </label>
              ))}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block rounded-lg border-2 border-dashed border-slate-300 hover:border-[#ff7526] p-4 cursor-pointer text-center">
                <Upload size={22} className="mx-auto text-slate-400" />
                <span className="block text-sm font-medium text-slate-800 mt-1.5 break-all">{file ? file.name : 'Choose Excel / CSV'}</span>
                <span className="block text-xs text-slate-400 mt-0.5">.xlsx or .csv, up to 10 MB / 5,000 rows</span>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </label>
              <label className="block rounded-lg border-2 border-dashed border-slate-300 hover:border-[#ff7526] p-4 cursor-pointer text-center">
                <ImageIcon size={22} className="mx-auto text-slate-400" />
                <span className="block text-sm font-medium text-slate-800 mt-1.5 break-all">{zip ? zip.name : 'Images ZIP (optional)'}</span>
                <span className="block text-xs text-slate-400 mt-0.5">JPG, PNG, WEBP, GIF · up to 150 MB</span>
                <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={(e) => setZip(e.target.files?.[0] || null)} />
              </label>
            </div>
            {uploadPct !== null && <div><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#ff7526] transition-all" style={{ width: `${uploadPct}%` }} /></div><p className="text-xs text-slate-500 mt-1 mb-0">Uploading… {uploadPct}%</p></div>}
            <button type="submit" className={btn} disabled={busy || !file}>{busy ? <><Loader2 size={16} className="animate-spin" /> Uploading…</> : <><Upload size={16} /> Upload &amp; check file</>}</button>
          </form>
        </div>
      )}

      {/* ── Step 3/4: current upload ── */}
      {importId && imp && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 m-0 break-all">{imp.fileName}</h2>
              <p className="text-xs text-slate-500 mt-1 mb-0">{imp.mode === 'UPDATE' ? 'Update existing products' : 'Add new products'}{imp.imagesZipName ? ` · images: ${imp.imagesZipName}` : ''} · {fmtDate(imp.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Pill tone={STATUS_TONE[imp.status] || 'bg-slate-100 text-slate-600'}>{STATUS_LABEL[imp.status] || imp.status}</Pill>
              <button type="button" className={btnGhost} onClick={() => open(null)}><X size={16} /> Close</button>
            </div>
          </div>

          {working && (
            <div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-[#ff7526] transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} /></div>
              <p className="text-sm text-slate-600 mt-2 mb-0">{imp.status === 'validating' ? 'Checking every row…' : `Importing… ${imp.processed || 0} of ${imp.validRows} products`} <span className="text-slate-400">(you can leave this page; it keeps running)</span></p>
            </div>
          )}

          {imp.errorSummary && imp.status === 'failed' && <div className="px-4 py-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-800">{imp.errorSummary}</div>}

          {!working && imp.totalRows > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <Tile label="Rows in file" value={imp.totalRows} />
              {!finished ? (
                <>
                  <Tile label="Ready to import" value={imp.validRows} tone="text-emerald-600" />
                  <Tile label="Problems" value={imp.invalidRows} tone={imp.invalidRows ? 'text-rose-600' : 'text-slate-900'} />
                  <Tile label="No change" value={imp.skippedRows} tone="text-slate-500" />
                </>
              ) : (
                <>
                  <Tile label={imp.mode === 'UPDATE' ? 'Updated' : 'Created'} value={imp.mode === 'UPDATE' ? imp.updatedRows : imp.createdRows} tone="text-emerald-600" />
                  <Tile label="Live for customers" value={imp.publishedRows} tone="text-emerald-600" />
                  <Tile label="Failed" value={imp.failedRows} tone={imp.failedRows ? 'text-rose-600' : 'text-slate-900'} />
                  <Tile label="No change" value={imp.skippedRows} tone="text-slate-500" />
                </>
              )}
            </div>
          )}

          {!working && (
            <div className="flex flex-wrap items-center gap-2">
              {canImport && <button type="button" className={btn} disabled={busy || imp.validRows === 0} onClick={startImport}><CheckCircle2 size={16} /> {imp.status === 'failed' ? 'Continue import' : `Import ${imp.validRows} product${imp.validRows === 1 ? '' : 's'}`}</button>}
              {canImport && imp.status === 'validated' && imp.invalidRows > 0 && <span className="text-xs text-slate-500">Rows with problems are skipped. Valid rows are never blocked by them.</span>}
              {(imp.invalidRows > 0 || imp.failedRows > 0) && <>
                <button type="button" className={btnGhost} onClick={() => tryDownload(() => bulkProductService.downloadFailed(imp._id, 'xlsx'))}><Download size={16} /> Failed rows (Excel)</button>
                <button type="button" className={btnGhost} onClick={() => tryDownload(() => bulkProductService.downloadFailed(imp._id, 'csv'))}><Download size={16} /> Failed rows (CSV)</button>
              </>}
              {['validated', 'failed'].includes(imp.status) && <button type="button" className={btnGhost} onClick={discard}><Trash2 size={16} /> Discard</button>}
              {(finished || imp.status === 'failed') && <button type="button" className={btnGhost} onClick={() => open(null)}><RefreshCw size={16} /> Upload another file</button>}
            </div>
          )}
          {(imp.invalidRows > 0 || imp.failedRows > 0) && !working && finished && <p className="text-xs text-slate-500 m-0">To retry: fix the failed-rows file (the “error” column is ignored) and upload it again.</p>}

          {/* row table */}
          {!working && rows && imp.totalRows > 0 && (
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {[['all', 'All'], ['valid', 'Ready'], ['problems', 'Problems'], ['imported', 'Imported'], ['skipped', 'No change']].map(([k, label]) => (
                  <button key={k} type="button" onClick={() => { setRowFilter(k); setPage(1); }} className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${rowFilter === k ? `${ORANGE} text-white border-transparent` : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{label}</button>
                ))}
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2.5 font-medium">Row</th><th className="px-3 py-2.5 font-medium">Product</th><th className="px-3 py-2.5 font-medium">SKU</th><th className="px-3 py-2.5 font-medium">Category</th><th className="px-3 py-2.5 font-medium">Price</th><th className="px-3 py-2.5 font-medium">Stock</th><th className="px-3 py-2.5 font-medium">Result</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.rows.length === 0 && <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No rows in this view.</td></tr>}
                    {rows.rows.map((r) => (
                      <tr key={r._id || r.rowNumber} className="align-top">
                        <td className="px-3 py-2.5 text-slate-500">{r.rowNumber}</td>
                        <td className="px-3 py-2.5 font-medium text-slate-900 max-w-[260px] break-words">{r.raw?.productName || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.raw?.SKU || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.raw?.category || '—'}</td>
                        <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{r.raw?.sellingPrice ? `₹${r.raw.sellingPrice}` : '—'}{r.raw?.MRP ? <span className="text-slate-400 text-xs"> / MRP {r.raw.MRP}</span> : null}</td>
                        <td className="px-3 py-2.5 text-slate-700">{r.raw?.stock ?? '—'}</td>
                        <td className="px-3 py-2.5 min-w-[220px]">
                          <Pill tone={ROW_TONE[r.status] || 'bg-slate-100 text-slate-600'}>{ROW_LABEL[r.status] || r.status}</Pill>
                          {r.errors?.map((e, i) => <p key={i} className="m-0 mt-1 text-xs text-rose-600 break-words">{e}</p>)}
                          {r.warnings?.map((w, i) => <p key={i} className="m-0 mt-1 text-xs text-amber-600 break-words">{w}</p>)}
                          {r.status === 'imported' && r.published && <p className="m-0 mt-1 text-xs text-emerald-600">Live for customers</p>}
                          {r.status === 'imported' && !r.published && <p className="m-0 mt-1 text-xs text-slate-500">Saved, not published</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-3 text-sm">
                  <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
                  <span className="text-slate-500">Page {rows.page} of {rows.pages}</span>
                  <button type="button" className={btnGhost} disabled={page >= rows.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* ── History ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900 m-0 inline-flex items-center gap-2"><History size={18} className="text-slate-400" /> Upload history</h2>
        {!history ? <p className="text-sm text-slate-400 mt-3 mb-0">Loading…</p> : history.imports.length === 0 ? <p className="text-sm text-slate-500 mt-3 mb-0">No uploads yet.</p> : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200"><th className="py-2 pr-3 font-medium">File</th><th className="py-2 pr-3 font-medium">Date</th><th className="py-2 pr-3 font-medium">Type</th><th className="py-2 pr-3 font-medium">Rows</th><th className="py-2 pr-3 font-medium">Saved</th><th className="py-2 pr-3 font-medium">Failed</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 font-medium text-right">Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {history.imports.map((h) => (
                  <tr key={h._id}>
                    <td className="py-2.5 pr-3 font-medium text-slate-900 max-w-[220px] break-all">{h.fileName}</td>
                    <td className="py-2.5 pr-3 text-slate-600 whitespace-nowrap">{fmtDate(h.createdAt)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{h.mode === 'UPDATE' ? 'Update' : 'Add'}</td>
                    <td className="py-2.5 pr-3 text-slate-700">{h.totalRows}</td>
                    <td className="py-2.5 pr-3 text-emerald-700 font-medium">{h.successRows}</td>
                    <td className="py-2.5 pr-3 text-rose-600 font-medium">{h.failedRows || h.invalidRows || 0}</td>
                    <td className="py-2.5 pr-3"><Pill tone={STATUS_TONE[h.status] || 'bg-slate-100 text-slate-600'}>{STATUS_LABEL[h.status] || h.status}</Pill></td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button type="button" className="text-[#ff7526] font-medium text-sm cursor-pointer bg-transparent border-none" onClick={() => { setRowFilter('all'); setPage(1); open(h._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Open</button>
                      {(h.failedRows > 0 || h.invalidRows > 0) && <button type="button" className="ml-3 text-slate-600 text-sm cursor-pointer bg-transparent border-none" onClick={() => tryDownload(() => bulkProductService.downloadFailed(h._id, 'csv'))}>Failed rows</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
