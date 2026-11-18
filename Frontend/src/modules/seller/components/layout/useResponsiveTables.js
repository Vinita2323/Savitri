import { useEffect } from 'react';

/**
 * Labels every table cell with its column header so the CSS in sellerResponsive.css can show each row as a card on
 * phones. Re-runs whenever the page content changes (filters, pagination, data loading). Purely presentational:
 * it only sets data-* attributes and never touches content or handlers.
 */
const labelTables = (root) => {
  root.querySelectorAll('table:not([data-no-cards])').forEach((table) => {
    const headRow = table.querySelector('thead tr');
    if (!headRow) return;
    const labels = [];
    headRow.querySelectorAll('th, td').forEach((th) => {
      const span = Number(th.getAttribute('colspan')) || 1;
      const hasCheckbox = !!th.querySelector('input[type="checkbox"]');
      const text = hasCheckbox ? '' : (th.textContent || '').replace(/\s+/g, ' ').trim();
      for (let i = 0; i < span; i += 1) labels.push(text);
    });
    table.querySelectorAll('tbody tr').forEach((tr) => {
      let col = 0;
      tr.querySelectorAll(':scope > td').forEach((td) => {
        const span = Number(td.getAttribute('colspan')) || 1;
        const label = span > 1 ? '' : (labels[col] ?? '');
        if (td.getAttribute('data-label') !== label) td.setAttribute('data-label', label);
        col += span;
      });
    });
    if (!table.hasAttribute('data-rt')) table.setAttribute('data-rt', '');
  });
};

const useResponsiveTables = (ref) => {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof MutationObserver === 'undefined') return undefined;
    let raf = 0;
    const run = () => { raf = 0; labelTables(root); };
    const schedule = () => { if (!raf) raf = window.requestAnimationFrame(run); };
    run();
    const mo = new MutationObserver(schedule);
    mo.observe(root, { childList: true, subtree: true });
    return () => { mo.disconnect(); if (raf) window.cancelAnimationFrame(raf); };
  }, [ref]);
};

export default useResponsiveTables;
