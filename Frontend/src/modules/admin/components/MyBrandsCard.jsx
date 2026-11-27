import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import API from '../../../services/api';
import { getAdminBrand } from '../../../utils/adminBrand';

/** Admin profile: how many brands this admin manages, and which. Read only; the Super Admin changes the assignment. */
const MyBrandsContent = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: mine } = await API.get('/admin/my-brands');
        // an admin who is not limited to some brands can use every brand there is
        const brands = mine.restricted ? mine.brands : (await API.get('/super-admin/brands')).data.brands || [];
        if (alive) setData({ restricted: mine.restricted, brands });
      } catch (e) {
        if (alive) setError(e.response?.data?.message || 'Could not load your brands.');
      }
    })();
    return () => { alive = false; };
  }, []);

  const selected = getAdminBrand();
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" data-testid="my-brands">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#243D12] text-white"><Building2 size={20} /></div>
          <div>
            <h3 className="m-0 text-base font-bold text-slate-800">Your Brands</h3>
            <p className="m-0 text-xs text-slate-500">{data && !data.restricted ? 'Your account can access all brands.' : 'The brands assigned to you by the Super Admin.'}</p>
          </div>
        </div>
        {data && (
          <div className="text-right">
            <p className="m-0 text-3xl font-extrabold leading-none text-slate-900" data-testid="my-brands-count">{data.brands.length}</p>
            <p className="m-0 text-xs font-semibold text-slate-500">{data.brands.length === 1 ? 'brand' : 'brands'}</p>
          </div>
        )}
      </div>
      <div className="p-6">
        {error && <p role="alert" className="m-0 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
        {!data && !error && <p className="m-0 text-sm text-slate-500">Loading…</p>}
        {data && data.brands.length === 0 && <p className="m-0 text-sm text-slate-500">No brand is assigned to you yet. Please ask your Super Admin.</p>}
        {data && data.brands.length > 0 && (
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {data.brands.map((b) => (
              <li key={b.brandId} data-testid="my-brands-item" className="rounded-xl border border-slate-200 p-4">
                <p className="m-0 text-sm font-bold text-slate-900">{b.name}</p>
                <p className="m-0 text-xs text-slate-500">{[b.city, b.state].filter(Boolean).join(', ')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${b.status === 'Active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{b.status}</span>
                  {data.restricted && b.brandId === selected && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">Showing now</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/** The profile page is shared with the Super Admin panel, where this card does not apply. */
export default function MyBrandsCard() {
  const { pathname } = useLocation();
  return pathname.startsWith('/admin') ? <MyBrandsContent /> : null;
}
