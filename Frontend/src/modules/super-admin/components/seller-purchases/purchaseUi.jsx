import React from 'react';
import { X } from 'lucide-react';

export const demoBanner =
  'Demonstration data only. Purchase costs, stock, and supplier contacts are sample figures, not live inventory or payments.';

export const tableWrap = 'overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs';
export const tableClass = 'w-full min-w-[1280px] border-collapse text-left text-sm font-normal';
export const thClass =
  'border-b border-slate-200/80 bg-slate-50/80 px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500';
export const tdClass = 'px-3 py-3 align-top text-slate-700';

export const selectClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#F7941D]';

export const PurchaseSummaryCards = ({ cards }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {cards.map((card) => {
      const Icon = card.icon;
      return (
        <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-[#F7941D]">
              <Icon size={15} />
            </span>
          </div>
          <p className="m-0 mt-2 font-mono text-lg font-medium leading-snug text-[#1A2E0A] sm:text-xl">{card.value}</p>
          <p className="m-0 mt-1 text-xs font-medium text-slate-500">{card.hint}</p>
        </div>
      );
    })}
  </div>
);

export const Fact = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-2 text-sm">
    <span className="font-normal text-slate-500">{label}</span>
    <span className="text-right font-medium text-slate-900">{value}</span>
  </div>
);

export const DetailDrawer = ({ eyebrow, title, subtitle, onClose, children, wide = false }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
    <button type="button" className="absolute inset-0 border-none bg-transparent" aria-label="Close" onClick={onClose} />
    <div
      className={`relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl ${
        wide ? 'max-w-4xl' : 'max-w-lg'
      }`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="m-0 text-xs font-medium uppercase tracking-wider text-[#F7941D]">{eyebrow}</p>
          <h2 className="m-0 text-lg font-medium text-[#1A2E0A]">{title}</h2>
          {subtitle ? <p className="m-0 mt-1 text-sm font-medium text-slate-500">{subtitle}</p> : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-full border-none bg-slate-100 p-2 text-slate-600 hover:bg-slate-200"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
    </div>
  </div>
);

export const textButtonClass =
  'cursor-pointer border-none bg-transparent p-0 text-left font-medium text-[#1A2E0A] underline decoration-[#F7941D]/40 underline-offset-2 hover:text-[#F7941D]';
