import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import cityAdminService from '../../../services/cityAdminService';
import { CityAdminStatusChip } from '../components/CityAdminSection';
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
  Sparkles,
  Trash2,
  X
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
    deleteBrand,
  } = useSuperAdmin();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [adminFilter, setAdminFilter] = useState('ALL'); // ALL | CONFIGURED | PENDING | INACTIVE
  const [adminByBrand, setAdminByBrand] = useState({}); // brandId -> { adminStatus, admin }
  const [adminCounts, setAdminCounts] = useState(null);
  const [statusTogglingId, setStatusTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [notice, setNotice] = useState('');

  const openDelete = (brand) => {
    setDeleteTarget(brand);
    setDeleteConfirm('');
    setDeleteError('');
  };
  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteConfirm('');
    setDeleteError('');
  };
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    const id = deleteTarget.brandId || deleteTarget.id;
    setDeleting(true);
    setDeleteError('');
    const res = await deleteBrand(id);
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(res.message || 'Could not delete this brand.');
      return;
    }
    if (selectedBrandId === id) setSelectedBrandId('ALL');
    setNotice(`"${deleteTarget.name}" was permanently deleted.`);
    setDeleteTarget(null);
    setDeleteConfirm('');
    setTimeout(() => setNotice(''), 5000);
  };

  useEffect(() => {
    setLoading(true);
    fetchBrands().finally(() => setLoading(false));
  }, [fetchBrands]);

  // City Admin status of every brand (pending / configured / inactive)
  useEffect(() => {
    cityAdminService.brandsWithStatus().then((r) => {
      setAdminByBrand(Object.fromEntries(r.brands.map((b) => [b.brandId, b])));
      setAdminCounts(r.counts);
    }).catch(() => {});
  }, [brands]);

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
      if (adminFilter !== 'ALL' && (adminByBrand[b.brandId || b.id]?.adminStatus || 'PENDING') !== adminFilter) return false;
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
  }, [brands, selectedStatus, selectedCity, searchQuery, adminFilter, adminByBrand]);

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
        <div className="flex w-full flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
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

      <div className="w-full px-4 py-6 sm:px-6">
        {notice && (
          <div data-testid="brand-notice" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 size={14} />
            <span>{notice}</span>
          </div>
        )}

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
              data-testid="admin-filter"
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
            >
              <option value="ALL">All Brands (admin)</option>
              <option value="CONFIGURED">Admin Configured{adminCounts ? ` (${adminCounts.CONFIGURED})` : ''}</option>
              <option value="PENDING">Admin Pending{adminCounts ? ` (${adminCounts.PENDING})` : ''}</option>
              <option value="INACTIVE">Admin Inactive{adminCounts ? ` (${adminCounts.INACTIVE})` : ''}</option>
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

                    <div className="mt-2 flex items-center gap-2" data-testid="brand-admin-row" data-brand={brand.brandId || brand.id}>
                      <CityAdminStatusChip s={adminByBrand[brand.brandId || brand.id]?.adminStatus || 'PENDING'} />
                      {adminByBrand[brand.brandId || brand.id]?.admin && <span className="truncate text-[11px] text-slate-500">{adminByBrand[brand.brandId || brand.id].admin.name}</span>}
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

                      <Link
                        to={`/super-admin/brands/edit/${brand.brandId || brand.id}#cityadmin`}
                        data-testid="brand-admin-action"
                        className="flex items-center gap-1 rounded-lg border border-[#79B433]/40 bg-[#79B433]/5 px-2.5 py-1 text-[11px] font-bold text-[#4d7a1c] no-underline hover:bg-[#79B433]/10"
                      >
                        <ShieldCheck size={12} />
                        <span>{{ CONFIGURED: 'View Admin', INACTIVE: 'Edit Admin' }[adminByBrand[brand.brandId || brand.id]?.adminStatus] || 'Configure Admin'}</span>
                      </Link>

                      {(
                        <button
                          type="button"
                          data-testid={`delete-brand-${brand.brandId || brand.id}`}
                          onClick={() => openDelete(brand)}
                          title="Permanently delete this brand"
                          className="flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600 transition hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      )}

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

      {deleteTarget && (
        <div
          data-testid="delete-brand-modal"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 p-4"
          onClick={closeDelete}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Trash2 size={16} />
                </span>
                <h3 className="text-base font-extrabold text-slate-900">Delete brand permanently?</h3>
              </div>
              <button type="button" onClick={closeDelete} className="rounded-full border-none bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200 cursor-pointer">
                <X size={14} />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              <strong className="text-slate-900">{deleteTarget.name}</strong> ({deleteTarget.code}) will be removed from the
              database. <strong className="text-red-600">This cannot be undone.</strong> A brand that still has sellers,
              employees or other records linked to it cannot be deleted; deactivate it instead.
            </p>

            {deleteTarget.isDefault && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
                This is the <strong>CORE</strong> brand. Other parts of the platform (for example new employee records)
                still use it as their default, so only delete it if you no longer need it.
              </div>
            )}

            <label className="mt-4 block text-[11px] font-bold text-slate-700">
              Type the brand code <span className="font-mono text-red-600">{deleteTarget.code}</span> to confirm
            </label>
            <input
              data-testid="delete-brand-input"
              autoFocus
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && deleteConfirm.trim().toUpperCase() === String(deleteTarget.code || '').toUpperCase()) confirmDelete();
              }}
              placeholder={deleteTarget.code}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm outline-none focus:border-red-400"
            />

            {deleteError && (
              <div data-testid="delete-brand-error" className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] font-medium text-red-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeDelete}
                disabled={deleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="delete-brand-confirm"
                onClick={confirmDelete}
                disabled={deleting || deleteConfirm.trim().toUpperCase() !== String(deleteTarget.code || '').toUpperCase()}
                className="flex items-center gap-1.5 rounded-xl border-none bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{deleting ? 'Deleting…' : 'Delete permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminBrands;
