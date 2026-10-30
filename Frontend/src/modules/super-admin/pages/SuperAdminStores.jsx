import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Store,
  Building2,
  Search,
  Filter,
  Download,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  Eye,
  X,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Package,
  Boxes,
  ShoppingCart,
  TrendingUp,
  Receipt,
  Wallet,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  ArrowLeft,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import { useSuperAdmin } from '../context/SuperAdminContext';
import { superAdminService } from '../../../services/superAdminService';

const PAGE_SIZE = 8;

const formatCurrencyINR = (amount) => {
  const val = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const SuperAdminStores = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    selectedBrandId,
    setSelectedBrandId,
    selectedBrand: currentScopeBrand,
    brands,
  } = useSuperAdmin();

  // Component state
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scopeStats, setScopeStats] = useState({ total: 0, active: 0, pending: 0, inactive: 0 });
  const [brandCounts, setBrandCounts] = useState({});

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedVerification, setSelectedVerification] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStore, setActiveStore] = useState(null);

  // Fetch live stores from backend with race-condition prevention
  const fetchStores = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    try {
      const res = await superAdminService.getStores({
        brandId: selectedBrandId,
        search: searchQuery.trim() || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        page: 1,
        limit: 100,
      });

      if (!isMounted) return;

      if (res?.success) {
        const fetchedStores = res.stores || [];
        setStores(fetchedStores);

        if (res.stats) {
          setScopeStats(res.stats);
        } else {
          setScopeStats({
            total: res.total !== undefined ? res.total : fetchedStores.length,
            active: fetchedStores.filter((s) => s.storeStatus === 'Active').length,
            pending: fetchedStores.filter(
              (s) => s.verificationStatus === 'Pending' || s.verificationStatus === 'Under Review'
            ).length,
            inactive: fetchedStores.filter((s) => s.storeStatus === 'Inactive').length,
          });
        }

        if (res.brandCounts) {
          setBrandCounts(res.brandCounts);
        }
      } else {
        setError(res?.message || 'Failed to retrieve store records from MongoDB.');
      }
    } catch (err) {
      if (!isMounted) return;
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Error connecting to MongoDB backend. Please check network and retry.';
      setError(msg);
    } finally {
      if (!isMounted) return;
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [selectedBrandId, searchQuery, selectedStatus]);

  useEffect(() => {
    fetchStores();
    setCurrentPage(1);
  }, [fetchStores]);

  // Extract unique cities from live stores and registered brands
  const availableCities = useMemo(() => {
    const citySet = new Set();
    stores.forEach((s) => {
      if (s.city) citySet.add(s.city);
    });
    brands.forEach((b) => {
      if (b.city) citySet.add(b.city);
    });
    return Array.from(citySet).sort();
  }, [stores, brands]);

  // Client-side filtering for city, verification, and registration period
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // City filter
      if (selectedCity !== 'ALL' && store.city !== selectedCity) {
        return false;
      }

      // Verification filter
      if (selectedVerification !== 'ALL' && store.verificationStatus !== selectedVerification) {
        return false;
      }

      // Period filter (based on registeredAt)
      if (selectedPeriod !== 'ALL') {
        if (!store.registeredAt || store.registeredAt === 'N/A') return false;
        const today = new Date();
        const rDate = new Date(store.registeredAt);
        const diffDays = (today - rDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) return false;
        if (selectedPeriod === 'weekly' && diffDays > 7) return false;
        if (selectedPeriod === 'monthly' && diffDays > 30) return false;
        if (selectedPeriod === 'quarterly' && diffDays > 91) return false;
        if (selectedPeriod === 'half_yearly' && diffDays > 182) return false;
        if (selectedPeriod === 'yearly' && diffDays > 365) return false;
      }

      return true;
    });
  }, [stores, selectedCity, selectedVerification, selectedPeriod]);

  // Total stores across all registered brands for the portfolio card
  const totalPortfolioStores = useMemo(() => {
    return Object.values(brandCounts).reduce((acc, curr) => acc + (curr.total || 0), 0);
  }, [brandCounts]);

  const activePortfolioStores = useMemo(() => {
    return Object.values(brandCounts).reduce((acc, curr) => acc + (curr.active || 0), 0);
  }, [brandCounts]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStores.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedStores = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredStores.slice(start, start + PAGE_SIZE);
  }, [filteredStores, validPage]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCity('ALL');
    setSelectedVerification('ALL');
    setSelectedStatus('ALL');
    setSelectedPeriod('ALL');
    setCurrentPage(1);
  };

  // Switch brand scope
  const handleSelectBrand = (brandId) => {
    setSelectedBrandId(brandId);
    setCurrentPage(1);
  };

  // CSV Export of live filtered data
  const handleExportCSV = () => {
    if (filteredStores.length === 0) {
      alert('No store records available to export.');
      return;
    }

    const headers = [
      'Store ID',
      'Store Name',
      'Seller Name',
      'Seller ID',
      'Brand',
      'City',
      'Address',
      'Contact Email',
      'Contact Phone',
      'Listed Products',
      'Total Orders',
      'Total Revenue (INR)',
      'Registration Date',
      'Verification Status',
      'Store Status',
    ];

    const rows = filteredStores.map((s) => [
      s.storeId,
      `"${(s.storeName || '').replace(/"/g, '""')}"`,
      `"${(s.sellerName || '').replace(/"/g, '""')}"`,
      s.sellerId,
      s.brandName,
      s.city,
      `"${(s.address || '').replace(/"/g, '""')}"`,
      s.email,
      `"${s.phone}"`,
      s.productCount || 0,
      s.totalOrders || 0,
      s.salesSummary?.totalRevenue || 0,
      s.registeredAt || 'N/A',
      s.verificationStatus,
      s.storeStatus,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Savitri_Stores_Report_${selectedBrandId}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800 pb-20">
      {/* Super Admin Top Header */}
      <SuperAdminHeader
        title="Stores & Sellers"
        subtitle="Live MongoDB multi-merchant catalog, store verification status, order performance, and account oversight."
        subtitleClassName="m-0 mt-0.5 max-w-3xl text-xs font-medium text-slate-500"
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb & Top Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
              Super Admin
            </Link>
            <span>/</span>
            <span className="text-slate-600">Stores & Sellers</span>
            <span>/</span>
            <span className="font-bold text-[#79B433]">
              {selectedBrandId === 'ALL' ? 'All Regions (Consolidated)' : currentScopeBrand?.name || selectedBrandId}
            </span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStores}
              disabled={loading}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all disabled:opacity-50"
              title="Refresh store records from MongoDB"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin text-[#79B433]' : 'text-slate-500'} />
              <span>{loading ? 'Refreshing...' : 'Live Refresh'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Download size={14} className="text-[#F7941D]" /> Export CSV
            </button>
          </div>
        </div>

        {/* Live Brand Scope Indicator Banner */}
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 text-xs text-emerald-900 shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck size={16} className="text-emerald-700 shrink-0" />
            <span>
              <strong>Live Database Scope:</strong> Scoped to{' '}
              <span className="font-bold underline">
                {selectedBrandId === 'ALL' ? 'All Regions (Consolidated Portfolio)' : currentScopeBrand?.name || selectedBrandId}
              </span>
              . Only authorized merchant stores registered under this entity are displayed.
            </span>
          </div>
          <span className="text-[10.5px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300 shrink-0">
            MONGODB SYNCED
          </span>
        </div>

        {/* Brand Overview & Selection Row */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 m-0">
              <Building2 size={14} className="text-[#F7941D]" /> Brand Overview & Selector
            </h3>
            <span className="text-xs text-slate-400 font-medium">Click a brand card to scope stores</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* "All Brands" Card */}
            <div
              onClick={() => handleSelectBrand('ALL')}
              className={`cursor-pointer rounded-2xl border p-4 shadow-xs transition-all duration-200 hover:shadow-md ${
                selectedBrandId === 'ALL'
                  ? 'border-[#1A2E0A] bg-[#1A2E0A] text-white shadow-sm ring-2 ring-[#1A2E0A]/20'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    selectedBrandId === 'ALL' ? 'text-teal-200' : 'text-slate-500'
                  }`}
                >
                  All Brands
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    selectedBrandId === 'ALL'
                      ? 'bg-teal-900/60 text-teal-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  PORTFOLIO
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black">
                  {totalPortfolioStores > 0 ? totalPortfolioStores : stores.length} Stores
                </div>
                <div
                  className={`mt-1 flex items-center gap-2 text-[11px] font-medium ${
                    selectedBrandId === 'ALL' ? 'text-teal-200/80' : 'text-slate-500'
                  }`}
                >
                  <span>{activePortfolioStores} Active</span>
                  <span>•</span>
                  <span>All MP Hubs</span>
                </div>
              </div>
            </div>

            {/* Individual Live Brand Cards */}
            {brands.map((b) => {
              const bId = b.brandId || b.id;
              const countInfo = brandCounts[bId] || { total: 0, active: 0, pending: 0 };
              const isSelected = selectedBrandId === bId;

              return (
                <div
                  key={bId}
                  onClick={() => handleSelectBrand(bId)}
                  className={`cursor-pointer rounded-2xl border p-4 shadow-xs transition-all duration-200 hover:shadow-md ${
                    isSelected
                      ? 'border-[#1A2E0A] bg-[#1A2E0A] text-white shadow-sm ring-2 ring-[#1A2E0A]/20'
                      : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black uppercase tracking-wider truncate mr-1 ${
                        isSelected ? 'text-teal-200' : 'text-slate-700'
                      }`}
                      title={b.name}
                    >
                      {b.shortName || b.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isSelected
                          ? 'bg-teal-900/60 text-teal-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {b.code}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-black">{countInfo.total} Stores</div>
                    <div
                      className={`mt-1 flex items-center gap-2 text-[11px] font-medium ${
                        isSelected ? 'text-teal-200/80' : 'text-slate-500'
                      }`}
                    >
                      <span className={isSelected ? 'text-emerald-300' : 'text-emerald-600'}>
                        {countInfo.active} Active
                      </span>
                      <span>•</span>
                      <span className="truncate">{b.city}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Metric Summary Cards for Current Scope */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Stores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Stores</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Store size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{scopeStats.total}</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {selectedBrandId === 'ALL'
                  ? 'Across all platform brands'
                  : `Registered under ${currentScopeBrand?.name || selectedBrandId}`}
              </p>
            </div>
          </div>

          {/* Active Stores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Active Stores</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-emerald-900 tracking-tight">{scopeStats.active}</h3>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Live merchant accounts accepting orders</p>
            </div>
          </div>

          {/* Pending Verification */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Verification</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-amber-900 tracking-tight">{scopeStats.pending}</h3>
              <p className="mt-1 text-xs text-amber-600 font-medium">KYC or registration pending approval</p>
            </div>
          </div>

          {/* Inactive Stores */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Inactive Stores</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <XCircle size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">{scopeStats.inactive}</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">Paused or suspended merchant accounts</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search store name, seller name, or store ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#79B433] focus:bg-white"
              />
            </div>

            {/* Brand Dropdown */}
            <div>
              <select
                value={selectedBrandId}
                onChange={(e) => handleSelectBrand(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#79B433] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Brands (Consolidated)</option>
                {brands.map((b) => {
                  const bId = b.brandId || b.id;
                  return (
                    <option key={bId} value={bId}>
                      {b.name} ({b.city})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* City Dropdown */}
            <div>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#79B433] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Cities</option>
                {availableCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Verification Status Dropdown */}
            <div>
              <select
                value={selectedVerification}
                onChange={(e) => {
                  setSelectedVerification(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#79B433] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Verification Statuses</option>
                <option value="Verified">Verified</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>

            {/* Registration Period Dropdown */}
            <div>
              <select
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#79B433] focus:bg-white cursor-pointer"
                aria-label="Filter by registration period"
                title="Filter by registration period"
              >
                <option value="ALL">All Time</option>
                <option value="weekly">Weekly (Last 7 Days)</option>
                <option value="monthly">Monthly (Last 30 Days)</option>
                <option value="quarterly">Quarterly (Last 90 Days)</option>
                <option value="half_yearly">Half-Yearly (Last 180 Days)</option>
                <option value="yearly">Yearly (Last 365 Days)</option>
              </select>
            </div>
          </div>

          {/* Secondary Row: Store Status Filter & Reset */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">
                Store Status:
              </span>
              {['ALL', 'Active', 'Inactive'].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setSelectedStatus(status);
                    setCurrentPage(1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    selectedStatus === status
                      ? 'bg-[#1A2E0A] text-white border-[#1A2E0A] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {status === 'ALL' ? 'All Statuses' : status}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {(selectedCity !== 'ALL' ||
                selectedVerification !== 'ALL' ||
                selectedStatus !== 'ALL' ||
                selectedPeriod !== 'ALL' ||
                searchQuery.trim()) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-bold text-[#F7941D] hover:underline bg-transparent border-none cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              )}
              <span className="text-xs font-semibold text-slate-500">
                Showing <strong className="text-slate-800">{filteredStores.length}</strong> matching stores
              </span>
            </div>
          </div>
        </div>

        {/* Stores Table Container */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-[#79B433]" />
              <p className="text-xs font-semibold text-slate-500">Retrieving store records from MongoDB...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center bg-rose-50/50">
              <AlertCircle size={36} className="mx-auto mb-2 text-rose-500" />
              <h4 className="text-sm font-bold text-rose-800">{error}</h4>
              <p className="text-xs text-rose-600 mt-1">
                Could not load stores for {currentScopeBrand?.name || selectedBrandId}.
              </p>
              <button
                onClick={fetchStores}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs border-none"
              >
                <RefreshCw size={12} /> Retry Request
              </button>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="p-16 text-center">
              <Store size={44} className="mx-auto mb-3 text-slate-300" />
              <h4 className="text-base font-bold text-slate-800 m-0">
                {stores.length === 0
                  ? 'No stores have been registered under this brand yet.'
                  : 'No stores match your current filters.'}
              </h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {stores.length === 0
                  ? `There are currently 0 seller accounts associated with ${currentScopeBrand?.name || selectedBrandId} in MongoDB.`
                  : 'Try adjusting your search query, status, or city filter to view matching stores.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {stores.length > 0 ? (
                  <button
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer shadow-xs"
                  >
                    Reset Filters
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectBrand('ALL')}
                    className="px-4 py-2 rounded-xl border-none bg-[#79B433] hover:bg-[#689A2B] text-xs font-bold text-white cursor-pointer shadow-xs"
                  >
                    View All Brands (Consolidated)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-4 px-4">Store ID</th>
                    <th className="py-4 px-4">Store & Seller</th>
                    <th className="py-4 px-4">Brand</th>
                    <th className="py-4 px-4">City / Location</th>
                    <th className="py-4 px-4 text-center">Listed Products</th>
                    <th className="py-4 px-4 text-center">Total Orders</th>
                    <th className="py-4 px-4">Registered Date</th>
                    <th className="py-4 px-4">Verification</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedStores.map((store) => (
                    <tr key={store.storeId || store._id} className="transition-colors hover:bg-slate-50/70">
                      {/* Store ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#F7941D]">
                        {store.storeId}
                      </td>

                      {/* Store Name & Seller */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm">{store.storeName}</span>
                          <span className="text-[11px] text-slate-500 mt-0.5">
                            Seller: <span className="font-medium text-slate-700">{store.sellerName}</span> ({store.sellerId?.slice(-6)})
                          </span>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {store.brandName}
                        </span>
                      </td>

                      {/* City / Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin size={13} className="text-slate-400 shrink-0" />
                          <span>{store.city}</span>
                        </div>
                      </td>

                      {/* Listed Products */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {store.productCount || 0}
                      </td>

                      {/* Total Orders */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                        {store.totalOrders || 0}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3.5 px-4 text-slate-500 font-medium">
                        {store.registeredAt}
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            store.verificationStatus === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : store.verificationStatus === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {store.verificationStatus === 'Verified' && <CheckCircle size={11} />}
                          {store.verificationStatus === 'Pending' && <Clock size={11} />}
                          {store.verificationStatus}
                        </span>
                      </td>

                      {/* Store Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            store.storeStatus === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              store.storeStatus === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {store.storeStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActiveStore(store)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#1A2E0A] hover:text-white text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-all shadow-2xs active:scale-95"
                          title="View Store Details"
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Bar */}
          {!loading && !error && totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3.5 text-xs text-slate-600">
              <div>
                Showing{' '}
                <strong className="text-slate-900">
                  {(validPage - 1) * PAGE_SIZE + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900">
                  {Math.min(validPage * PAGE_SIZE, filteredStores.length)}
                </strong>{' '}
                of <strong className="text-slate-900">{filteredStores.length}</strong> stores
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold text-slate-700 transition-colors"
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                      validPage === pg
                        ? 'bg-[#1A2E0A] text-white border-[#1A2E0A] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold text-slate-700 transition-colors"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Read-Only Drawer (Side Sheet) */}
        {activeStore && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs transition-all">
            <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#F7941D] font-mono">
                      {activeStore.storeId}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {activeStore.brandName}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 m-0 mt-1 leading-tight">
                    {activeStore.storeName}
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5 font-medium">
                    Operated by {activeStore.sellerName} ({activeStore.sellerId?.slice(-6)})
                  </p>
                </div>
                <button
                  onClick={() => setActiveStore(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors"
                  title="Close Drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="p-6 space-y-6 flex-1 text-xs font-sans">
                {/* Live Verification Notice Banner */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 flex items-start gap-2.5 text-emerald-900">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[11px] uppercase tracking-wider">
                      Live MongoDB Record • Scoped
                    </strong>
                    <span className="text-emerald-800 text-[11px]">
                      Authenticated merchant storefront registered under {activeStore.brandName} ({activeStore.city}).
                    </span>
                  </div>
                </div>

                {/* Status Badges Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Verification Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        activeStore.verificationStatus === 'Verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {activeStore.verificationStatus === 'Verified' ? <CheckCircle size={12} /> : <Clock size={12} />}
                      {activeStore.verificationStatus}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-3 bg-slate-50/50">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Store Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        activeStore.storeStatus === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          activeStore.storeStatus === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {activeStore.storeStatus}
                    </span>
                  </div>
                </div>

                {/* Contact & Location Card */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    Contact & Address
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" /> Email Address
                      </span>
                      <span className="font-semibold text-slate-800">{activeStore.email || 'N/A'}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" /> Phone Number
                      </span>
                      <span className="font-semibold text-slate-800 font-mono">{activeStore.phone || 'N/A'}</span>
                    </div>
                    <div className="p-3 flex items-start justify-between gap-3">
                      <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                        <MapPin size={13} className="text-slate-400" /> Store Address
                      </span>
                      <span className="font-semibold text-slate-800 text-right">
                        {activeStore.address ? `${activeStore.address}, ` : ''}
                        {activeStore.city}, {activeStore.state}
                        {activeStore.pincode ? ` - ${activeStore.pincode}` : ''}
                      </span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" /> Registered On
                      </span>
                      <span className="font-semibold text-slate-800">{activeStore.registeredAt}</span>
                    </div>
                  </div>
                </div>

                {/* Inventory Summary */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0 flex items-center justify-between">
                    <span>Inventory & Product Catalog</span>
                    <span className="text-slate-500 font-semibold">{activeStore.productCount || 0} Total Products</span>
                  </h4>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Total Physical Units in Stock</span>
                    <span className="font-bold text-slate-900">
                      {(activeStore.inventorySummary?.totalUnits || 0).toLocaleString('en-IN')} Units
                    </span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Estimated Inventory Valuation</span>
                    <span className="font-bold text-emerald-700">
                      {formatCurrencyINR(activeStore.inventorySummary?.valuation || 0)}
                    </span>
                  </div>
                </div>

                {/* Sales & Orders Summary */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0 flex items-center justify-between">
                    <span>Sales & Orders Summary</span>
                    <span className="text-slate-500 font-semibold">{activeStore.totalOrders || 0} Orders Total</span>
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Gross Sales Volume</span>
                      <span className="font-black text-slate-900 text-sm">
                        {formatCurrencyINR(activeStore.salesSummary?.totalRevenue || 0)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Completed Deliveries</span>
                      <span className="font-bold text-emerald-700">
                        {activeStore.salesSummary?.completedOrders || 0} Orders
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Average Order Value (AOV)</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrencyINR(activeStore.salesSummary?.avgOrderValue || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Seller Payout Summary */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    Settlements & Payouts
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Total Cleared Payouts</span>
                      <span className="font-black text-emerald-700">
                        {formatCurrencyINR(activeStore.payoutSummary?.totalPaid || 0)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Pending Settlement</span>
                      <span className="font-bold text-amber-700">
                        {formatCurrencyINR(activeStore.payoutSummary?.pendingAmount || 0)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Payout Status</span>
                      <span className="font-bold text-slate-800">
                        {activeStore.payoutSummary?.payoutStatus || 'Settled'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Store ID: <span className="font-mono text-slate-700 font-bold">{activeStore.storeId}</span>
                </span>
                <button
                  onClick={() => setActiveStore(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all shadow-2xs"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminStores;
