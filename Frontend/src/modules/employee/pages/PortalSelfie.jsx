import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, ImageOff } from 'lucide-react';
import employeePortalService from '../../../services/employeePortalService';
import { useSelfie } from '../context/SelfieContext';
import { CaptureModal, SelfieSummaryCard, StatusChip, dayLabel } from '../components/SelfieWidgets';
import { Card, Empty, Notice, Spinner, btnGhost, fmtTime, inputCls } from '../components/ui';
import { fileHref } from '../../../utils/fileUrl';
import { FilePreview } from '../../admin/employees/components/FilePreview';

const typeLabel = (s) => (s.verificationType === 'LOGIN' ? 'Login selfie' : `2-hour check #${s.sequence}`);

export default function PortalSelfie() {
  const { status, loaded, refresh } = useSelfie();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const reloaded = useRef(false);
  const autoOpened = useRef(false);

  // A reminder/notification opens this page with ?capture=1: go straight to the camera when a selfie can be sent
  useEffect(() => {
    if (!loaded || autoOpened.current || params.get('capture') !== '1') return;
    autoOpened.current = true;
    if (status?.required && status?.canCapture) setModal(status.captureType);
    setParams({}, { replace: true });
  }, [loaded, status, params, setParams]);

  const load = useCallback(async (pg = 1) => {
    setError('');
    try {
      const d = await employeePortalService.selfieHistory({ from: filters.from || undefined, to: filters.to || undefined, page: pg, limit: 30 });
      setList((cur) => (pg > 1 && cur ? { ...d, selfies: [...cur.selfies, ...d.selfies] } : d));
      setPage(pg);
    } catch (e) { setError(e.message); }
  }, [filters.from, filters.to]);
  useEffect(() => { setList(null); load(1); }, [load]);
  useEffect(() => { const f = () => load(1); window.addEventListener('employee-selfie-changed', f); return () => window.removeEventListener('employee-selfie-changed', f); }, [load]);

  const days = useMemo(() => {
    const m = new Map();
    (list?.selfies || []).forEach((s) => { if (!m.has(s.workDate)) m.set(s.workDate, []); m.get(s.workDate).push(s); });
    return [...m.entries()];
  }, [list]);
  const gallery = useMemo(() => (list?.selfies || []).filter((s) => s.imageUrl).map((s) => ({ id: s.id, name: `${dayLabel(s.workDate)} · ${fmtTime(s.capturedAt)} · ${typeLabel(s)}`, url: s.imageUrl, kind: 'image' })), [list]);

  // Signed links last a few minutes: if a thumbnail fails (expired), reload the list once to get fresh links
  const onImgError = () => { if (!reloaded.current) { reloaded.current = true; load(1); setTimeout(() => { reloaded.current = false; }, 20000); } };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 m-0">Selfie Verification</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5 mb-0">A live selfie at login and every few hours during the day. Your submissions are listed below.</p>
      </div>

      <SelfieSummaryCard showHistoryLink={false} onCapture={(t) => setModal(t)} />

      <Card title="My selfie history" action={null}>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="text-xs font-semibold text-slate-500">From<input data-testid="hist-from" type="date" className={`${inputCls} mt-1`} value={filters.from} max={filters.to || undefined} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
          <label className="text-xs font-semibold text-slate-500">To<input data-testid="hist-to" type="date" className={`${inputCls} mt-1`} value={filters.to} min={filters.from || undefined} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
          {(filters.from || filters.to) && <button type="button" className={btnGhost} onClick={() => setFilters({ from: '', to: '' })}>Clear</button>}
        </div>
        {error && <Notice type="error">{error}</Notice>}
        {!list && !error && <Spinner />}
        {list && days.length === 0 && <Empty>No selfies yet{filters.from || filters.to ? ' for these dates' : ''}.</Empty>}
        <div className="space-y-5" data-testid="hist-days">
          {days.map(([ds, items]) => (
            <div key={ds} data-testid="hist-day">
              <p className="text-sm font-extrabold text-slate-800 m-0 mb-2">{dayLabel(ds)}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {items.map((s) => (
                  <div key={s.id} data-testid="hist-item" data-status={s.status} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    {s.imageUrl ? (
                      <button type="button" data-testid="hist-thumb" onClick={() => setPreview({ files: gallery, index: Math.max(0, gallery.findIndex((g) => g.id === s.id)) })} className="block w-full aspect-[3/4] bg-slate-100 border-0 p-0 cursor-zoom-in">
                        <img src={fileHref(s.imageUrl)} alt={`${typeLabel(s)} at ${fmtTime(s.capturedAt)}`} loading="lazy" onError={onImgError} className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-full aspect-[3/4] bg-slate-100 flex flex-col items-center justify-center text-slate-400 text-xs gap-1"><ImageOff className="w-6 h-6" />{s.status === 'MISSED' ? 'No selfie' : s.imageExpired ? 'Image removed' : 'No image'}</div>
                    )}
                    <div className="p-2.5">
                      <p className="m-0 text-xs font-bold text-slate-900">{typeLabel(s)}</p>
                      <p className="m-0 text-[11px] text-slate-500">{s.status === 'MISSED' ? `Missed · due ${fmtTime(s.scheduledAt)}` : `${fmtTime(s.capturedAt)}${s.late ? ` · ${s.minutesLate} min late` : ''}`}</p>
                      <div className="mt-1.5"><StatusChip status={s.status === 'COMPLETED' ? 'COMPLETED' : 'MISSED'} testId="hist-chip" /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {list && page < list.pages && <div className="text-center mt-4"><button type="button" data-testid="hist-more" className={btnGhost} onClick={() => load(page + 1)}>Show older</button></div>}
      </Card>

      {modal && <CaptureModal type={modal} onClose={() => { setModal(null); refresh(); load(1); }} />}
      {preview && <FilePreview files={preview.files} index={preview.index} onIndex={(i) => setPreview((p) => ({ ...p, index: i }))} onClose={() => setPreview(null)} />}
    </div>
  );
}
