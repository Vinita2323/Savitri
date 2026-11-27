import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAdmin } from '../context/useAdmin';
import PurchaseForm from './PurchaseForm';
import { Dashboard, History, StockUpdates, SellerPurchases, PurchaseDetail } from './PurchaseViews';
import { Notice } from '../../employee/components/ui';
import { fmtMoney } from './purchaseUi';
import { tabAllowed } from '../../../utils/adminPermissions';

const KEYS = { dashboard: 'purchase_dashboard', new: 'purchase_new', history: 'purchase_history', stock: 'purchase_stock', sellers: 'purchase_sellers', bysellers: 'purchase_by_seller' };
const MINE = [['dashboard', 'Purchase Dashboard'], ['new', 'Add New Purchase'], ['history', 'Purchase History'], ['stock', 'Stock Updates']];
const SELLERS = [['sellers', 'Associated Seller Purchases']];

const Nav = ({ tab, go, items, label, testId }) => (
  <div data-testid={testId}>
    <p className="m-0 mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-400">{label}</p>
    <div className="flex flex-wrap gap-1.5">
      {items.filter(([k]) => tabAllowed(KEYS[k])).map(([k, l]) => (
        <button key={k} type="button" data-testid={`pm-tab-${k}`} aria-pressed={tab === k} onClick={() => go(k)} className={`px-3.5 py-2 rounded-xl text-sm font-bold border cursor-pointer ${tab === k ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>{l}</button>
      ))}
    </div>
  </div>
);

/** Purchase Management for an Admin: "My Store Purchases" and, kept apart, the read-only "Associated Seller Purchases". */
export default function AdminPurchasePage({ tab = 'dashboard' }) {
  const { setActiveTab } = useAdmin();
  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState(null);
  const [openId, setOpenId] = useState(null);
  const location = useLocation();
  // the old Seller-wise Purchases address now opens the combined page with its summary section expanded
  useEffect(() => { if (tab === 'bysellers') setActiveTab(KEYS.sellers, { showSummary: true }); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (t) => { setSaved(null); setActiveTab(KEYS[t]); };
  const bump = () => setVersion((v) => v + 1);
  return (
    <div className="space-y-5 pb-10" data-testid="purchase-page">
      <div>
        <h1 className="m-0 text-xl font-extrabold text-slate-900">Purchase Management</h1>
        <p className="m-0 text-sm text-slate-500">Stock you buy for your own store, and the purchases made by your associated sellers (view only).</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-4">
        <Nav tab={tab} go={go} items={MINE} label="My store purchases" testId="pm-nav-mine" />
        <Nav tab={tab} go={go} items={SELLERS} label="Associated seller purchases (read only)" testId="pm-nav-sellers" />
      </div>
      {tab === 'dashboard' && <Dashboard go={go} />}
      {tab === 'new' && (
        saved ? (
          <div className="space-y-3" data-testid="pm-saved">
            <Notice type="success">{saved.duplicate ? 'This purchase was already recorded earlier, so nothing was added again.' : 'Purchase recorded and stock updated.'} <b data-testid="pm-saved-id">{saved.purchase.purchaseId}</b> · {fmtMoney(saved.purchase.finalPaise)}</Notice>
            <div className="flex gap-2">
              <button type="button" data-testid="pm-view-saved" className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white cursor-pointer" onClick={() => setOpenId(saved.purchase.id)}>View details</button>
              <button type="button" data-testid="pm-another" className="px-4 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white border-0 cursor-pointer" onClick={() => setSaved(null)}>Add another purchase</button>
              <button type="button" className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 bg-white cursor-pointer" onClick={() => go('history')}>Go to history</button>
            </div>
          </div>
        ) : <PurchaseForm onSaved={(purchase, duplicate) => { setSaved({ purchase, duplicate }); bump(); }} />
      )}
      {tab === 'history' && <History version={version} onChanged={bump} />}
      {tab === 'stock' && <StockUpdates version={version} />}
      {tab === 'sellers' && <SellerPurchases showSummary={Boolean(location.state?.showSummary)} />}
      {openId && <PurchaseDetail id={openId} onClose={() => setOpenId(null)} onChanged={bump} />}
    </div>
  );
}
