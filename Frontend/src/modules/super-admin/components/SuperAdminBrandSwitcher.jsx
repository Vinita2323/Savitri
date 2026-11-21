import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, Plus, Settings, Layers } from 'lucide-react';
import { useSuperAdmin } from '../context/SuperAdminContext';

/**
 * Super Admin Brand / Regional Hub Switcher for the sidebar.
 * Displays live database brands, allows instantaneous scope switching,
 * and provides direct links to Create Business Brand and Brand Management.
 */
export const SuperAdminBrandSwitcher = ({ collapsed = false }) => {
  const navigate = useNavigate();
  const {
    brands,
    selectedBrand,
    selectedBrandId,
    setSelectedBrandId,
    sidebarOpen,
  } = useSuperAdmin();

  // Only ACTIVE brands are available in the scope switcher
  const activeBrands = useMemo(() => {
    return brands.filter((b) => b.status === 'Active');
  }, [brands]);

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    if (collapsed || !sidebarOpen) setOpen(false);
  }, [collapsed, sidebarOpen]);

  const handleSelectScope = (id) => {
    setSelectedBrandId(id);
    setOpen(false);
  };

  const handleCreateNew = () => {
    setOpen(false);
    navigate('/super-admin/brands/create');
  };

  const handleManageBrands = () => {
    setOpen(false);
    navigate('/super-admin/brands');
  };

  const panel = open ? (
    <div
      className={`absolute z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${
        sidebarOpen ? 'left-0 right-0 top-[calc(100%+6px)]' : 'left-12 top-0 w-64'
      }`}
    >
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-normal uppercase tracking-wide text-slate-400">Switch Brand / Region</p>
        <span className="rounded bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">
          {activeBrands.length} ACTIVE
        </span>
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {/* Consolidated Option */}
        <button
          type="button"
          onClick={() => handleSelectScope('ALL')}
          className={`flex w-full cursor-pointer items-center gap-3 border-none px-3 py-2.5 text-left transition ${
            selectedBrandId === 'ALL' ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
          }`}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-[#1A2E0A]">
            <Building2 size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-900">All Regions (Consolidated)</p>
            <p className="truncate text-xs font-normal text-slate-500">All MP Hubs · ALL-MP</p>
          </div>
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedBrandId === 'ALL' ? 'border-[#79B433]' : 'border-slate-300'
            }`}
          >
            {selectedBrandId === 'ALL' ? <span className="h-2 w-2 rounded-full bg-[#79B433]" /> : null}
          </span>
        </button>

        <div className="my-1 border-t border-slate-100" />

        {activeBrands.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs font-semibold text-slate-700">No Active Regional Brands</p>
            <p className="mt-1 text-[11px] text-slate-400">
              All regional brands are currently deactivated. Operating in consolidated platform mode.
            </p>
            <button
              type="button"
              onClick={handleManageBrands}
              className="mt-2.5 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-[#79B433] shadow-xs hover:bg-slate-50"
            >
              Activate Brands
            </button>
          </div>
        ) : (
          activeBrands.map((brand) => {
            const active = brand.id === selectedBrandId || brand.brandId === selectedBrandId;
            const radius = brand.operatingRadiusKm !== undefined ? brand.operatingRadiusKm : 25;
            return (
              <button
                key={brand.id || brand.brandId}
                type="button"
                onClick={() => handleSelectScope(brand.id || brand.brandId)}
                className={`flex w-full cursor-pointer items-center gap-3 border-none px-3 py-2.5 text-left transition ${
                  active ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 p-1">
                  <img src={brand.logo || '/LogoSavitri.png'} alt="" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{brand.name}</p>
                  <p className="truncate text-xs font-normal text-slate-500">
                    {brand.city} · <span className="font-mono">{brand.code}</span> · {radius}km
                  </p>
                </div>
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    active ? 'border-[#79B433]' : 'border-slate-300'
                  }`}
                >
                  {active ? <span className="h-2 w-2 rounded-full bg-[#79B433]" /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 p-1.5">
        <button
          type="button"
          onClick={handleCreateNew}
          className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border-none bg-white py-2 text-xs font-bold text-[#2563eb] shadow-sm hover:bg-slate-100"
        >
          <Plus size={14} /> Create Brand
        </button>

        <button
          type="button"
          onClick={handleManageBrands}
          className="flex items-center justify-center gap-1 rounded-lg border-none bg-transparent px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
          title="Manage All Brands"
        >
          <Settings size={14} />
          <span>Manage</span>
        </button>
      </div>
    </div>
  ) : null;

  if (!sidebarOpen || collapsed) {
    return (
      <div ref={rootRef} className="relative flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-[#79B433] text-white shadow-lg"
          title={selectedBrand?.name || 'Switch brand'}
        >
          <Building2 size={20} />
        </button>
        {panel}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-[#355A1C] bg-[#0F1C06] px-2.5 py-2 text-left transition hover:border-[#79B433]/60"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white p-1">
          <img src={selectedBrand?.logo || '/LogoSavitri.png'} alt="" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-medium uppercase tracking-wide text-white">
              {selectedBrand?.shortName || selectedBrand?.name || 'Select Brand'}
            </span>
            <span className="shrink-0 rounded bg-[#79B433] px-1.5 py-0.5 text-[10px] font-normal text-white">
              TREASURY
            </span>
          </div>
          <p className="truncate text-xs font-normal text-teal-300/90">
            {selectedBrand?.city || 'Super Admin Financial'}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-teal-300/80 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {panel}
    </div>
  );
};

export default SuperAdminBrandSwitcher;
