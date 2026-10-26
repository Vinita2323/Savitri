import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bike,
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
  Truck,
  Wallet,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  FileText,
  BadgeCheck,
  Star,
  Radio,
  Navigation
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import {
  DELIVERY_PARTNERS_MOCK,
  DELIVERY_PARTNER_BRANDS,
  DELIVERY_PARTNER_CITIES,
  formatINR,
} from '../data/deliveryPartnersMock';

const PAGE_SIZE = 8;

export const SuperAdminDeliveryPartners = () => {
  const [partnerList] = useState(DELIVERY_PARTNERS_MOCK);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedVerification, setSelectedVerification] = useState('ALL');
  const [selectedAvailability, setSelectedAvailability] = useState('ALL');
  const [selectedAccountStatus, setSelectedAccountStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Active drawer state
  const [activePartner, setActivePartner] = useState(null);

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    if (period === 'ALL') {
      setStartDate('');
      setEndDate('');
    } else {
      const today = new Date();
      const endStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const start = new Date(today);

      if (period === 'weekly') {
        start.setDate(today.getDate() - 7);
      } else if (period === 'monthly') {
        start.setMonth(today.getMonth() - 1);
      } else if (period === 'quarterly') {
        start.setMonth(today.getMonth() - 3);
      } else if (period === 'half_yearly') {
        start.setMonth(today.getMonth() - 6);
      } else if (period === 'yearly') {
        start.setFullYear(today.getFullYear() - 1);
      }

      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
      setStartDate(startStr);
      setEndDate(endStr);
    }
    setCurrentPage(1);
  };

  const handleCustomDateChange = (type, val) => {
    if (type === 'start') setStartDate(val);
    else setEndDate(val);
    setSelectedPeriod('custom');
    setCurrentPage(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('ALL');
    setSelectedCity('ALL');
    setSelectedVerification('ALL');
    setSelectedAvailability('ALL');
    setSelectedAccountStatus('ALL');
    setSelectedPeriod('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Filtered partners calculation
  const filteredPartners = useMemo(() => {
    return partnerList.filter((partner) => {
      // Search filter (name, ID, phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = partner.fullName.toLowerCase().includes(q);
        const matchesId = partner.id.toLowerCase().includes(q);
        const matchesPhone = partner.maskedPhone.toLowerCase().includes(q);
        const matchesArea = partner.serviceArea.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesPhone && !matchesArea) {
          return false;
        }
      }

      // Brand filter
      if (selectedBrand !== 'ALL' && partner.brandSlug !== selectedBrand) {
        return false;
      }

      // City filter
      if (selectedCity !== 'ALL' && partner.city !== selectedCity) {
        return false;
      }

      // Verification filter
      if (selectedVerification !== 'ALL' && partner.verificationStatus !== selectedVerification) {
        return false;
      }

      // Availability filter
      if (selectedAvailability !== 'ALL' && partner.availabilityStatus !== selectedAvailability) {
        return false;
      }

      // Account status filter
      if (selectedAccountStatus !== 'ALL' && partner.accountStatus !== selectedAccountStatus) {
        return false;
      }

      // Joined date filters
      if (startDate && partner.joinedDate < startDate) {
        return false;
      }
      if (endDate && partner.joinedDate > endDate) {
        return false;
      }
      if (!startDate && !endDate && selectedPeriod && selectedPeriod !== 'ALL' && selectedPeriod !== 'custom') {
        const today = new Date();
        const pDate = new Date(partner.joinedDate);
        const diffDays = (today - pDate) / (1000 * 60 * 60 * 24);
        if (selectedPeriod === 'weekly' && diffDays > 7) return false;
        if (selectedPeriod === 'monthly' && diffDays > 30) return false;
        if (selectedPeriod === 'quarterly' && diffDays > 91) return false;
        if (selectedPeriod === 'half_yearly' && diffDays > 182) return false;
        if (selectedPeriod === 'yearly' && diffDays > 365) return false;
      }

      return true;
    });
  }, [
    partnerList,
    searchQuery,
    selectedBrand,
    selectedCity,
    selectedVerification,
    selectedAvailability,
    selectedAccountStatus,
    selectedPeriod,
    startDate,
    endDate,
  ]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    const totalPartners = partnerList.length;
    const activePartners = partnerList.filter((p) => p.accountStatus === 'Active').length;
    const pendingVerification = partnerList.filter(
      (p) => p.verificationStatus === 'Pending Verification' || p.verificationStatus === 'Under Review'
    ).length;
    const completedDeliveries = partnerList.reduce((acc, p) => acc + (p.completedDeliveries || 0), 0);

    return {
      totalPartners,
      activePartners,
      pendingVerification,
      completedDeliveries,
    };
  }, [partnerList]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredPartners.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedPartners = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return filteredPartners.slice(start, start + PAGE_SIZE);
  }, [filteredPartners, validPage]);

  // Export CSV handler
  const handleExportCSV = () => {
    if (filteredPartners.length === 0) {
      alert('No delivery partner records available to export.');
      return;
    }

    const headers = [
      'Partner ID',
      'Full Name',
      'Phone Number',
      'Brand',
      'City',
      'Service Area',
      'Vehicle Type',
      'Vehicle Number',
      'Completed Deliveries',
      'Availability Status',
      'Verification Status',
      'Account Status',
      'Total Earnings (INR)',
      'Cash in Hand (INR)',
      'Joined Date',
    ];

    const rows = filteredPartners.map((p) => [
      p.id,
      `"${p.fullName.replace(/"/g, '""')}"`,
      p.maskedPhone,
      p.brandName,
      p.city,
      `"${p.serviceArea.replace(/"/g, '""')}"`,
      `"${p.vehicleType}"`,
      p.vehicleNumber,
      p.completedDeliveries,
      p.availabilityStatus,
      p.verificationStatus,
      p.accountStatus,
      p.earningsSummary.totalEarnings,
      p.codSummary.cashInHand,
      p.joinedDate,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Savitri_Delivery_Partners_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      {/* Super Admin Top Header */}
      <SuperAdminHeader
        title="Delivery Partners"
        subtitle="Real-time multi-brand captain roster, verification audit, fleet availability, and delivery performance."
        subtitleClassName="m-0 mt-0.5 max-w-3xl text-xs font-medium text-slate-500"
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb & Top Action */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
              Super Admin
            </Link>
            <span>/</span>
            <span className="font-bold text-slate-800">Delivery Partners & Captain Roster</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
            >
              <Download size={14} className="text-[#F7941D]" /> Export CSV
            </button>
          </div>
        </div>

        {/* Read-Only Demo Notice */}
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900 shadow-2xs">
          <div className="flex items-center gap-2 font-medium">
            <Info size={15} className="text-amber-700 shrink-0" />
            <span>
              <strong>Read-Only Monitoring Interface:</strong> Platform oversight of verified logistics captains, vehicle documents, and delivery metrics. Live status toggles or payment releases are handled via dispatch and accounting gateways.
            </span>
          </div>
          <span className="text-[10.5px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
            VIEW-ONLY
          </span>
        </div>

        {/* Dashboard KPI Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Delivery Partners */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Partners</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Bike size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalPartners}</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">Captains registered across all brands</p>
            </div>
          </div>

          {/* Card 2: Active Delivery Partners */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Active Partners</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-emerald-900 tracking-tight">{stats.activePartners}</h3>
              <p className="mt-1 text-xs text-emerald-600 font-medium">Authorized for live delivery dispatch</p>
            </div>
          </div>

          {/* Card 3: Pending Verification */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Verification</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Clock size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-amber-900 tracking-tight">{stats.pendingVerification}</h3>
              <p className="mt-1 text-xs text-amber-600 font-medium">KYC or driving license under review</p>
            </div>
          </div>

          {/* Card 4: Completed Deliveries */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Completed Deliveries</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Package size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {stats.completedDeliveries.toLocaleString('en-IN')}
              </h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">Total platform orders successfully fulfilled</p>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          {/* Main Search and Primary Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
                placeholder="Search by name, ID (e.g. CAP-IND-101), or phone..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#F7941D] focus:bg-white"
              />
            </div>

            {/* Brand Filter */}
            <div>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Brands (4)</option>
                {DELIVERY_PARTNER_BRANDS.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <select
                value={selectedCity}
                onChange={(e) => {
                  setSelectedCity(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Service Cities</option>
                {DELIVERY_PARTNER_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Verification Status Filter */}
            <div>
              <select
                value={selectedVerification}
                onChange={(e) => {
                  setSelectedVerification(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Verification Statuses</option>
                <option value="Verified">Verified</option>
                <option value="Pending Verification">Pending Verification</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>
          </div>

          {/* Secondary Filter Row: Availability, Account Status, Period, Date Range */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-t border-slate-100 pt-3">
            {/* Availability Filter */}
            <div>
              <select
                value={selectedAvailability}
                onChange={(e) => {
                  setSelectedAvailability(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Availability States</option>
                <option value="Online / Available">Online / Available</option>
                <option value="On Delivery">On Delivery</option>
                <option value="Offline">Offline</option>
              </select>
            </div>

            {/* Account Status Filter */}
            <div>
              <select
                value={selectedAccountStatus}
                onChange={(e) => {
                  setSelectedAccountStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>
            </div>

            {/* Period Filter */}
            <div>
              <select
                value={selectedPeriod}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
                aria-label="Filter by time period"
                title="Filter by time period"
              >
                <option value="ALL">All Time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half-Yearly</option>
                <option value="yearly">Yearly</option>
                {selectedPeriod === 'custom' && <option value="custom">Custom Range</option>}
              </select>
            </div>

            {/* Date From */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#F7941D] focus:bg-white"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-bold shrink-0">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-[#F7941D] focus:bg-white"
              />
            </div>

            {/* Active Filters Summary & Reset */}
            <div className="flex items-center justify-end gap-2">
              {(searchQuery.trim() ||
                selectedBrand !== 'ALL' ||
                selectedCity !== 'ALL' ||
                selectedVerification !== 'ALL' ||
                selectedAvailability !== 'ALL' ||
                selectedAccountStatus !== 'ALL' ||
                selectedPeriod !== 'ALL' ||
                startDate ||
                endDate) && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 text-xs font-bold text-[#F7941D] hover:underline bg-transparent border-none cursor-pointer"
                >
                  <RotateCcw size={12} /> Reset Filters
                </button>
              )}
              <span className="text-xs font-semibold text-slate-500">
                Found <strong className="text-slate-800">{filteredPartners.length}</strong> partners
              </span>
            </div>
          </div>
        </div>

        {/* Delivery Partner Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-4">Partner ID</th>
                  <th className="py-4 px-4">Full Name & Phone</th>
                  <th className="py-4 px-4">Brand</th>
                  <th className="py-4 px-4">City / Service Area</th>
                  <th className="py-4 px-4">Vehicle Type</th>
                  <th className="py-4 px-4 text-center">Completed Deliveries</th>
                  <th className="py-4 px-4">Availability</th>
                  <th className="py-4 px-4">Verification</th>
                  <th className="py-4 px-4">Account</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedPartners.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      <Bike size={36} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-600">No delivery partners found matching your search.</p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-bold text-[#F7941D] hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Reset all filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedPartners.map((partner) => (
                    <tr key={partner.id} className="transition-colors hover:bg-slate-50/70">
                      {/* Partner ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#F7941D]">
                        {partner.id}
                      </td>

                      {/* Full Name & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {partner.fullName}
                            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.2 rounded font-bold border border-amber-200/60 flex items-center gap-0.5">
                              <Star size={9} fill="currentColor" /> {partner.rating}
                            </span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {partner.maskedPhone}
                          </span>
                        </div>
                      </td>

                      {/* Brand */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {partner.brandName}
                        </span>
                      </td>

                      {/* City / Service Area */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            {partner.city}
                          </span>
                          <span className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]">
                            {partner.serviceArea}
                          </span>
                        </div>
                      </td>

                      {/* Vehicle Type */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{partner.vehicleType}</span>
                          <span className="text-[10.5px] font-mono text-slate-500 mt-0.5">
                            {partner.vehicleNumber}
                          </span>
                        </div>
                      </td>

                      {/* Completed Deliveries */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-slate-900 text-sm">
                          {partner.completedDeliveries}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {partner.todayDeliveries} today
                        </span>
                      </td>

                      {/* Availability Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            partner.availabilityStatus === 'Online / Available'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : partner.availabilityStatus === 'On Delivery'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              partner.availabilityStatus === 'Online / Available'
                                ? 'bg-emerald-500 animate-pulse'
                                : partner.availabilityStatus === 'On Delivery'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {partner.availabilityStatus}
                        </span>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            partner.verificationStatus === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : partner.verificationStatus === 'Pending Verification'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {partner.verificationStatus === 'Verified' && <CheckCircle size={11} />}
                          {partner.verificationStatus === 'Pending Verification' && <Clock size={11} />}
                          {partner.verificationStatus}
                        </span>
                      </td>

                      {/* Account Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            partner.accountStatus === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : partner.accountStatus === 'Inactive'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {partner.accountStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setActivePartner(partner)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#1A2E0A] hover:text-white text-slate-700 text-xs font-bold border border-slate-200 cursor-pointer transition-all shadow-2xs active:scale-95"
                          title="View Partner Details"
                        >
                          <Eye size={13} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3.5 text-xs text-slate-600">
              <div>
                Showing{' '}
                <strong className="text-slate-900">
                  {(validPage - 1) * PAGE_SIZE + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-slate-900">
                  {Math.min(validPage * PAGE_SIZE, filteredPartners.length)}
                </strong>{' '}
                of <strong className="text-slate-900">{filteredPartners.length}</strong> delivery partners
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

        {/* Read-Only Details Drawer (Side Sheet) */}
        {activePartner && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs transition-all">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#F7941D] font-mono">
                      {activePartner.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {activePartner.brandName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                      <Star size={9} fill="currentColor" /> {activePartner.rating}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 m-0 mt-1 leading-tight">
                    {activePartner.fullName}
                  </h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5 font-medium">
                    Delivery Partner • {activePartner.serviceArea} ({activePartner.city})
                  </p>
                </div>
                <button
                  onClick={() => setActivePartner(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 border-none bg-transparent cursor-pointer transition-colors"
                  title="Close Drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="p-6 space-y-6 flex-1 text-xs font-sans">
                {/* Demo Notice Banner */}
                <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-3 flex items-start gap-2.5 text-blue-900">
                  <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-[11px] uppercase tracking-wider">
                      Static Demo Record • Read-Only
                    </strong>
                    <span className="text-blue-800 text-[11px]">
                      This profile is maintained for platform oversight. Approvals, route reassignments, and wallet disbursements are performed through specialized captain ops modules.
                    </span>
                  </div>
                </div>

                {/* 1. Personal Profile & Contact Information */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    1. Personal Profile & Contact
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone size={13} className="text-slate-400" /> Masked Phone
                      </span>
                      <span className="font-semibold text-slate-800 font-mono">{activePartner.maskedPhone}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" /> Email Address
                      </span>
                      <span className="font-semibold text-slate-800">{activePartner.email}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone size={13} className="text-rose-400" /> Emergency Contact
                      </span>
                      <span className="font-semibold text-slate-800">{activePartner.emergencyContact}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" /> Onboarded Date
                      </span>
                      <span className="font-semibold text-slate-800">{activePartner.joinedDate}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Brand & Operating Location */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    2. Brand & Service Location
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Assigned Brand</span>
                      <span className="font-bold text-slate-800">{activePartner.brandName}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Base Service City</span>
                      <span className="font-bold text-slate-800">{activePartner.city}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Primary Delivery Hub</span>
                      <span className="font-semibold text-slate-800">{activePartner.hub}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Service Coverage Area</span>
                      <span className="font-semibold text-slate-800">{activePartner.serviceArea}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Vehicle Details */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    3. Registered Vehicle Details
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Vehicle Type</span>
                      <span className="font-bold text-slate-800">{activePartner.vehicleType}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Vehicle Make / Model</span>
                      <span className="font-semibold text-slate-800">{activePartner.vehicleModel}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Registration Number</span>
                      <span className="font-mono font-bold text-slate-900">{activePartner.vehicleNumber}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Fuel / Power Type</span>
                      <span className="font-medium text-slate-800">{activePartner.fuelType}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Driving License No.</span>
                      <span className="font-mono font-semibold text-slate-800">{activePartner.drivingLicense}</span>
                    </div>
                  </div>
                </div>

                {/* 4. Verification Document Status */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    4. Verification Document Audit
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Aadhaar Card</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle size={12} /> {activePartner.documentStatus.aadhaar}
                      </span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">PAN Card</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle size={12} /> {activePartner.documentStatus.pan}
                      </span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Driving License</span>
                      <span className="font-bold text-slate-800">{activePartner.documentStatus.drivingLicense}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">RC Book / Smart Card</span>
                      <span className="font-bold text-slate-800">{activePartner.documentStatus.rcBook}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <span className="text-slate-500">Vehicle Commercial Insurance</span>
                      <span className="font-bold text-emerald-700">{activePartner.documentStatus.insurance}</span>
                    </div>
                  </div>
                </div>

                {/* 5 & 6. Deliveries Performance (Completed, Ongoing, Cancelled) */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    5 & 6. Deliveries & Order Volume
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50">
                      <span className="text-[10px] text-emerald-700 font-bold block">COMPLETED</span>
                      <span className="text-lg font-black text-emerald-900">{activePartner.completedDeliveries}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/50">
                      <span className="text-[10px] text-amber-700 font-bold block">ONGOING NOW</span>
                      <span className="text-lg font-black text-amber-900">{activePartner.ongoingDeliveries}</span>
                    </div>
                    <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/50">
                      <span className="text-[10px] text-rose-700 font-bold block">CANCELLED</span>
                      <span className="text-lg font-black text-rose-900">{activePartner.cancelledDeliveries}</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Today's Completed Trips</span>
                    <span className="font-bold text-slate-900">{activePartner.todayDeliveries} Orders</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Past 7 Days Delivery Volume</span>
                    <span className="font-bold text-slate-900">{activePartner.weekDeliveries} Orders</span>
                  </div>
                </div>

                {/* 7. Earnings & Settlement Summary */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    7. Earnings & Settlement Overview
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Cumulative Captain Earnings</span>
                      <span className="font-black text-slate-900 text-sm">
                        {formatINR(activePartner.earningsSummary.totalEarnings)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Total Cleared Payouts</span>
                      <span className="font-bold text-emerald-700">
                        {formatINR(activePartner.earningsSummary.clearedPayouts)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Pending Settlement Balance</span>
                      <span className="font-bold text-amber-700">
                        {formatINR(activePartner.earningsSummary.pendingSettlement)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Last Payout Date</span>
                      <span className="font-medium text-slate-700">{activePartner.earningsSummary.lastPayoutDate}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Settlement Frequency</span>
                      <span className="font-semibold text-slate-800">{activePartner.earningsSummary.settlementCycle}</span>
                    </div>
                  </div>
                </div>

                {/* 8. COD Collection Summary */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    8. Cash on Delivery (COD) Collection
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Cash in Hand (Unremitted)</span>
                      <span className="font-black text-amber-700 text-sm">
                        {formatINR(activePartner.codSummary.cashInHand)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Total Deposited to Bank/Depot</span>
                      <span className="font-bold text-slate-900">
                        {formatINR(activePartner.codSummary.cashDeposited)}
                      </span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Last Cash Remittance Date</span>
                      <span className="font-medium text-slate-700">{activePartner.codSummary.lastDepositDate}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Remittance Compliance</span>
                      <span className="font-bold text-emerald-700">{activePartner.codSummary.depositStatus}</span>
                    </div>
                  </div>
                </div>

                {/* 9. Delivery History Table */}
                <div className="space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-900 m-0">
                    9. Recent Delivery History & Activity
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                          <th className="py-2.5 px-3">Order ID</th>
                          <th className="py-2.5 px-3">Date & Time</th>
                          <th className="py-2.5 px-3">Pickup / Drop-off</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Collection</th>
                          <th className="py-2.5 px-3 text-right">Earning</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {activePartner.deliveryHistory.map((trip) => (
                          <tr key={trip.orderId} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#F7941D]">
                              {trip.orderId}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                              {trip.orderDate}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex flex-col max-w-[180px]">
                                <span className="font-semibold text-slate-800 truncate" title={trip.pickupInfo}>
                                  P: {trip.pickupInfo}
                                </span>
                                <span className="text-[10px] text-slate-500 truncate" title={trip.dropoffInfo}>
                                  D: {trip.dropoffInfo}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                                  trip.status === 'Delivered'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {trip.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                              {trip.collectionType}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              ₹{trip.earnings}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-medium">
                  Partner ID: <span className="font-mono text-slate-700 font-bold">{activePartner.id}</span>
                </span>
                <button
                  onClick={() => setActivePartner(null)}
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

export default SuperAdminDeliveryPartners;
