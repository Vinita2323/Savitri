import React, { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Supplier / vendor name box that suggests the suppliers this user bought from before. Choosing one calls onPick(supplier)
 * so the form can fill in the saved details. Typing a new name is always allowed (a new supplier is remembered once a
 * purchase with it is saved).
 *
 * suppliers: [{ name, phone, email?, address?, lastPurchaseAt, purchases }]
 */
export default function SupplierNameInput({ value, onChange, onPick, suppliers = [], className = '', placeholder = 'Supplier name', testId = 'supplier-name', maxLength = 120 }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef(null);

  const matches = useMemo(() => {
    const q = String(value || '').trim().toLowerCase();
    const list = q ? suppliers.filter((s) => s.name.toLowerCase().includes(q) || String(s.phone || '').includes(q)) : suppliers;
    return list.slice(0, 8);
  }, [suppliers, value]);

  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (s) => {
    onChange(s.name);
    onPick?.(s);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (!open || !matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? matches.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  // A name typed in full (without choosing from the list) still picks up the saved details when the box is left
  const onBlur = () => {
    const exact = suppliers.find((s) => s.name.toLowerCase() === String(value || '').trim().toLowerCase());
    if (exact) onPick?.(exact, { typed: true });
  };

  const when = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

  return (
    <div className="relative" ref={box}>
      <input
        data-testid={testId}
        className={className}
        value={value}
        maxLength={maxLength}
        placeholder={suppliers.length ? `${placeholder} (type or choose a previous supplier)` : placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      {open && matches.length > 0 && (
        <ul role="listbox" data-testid={`${testId}-list`} className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg list-none m-0">
          <li className="px-3 pt-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Previous suppliers</li>
          {matches.map((s, i) => (
            <li
              key={s.name}
              role="option"
              aria-selected={i === active}
              data-testid={`${testId}-option`}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-3 py-2 ${i === active ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}
            >
              <span className="block text-sm font-semibold text-slate-900">{s.name}</span>
              <span className="block text-xs text-slate-500">
                {[s.phone, s.email].filter(Boolean).join(' · ') || 'No contact saved'}
                {s.lastPurchaseAt ? ` · last purchase ${when(s.lastPurchaseAt)}` : ''}
                {s.purchases > 1 ? ` · ${s.purchases} purchases` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
