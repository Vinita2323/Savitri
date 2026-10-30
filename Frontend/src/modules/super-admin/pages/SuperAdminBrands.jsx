import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  MapPin,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  Users,
  Compass,
  Layers,
  ArrowRight,
  Loader2,
  RefreshCw,
  Phone,
  Mail,
  Sliders,
  Check,
  Sparkles
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';

export const SuperAdminBrands = () => {
  const navigate = useNavigate();
  const {
    brands,
    fetchBrands,
    selectedBrandId,
    setSelectedBrandId,
    toggleBrandStatus,
  } = useSuperAdmin();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [statusTogglingId, setStatusTogglingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchBrands().finally(() => setLoading(false));
  }, [fetchBrands]);

  // Extract unique cities
  const cities = useMemo(() => {
    const list = Array.from(new Set(brands.map((b) => b.city).filter(Boolean)));
    return ['ALL', ...list];
  }, [brands]);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    return brands.filter((b) => {
      if (selectedStatus !== 'ALL' && b.status !== selectedStatus) return false;
      if (selectedCity !== 'ALL' && b.city !== selectedCity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (b.name || '').toLowerCase().includes(q);
        const matchesCode = (b.code || '').toLowerCase().includes(q);
        const matchesCity = (b.city || '').toLowerCase().includes(q);
        const matchesCategory = (b.category || '').toLowerCase().includes(q);
        return matchesName || matchesCode || matchesCity || matchesCategory;
      }
      return true;
    });
  }, [brands, selectedStatus, selectedCity, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = brands.length;
    const active = brands.filter((b) => b.status === 'Active').length;
    const citiesCount = new Set(brands.map((b) => b.city).filter(Boolean)).size;
    const totalRadius = brands.reduce((acc, b) => acc + (b.operatingRadiusKm || 25), 0);
    const avgRadius = total > 0 ? Math.round(totalRadius / total) : 25;
    return { total, active, citiesCount, avgRadius };
  }, [brands]);

  // Handle status toggle
  const handleToggleStatus = async (brand) => {
    const nextStatus = brand.status === 'Active' ? 'Inactive' : 'Active';
    setStatusTogglingId(brand.brandId || brand.id);
    try {
      await toggleBrandStatus(brand.brandId || brand.id, nextStatus);
    } catch (err) {
      alert('Failed to toggle brand status: ' + err.message);
    } finally {
      setStatusTogglingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-20">
      <SuperAdminHeader />

      {/* Top Banner Navigation */}
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                PLATFORM GOVERNANCE
              </span>
              <span className="text-xs font-semibold text-slate-400">/</span>
              <span className="text-xs font-semibold text-slate-600">Operations & Inventory</span>
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Business Brands & Regions / व्यापार ब्रांड प्रबंधन
            </h1>
            <p className="mt-0.5 text-xs text-slate-500">
              Manage multi-brand corporate entities, operating cities, geographic centers, and service radii.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                fetchBrands().finally(() => setLoading(false));
              }}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            <Link
              to="/super-admin/brands/create"
              className="flex items-center gap-1.5 rounded-xl border-none bg-[#79B433] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#689A2B] no-underline"
            >
              <Plus size={16} />
              <span>Create Business Brand</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Metric Cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Total Brands</p>
              <Building2 className="h-4 w-4 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.total}</p>
            <p className="mt-1 text-[11px] text-slate-400">Registered in MongoDB</p>
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Active Brands</p>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-emerald-700">{stats.active}</p>
            <p className="mt-1 text-[11px] text-slate-400">Available in scope switcher</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Operating Cities</p>
              <MapPin className="h-4 w-4 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.citiesCount}</p>
            <p className="mt-1 text-[11px] text-slate-400">Hubs across Madhya Pradesh</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500">Avg Service Radius</p>
              <Compass className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{stats.avgRadius} km</p>
            <p className="mt-1 text-[11px] text-slate-400">Per brand radial perimeter</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand name, code (e.g. FG-IND), city..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 outline-none transition focus:border-[#79B433]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter size={14} />
              <span>Status:</span>
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#79B433]"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Draft">Draft</option>
              <option value="Inactive">Inactive</option>
            </select>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-[#79B433]"
            >
              <option value="ALL">All Operating Cities</option>
              {cities.filter((c) => c !== 'ALL').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Brands Grid / Cards */}
        {loading && brands.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#79B433]" />
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Building2 className="mx-auto h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-800">No matching business brands found</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your search criteria or create a new business brand entity.
            </p>
            <Link
              to="/super-admin/brands/create"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-none bg-[#79B433] px-4 py-2 text-xs font-bold text-white no-underline shadow-sm hover:bg-[#689A2B]"
            >
              <Plus size={14} />
              <span>Create New Brand</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredBrands.map((brand) => {
              const isCurrentScope =
                (selectedBrandId === brand.brandId || selectedBrandId === brand.id) &&
                brand.status === 'Active';
              const radius = brand.operatingRadiusKm !== undefined ? brand.operatingRadiusKm : 25;
              const isToggling = statusTogglingId === (brand.brandId || brand.id);

              return (
                <div
                  key={brand.brandId || brand.id}
                  className={`flex flex-col justify-between overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
                    isCurrentScope ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-slate-200'
                  }`}
                >
                  <div className="p-5">
                    {/* Header: Logo, Name, Badges */}
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <img
                          src={brand.logo || '/LogoSavitri.png'}
                          alt={brand.name}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm font-bold text-slate-900">{brand.name}</h3>
                          {brand.isDefault && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-700">
                              CORE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500">
                          {brand.shortName || brand.name} · <span className="font-mono font-bold text-slate-700">{brand.code}</span>
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          brand.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : brand.status === 'Draft'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {brand.status}
                      </span>
                    </div>

                    {/* Category & City */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {brand.category || 'Apparel & Fashion'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <MapPin size={12} className="text-[#79B433]" />
                        <span>{brand.city}, {brand.state || 'MP'}</span>
                      </span>
                    </div>

                    {/* Operational Attributes */}
                    <div className="mt-4 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Coverage Radius:</span>
                        <span className="font-bold text-emerald-800">{radius} km radial</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Seller Onboarding:</span>
                        <span className={`text-[11px] font-bold ${brand.allowSellerRegistration !== false ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {brand.allowSellerRegistration !== false ? 'Open for Sellers' : 'Registration Closed'}
                        </span>
                      </div>
                      {brand.gst && (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">GSTIN:</span>
                          <span className="font-mono text-[11px] font-bold text-slate-800">{brand.gst}</span>
                        </div>
                      )}
                    </div>

                    {/* Contact snippet */}
                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate">{brand.address || brand.locality || 'No street address set'}</span>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(brand)}
                      disabled={isToggling}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
                    >
                      {isToggling ? (
                        <Loader2 size={12} className="animate-spin text-[#79B433]" />
                      ) : brand.status === 'Active' ? (
                        <ToggleRight size={14} className="text-emerald-600" />
                      ) : (
                        <ToggleLeft size={14} className="text-slate-400" />
                      )}
                      <span>{brand.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/super-admin/brands/edit/${brand.brandId || brand.id}`}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 no-underline transition hover:bg-slate-100"
                      >
                        <Edit3 size={12} />
                        <span>Edit</span>
                      </Link>

                      <button
                        type="button"
                        disabled={brand.status !== 'Active'}
                        onClick={() => {
                          if (brand.status !== 'Active') return;
                          setSelectedBrandId(brand.brandId || brand.id);
                          navigate('/super-admin/dashboard');
                        }}
                        className={`flex items-center gap-1 rounded-lg border-none px-2.5 py-1 text-[11px] font-bold text-white transition ${
                          isCurrentScope
                            ? 'bg-slate-800'
                            : brand.status === 'Active'
                            ? 'bg-[#79B433] hover:bg-[#689A2B] cursor-pointer'
                            : 'bg-slate-300 cursor-not-allowed text-slate-500'
                        }`}
                        title={
                          brand.status !== 'Active'
                            ? 'Activate brand first to select as operational scope'
                            : 'Set as current operational scope'
                        }
                      >
                        <span>
                          {isCurrentScope
                            ? 'Current Scope'
                            : brand.status === 'Active'
                            ? 'Select Scope'
                            : 'Inactive'}
                        </span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminBrands;
