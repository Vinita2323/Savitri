import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, FileText, Loader2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { fileHref } from '../../../../utils/fileUrl';

const IMAGE = /\.(png|jpe?g|webp|gif|bmp|svg|avif)(\?|#|$)/i;
const PDF = /\.pdf(\?|#|$)/i;
const kindOf = (f) => {
  if (f?.kind === 'image' || f?.kind === 'pdf') return f.kind; // the caller knows (e.g. signed links that have no file extension)
  const probe = `${f?.url || ''} ${f?.name || ''}`;
  if (PDF.test(f?.url || '') || PDF.test(f?.name || '')) return 'pdf';
  if (IMAGE.test(f?.url || '') || IMAGE.test(f?.name || '') || /image\//.test(f?.mime || '')) return 'image';
  return /\/image\/upload\//.test(probe) ? 'image' : 'other';
};

/**
 * Opens attachments inside the page (a full-screen preview) instead of a new browser tab.
 * files: [{ name, url }], index: which one to show, onIndex(i) switches, onClose() closes.
 */
export const FilePreview = ({ files, index, onIndex, onClose }) => {
  const list = Array.isArray(files) ? files : [];
  const file = list[index] || null;
  const [zoom, setZoom] = useState(false);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [saving, setSaving] = useState(false);

  const go = useCallback((d) => { if (list.length > 1) onIndex((index + d + list.length) % list.length); }, [index, list.length, onIndex]);

  useEffect(() => { setZoom(false); setState('loading'); }, [index, file?.url]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [go, onClose]);

  if (!file) return null;
  const href = fileHref(file.url);
  const kind = kindOf(file);

  // Save the file without leaving the page (a plain link to another origin would navigate away)
  const download = async () => {
    setSaving(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error('bad status');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name || 'attachment';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    } catch {
      window.open(href, '_blank', 'noopener'); // last resort, only when the browser blocks reading the file
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="fp-overlay" role="dialog" aria-modal="true" aria-label={`Preview of ${file.name || 'file'}`} className="fixed inset-0 z-[80] bg-slate-950/90 flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 text-white" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0">
          <p data-testid="fp-name" className="m-0 text-[16px] font-bold truncate">{file.name || 'Attachment'}</p>
          {list.length > 1 && <p data-testid="fp-count" className="m-0 text-[13px] text-slate-300">{index + 1} of {list.length}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {kind === 'image' && (
            <button type="button" data-testid="fp-zoom" onClick={() => setZoom((z) => !z)} className="p-2.5 rounded-lg text-white hover:bg-white/15 bg-transparent border-0 cursor-pointer" aria-label={zoom ? 'Fit to screen' : 'Zoom in'} title={zoom ? 'Fit to screen' : 'Zoom in'}>{zoom ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}</button>
          )}
          <button type="button" data-testid="fp-download" onClick={download} disabled={saving} className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-[14px] font-semibold text-white bg-white/15 hover:bg-white/25 border-0 cursor-pointer disabled:opacity-60">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download</button>
          <button type="button" data-testid="fp-close" onClick={onClose} className="p-2.5 rounded-lg text-white hover:bg-white/15 bg-transparent border-0 cursor-pointer" aria-label="Close preview"><X className="w-6 h-6" /></button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 sm:px-16 pb-4">
        {list.length > 1 && (
          <>
            <button type="button" data-testid="fp-prev" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-white bg-white/15 hover:bg-white/30 border-0 cursor-pointer" aria-label="Previous file"><ChevronLeft className="w-6 h-6" /></button>
            <button type="button" data-testid="fp-next" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full text-white bg-white/15 hover:bg-white/30 border-0 cursor-pointer" aria-label="Next file"><ChevronRight className="w-6 h-6" /></button>
          </>
        )}

        {kind === 'image' && state !== 'error' && (
          <div className={`w-full h-full flex ${zoom ? 'overflow-auto items-start justify-start' : 'items-center justify-center'}`}>
            {state === 'loading' && <Loader2 className="w-8 h-8 text-white animate-spin absolute" />}
            <img
              key={href}
              data-testid="fp-image"
              src={href}
              alt={file.name || 'Attachment'}
              onLoad={() => setState('ready')}
              onError={() => setState('error')}
              onClick={(e) => { e.stopPropagation(); setZoom((z) => !z); }}
              className={zoom ? 'max-w-none cursor-zoom-out' : 'max-w-full max-h-full object-contain cursor-zoom-in rounded-lg'}
              style={state === 'loading' ? { opacity: 0 } : undefined}
            />
          </div>
        )}

        {kind === 'pdf' && (
          <iframe key={href} data-testid="fp-pdf" title={file.name || 'PDF'} src={href} className="w-full h-full bg-white rounded-lg border-0" onLoad={() => setState('ready')} />
        )}

        {(kind === 'other' || state === 'error') && (
          <div data-testid="fp-fallback" className="text-center text-white max-w-sm" onClick={(e) => e.stopPropagation()}>
            <FileText className="w-14 h-14 mx-auto text-slate-300" />
            <p className="text-[17px] font-bold mt-3 mb-1">{state === 'error' ? 'This file could not be shown here.' : 'This type of file cannot be previewed.'}</p>
            <p className="text-[14px] text-slate-300 m-0">You can still download it.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
