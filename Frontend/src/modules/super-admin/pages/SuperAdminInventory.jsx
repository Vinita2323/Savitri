import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  Layers,
  Building2,
  MapPin,
  TrendingUp,
  RotateCcw,
  Plus,
  Minus,
  Eye,
  X,
  ShieldCheck,
  Calendar,
  Tag,
  DollarSign,
  Warehouse
} from 'lucide-react';
import { SuperAdminHeader } from '../components/SuperAdminHeader';
import {
  STATIC_SUPER_ADMIN_INVENTORY,
  INVENTORY_WAREHOUSES,
  INVENTORY_CATEGORIES,
  formatCurrency,
} from '../data/superAdminInventoryMock';
import { PAYOUT_BRANDS } from '../data/brandSellersMock';

export const SuperAdminInventory = () => {
  const [inventoryList, setInventoryList] = useState(STATIC_SUPER_ADMIN_INVENTORY);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('ALL');

  // Drawer / Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState('ADD'); // 'ADD' or 'DEDUCT'
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('Supplier Restock');
  const [toastMessage, setToastMessage] = useState('');

  // Toast notification helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedBrand('ALL');
    setSelectedCategory('ALL');
    setSelectedWarehouse('ALL');
    setStatusFilter('ALL');
    setSelectedPeriod('ALL');
  };

  // Filtered inventory calculations
  const filteredInventory = useMemo(() => {
    return inventoryList.filter((item) => {
      // Search filter
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.batchNumber.toLowerCase().includes(q) ||
        item.sellerName.toLowerCase().includes(q);

      // Brand filter
      const matchesBrand = selectedBrand === 'ALL' || item.brandSlug === selectedBrand;

      // Category filter
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

      // Warehouse filter
      const matchesWarehouse = selectedWarehouse === 'ALL' || item.warehouseId === selectedWarehouse;

      // Status filter
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      // Period filter (based on lastRestocked)
      if (selectedPeriod !== 'ALL') {
        if (!item.lastRestocked) return false;
        const today = new Date();
        const rDate = new Date(item.lastRestocked);
        const diffDays = (today - rDate) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) return false;
        if (selectedPeriod === 'weekly' && diffDays > 7) return false;
        if (selectedPeriod === 'monthly' && diffDays > 30) return false;
        if (selectedPeriod === 'quarterly' && diffDays > 91) return false;
        if (selectedPeriod === 'half_yearly' && diffDays > 182) return false;
        if (selectedPeriod === 'yearly' && diffDays > 365) return false;
      }

      return matchesSearch && matchesBrand && matchesCategory && matchesWarehouse && matchesStatus;
    });
  }, [inventoryList, search, selectedBrand, selectedCategory, selectedWarehouse, statusFilter, selectedPeriod]);

  // Overall Statistics across full or filtered inventory
  const stats = useMemo(() => {
    let totalValuation = 0;
    let totalUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    inventoryList.forEach((item) => {
      totalValuation += item.availableStock * item.unitCost;
      totalUnits += item.availableStock;
      if (item.status === 'Low Stock') lowStockCount++;
      if (item.status === 'Out of Stock') outOfStockCount++;
    });

    return {
      totalValuation,
      totalUnits,
      totalSkus: inventoryList.length,
      lowStockCount,
      outOfStockCount,
    };
  }, [inventoryList]);

  // Handle stock adjustment
  const handleStockAdjustment = (e) => {
    e.preventDefault();
    if (!selectedItem || !adjustQty || Number(adjustQty) <= 0) return;

    const numQty = parseInt(adjustQty, 10);

    setInventoryList((prev) =>
      prev.map((item) => {
        if (item.id === selectedItem.id) {
          let newStock =
            adjustType === 'ADD'
              ? item.availableStock + numQty
              : Math.max(0, item.availableStock - numQty);

          let newStatus = 'In Stock';
          if (newStock === 0) newStatus = 'Out of Stock';
          else if (newStock <= item.minThreshold) newStatus = 'Low Stock';

          const updated = {
            ...item,
            availableStock: newStock,
            status: newStatus,
            lastRestocked: adjustType === 'ADD' ? new Date().toISOString().slice(0, 10) : item.lastRestocked,
          };

          if (selectedItem?.id === item.id) {
            setSelectedItem(updated);
          }
          return updated;
        }
        return item;
      })
    );

    showToast(
      `Successfully ${adjustType === 'ADD' ? 'added' : 'deducted'} ${numQty} units for ${selectedItem.sku} (${adjustReason})`
    );
    setIsAdjustModalOpen(false);
    setAdjustQty('');
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredInventory.length === 0) {
      alert('No inventory rows available to export.');
      return;
    }

    const headers = [
      'SKU',
      'Product Name',
      'Brand',
      'Seller Store',
      'Category',
      'Warehouse',
      'Shelf/Bin',
      'Available Stock',
      'Reserved Stock',
      'Unit Cost (INR)',
      'Total Valuation (INR)',
      'Status',
      'Batch Number',
      'Last Restocked',
    ];

    const rows = filteredInventory.map((item) => [
      item.sku,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.brandName,
      `"${item.sellerName}"`,
      item.category,
      `"${item.warehouseName}"`,
      `"${item.shelfBin}"`,
      item.availableStock,
      item.reservedStock,
      item.unitCost,
      item.availableStock * item.unitCost,
      item.status,
      item.batchNumber,
      item.lastRestocked,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Savitri_Central_Inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-full bg-[#f8fafc] font-sans text-slate-800">
      {/* Super Admin Top Header */}
      <SuperAdminHeader
        title="Central Inventory Oversight"
        subtitle="Manage warehouse inventory, multi-brand stock reserves, real-time stockouts, and replenishment schedules."
        subtitleClassName="m-0 mt-0.5 max-w-3xl text-xs font-medium text-slate-500"
      />

      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Breadcrumb & Quick Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500">
            <Link to="/super-admin/dashboard" className="text-slate-500 no-underline hover:text-[#F7941D]">
              Super Admin
            </Link>
            <span>/</span>
            <span className="font-bold text-slate-800">Inventory Control & Stock Check</span>
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

        {/* Live Toast Message */}
        {toastMessage && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage('')}
              className="text-emerald-700 hover:text-emerald-900 border-none bg-transparent cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Catalog Valuation */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Valuation</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <DollarSign size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(stats.totalValuation)}</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">Physical stock value across all storage bays</p>
            </div>
          </div>

          {/* Card 2: Total Units In Stock */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Units in Stock</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Boxes size={20} />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stats.totalUnits.toLocaleString('en-IN')} Units</h3>
              <p className="mt-1 text-xs text-slate-500 font-medium">{stats.totalSkus} Total Master Catalog SKUs</p>
            </div>
          </div>

          {/* Card 3: Low Stock Alerts */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Low Stock' ? 'ALL' : 'Low Stock')}
            className={`cursor-pointer rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md ${
              statusFilter === 'Low Stock' ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Low Stock Warning</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <AlertTriangle size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-amber-900 tracking-tight">{stats.lowStockCount}</h3>
                <span className="text-xs font-bold text-amber-700">SKUs near threshold</span>
              </div>
              <p className="mt-1 text-xs text-amber-600 font-medium">Click to filter replenishment queue</p>
            </div>
          </div>

          {/* Card 4: Out of Stock */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Out of Stock' ? 'ALL' : 'Out of Stock')}
            className={`cursor-pointer rounded-2xl border p-5 shadow-xs transition-all hover:shadow-md ${
              statusFilter === 'Out of Stock' ? 'border-rose-400 bg-rose-50/50' : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Out of Stock</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle size={20} />
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-rose-900 tracking-tight">{stats.outOfStockCount}</h3>
                <span className="text-xs font-bold text-rose-700">Zero inventory items</span>
              </div>
              <p className="mt-1 text-xs text-rose-600 font-medium">Immediate supplier reorder required</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU, product, batch, or seller..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#F7941D] focus:bg-white"
              />
            </div>

            {/* Brand Filter */}
            <div>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Brands & Subsidiaries</option>
                {PAYOUT_BRANDS.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Product Categories</option>
                {INVENTORY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Filter */}
            <div>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
              >
                <option value="ALL">All Fulfillment Warehouses</option>
                {INVENTORY_WAREHOUSES.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all focus:border-[#F7941D] focus:bg-white cursor-pointer"
                aria-label="Filter by restock period"
                title="Filter by restock period"
              >
                <option value="ALL">All Time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half-Yearly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* Quick Status Pill Bar */}
          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-3 gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">Status:</span>
              {['ALL', 'In Stock', 'Low Stock', 'Out of Stock'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#1A2E0A] text-white border-[#1A2E0A] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st === 'ALL' ? 'All Items' : st}
                  {st === 'Low Stock' && <span className="ml-1.5 text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full">{stats.lowStockCount}</span>}
                  {st === 'Out of Stock' && <span className="ml-1.5 text-[10px] bg-rose-500 text-white px-1.5 py-0.2 rounded-full">{stats.outOfStockCount}</span>}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {(search || selectedBrand !== 'ALL' || selectedCategory !== 'ALL' || selectedWarehouse !== 'ALL' || statusFilter !== 'ALL' || selectedPeriod !== 'ALL') && (
                <button
                  onClick={handleResetFilters}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
              <div className="text-xs font-semibold text-slate-500">
                Showing <span className="font-bold text-slate-800">{filteredInventory.length}</span> of {inventoryList.length} SKUs
              </div>
            </div>
          </div>
        </div>

        {/* Central Inventory Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-4 px-4">Item & SKU</th>
                  <th className="py-4 px-4">Brand / Seller</th>
                  <th className="py-4 px-4">Warehouse & Bin</th>
                  <th className="py-4 px-4">Stock Levels</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Unit Cost & Value</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Boxes size={36} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm text-slate-600">No inventory matches your search criteria.</p>
                      <button
                        onClick={handleResetFilters}
                        className="mt-2 text-xs font-bold text-[#F7941D] hover:underline bg-transparent border-none cursor-pointer"
                      >
                        Reset all filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => {
                    const capacityPercent = Math.min(100, Math.round((item.availableStock / item.maxCapacity) * 100));
                    const totalVal = item.availableStock * item.unitCost;

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                        {/* Item & SKU */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm leading-snug">{item.productName}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[11px] font-bold text-[#F7941D] bg-orange-50 px-2 py-0.5 rounded border border-orange-200/50">
                                {item.sku}
                              </span>
                              <span className="text-[11px] text-slate-400">{item.category}</span>
                            </div>
                          </div>
                        </td>

                        {/* Brand / Seller */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{item.brandName}</span>
                            <span className="text-[11px] text-slate-500 mt-0.5">{item.sellerName}</span>
                          </div>
                        </td>

                        {/* Warehouse & Shelf */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                              <Warehouse size={13} className="text-slate-400 shrink-0" />
                              {item.warehouseName.replace('Indore Central Fulfillment Hub', 'Indore Hub')}
                            </span>
                            <span className="text-[11px] text-slate-500 mt-0.5 font-mono">{item.shelfBin}</span>
                          </div>
                        </td>

                        {/* Stock Levels & Meter */}
                        <td className="py-3.5 px-4">
                          <div className="w-44">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-900">{item.availableStock} Available</span>
                              <span className="text-[11px] text-slate-400">Cap: {item.maxCapacity}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  item.status === 'Out of Stock'
                                    ? 'bg-rose-500 w-full'
                                    : item.status === 'Low Stock'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: item.status === 'Out of Stock' ? '100%' : `${capacityPercent}%` }}
                              />
                            </div>
                            {item.reservedStock > 0 && (
                              <span className="text-[10px] text-slate-400 mt-0.5 block">
                                {item.reservedStock} units reserved in orders
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              item.status === 'In Stock'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'Low Stock'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                item.status === 'In Stock'
                                  ? 'bg-emerald-500'
                                  : item.status === 'Low Stock'
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                            />
                            {item.status}
                          </span>
                        </td>

                        {/* Unit Cost & Valuation */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-900 text-sm">{formatCurrency(totalVal)}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            ₹{item.unitCost} / unit (MRP ₹{item.salePrice})
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedItem(item);
                                setIsAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-[#1A2E0A] bg-slate-100 hover:bg-slate-200 border-none rounded-lg cursor-pointer transition-colors"
                              title="Audit or Adjust Stock"
                            >
                              Adjust
                            </button>
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-colors"
                              title="Inspect Details"
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock Detail Drawer (Side Sheet) */}
        {selectedItem && !isAdjustModalOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-2xs transition-all">
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-slideLeft">
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#F7941D]">
                    {selectedItem.sku}
                  </span>
                  <h3 className="text-base font-black text-slate-900 m-0 mt-0.5 leading-tight">
                    {selectedItem.productName}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg border-none bg-transparent cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 space-y-6 flex-1">
                {/* Stock Overview Widget */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock Availability</span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedItem.status === 'In Stock'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : selectedItem.status === 'Low Stock'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {selectedItem.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 font-medium block">Physical Available</span>
                      <span className="text-xl font-black text-slate-900">{selectedItem.availableStock} Units</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[11px] text-slate-400 font-medium block">Reserved Orders</span>
                      <span className="text-xl font-black text-slate-600">{selectedItem.reservedStock} Units</span>
                    </div>
                  </div>
                </div>

                {/* Storage & Logistics Info */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider m-0">
                    Warehouse & Allocation
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Warehouse Hub</span>
                      <span className="font-bold text-slate-800">{selectedItem.warehouseName}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Shelf / Bay Slot</span>
                      <span className="font-mono font-bold text-slate-800">{selectedItem.shelfBin}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Batch Code</span>
                      <span className="font-mono text-slate-700">{selectedItem.batchNumber}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Last Restocked</span>
                      <span className="font-medium text-slate-700">{selectedItem.lastRestocked}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Minimum Reorder Limit</span>
                      <span className="font-bold text-amber-700">{selectedItem.minThreshold} Units</span>
                    </div>
                  </div>
                </div>

                {/* Pricing & Valuation */}
                <div className="space-y-3 text-xs">
                  <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-wider m-0">
                    Financial Valuation
                  </h4>
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Unit Purchase Cost</span>
                      <span className="font-bold text-slate-800">₹{selectedItem.unitCost}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Retail Sale Price (MRP)</span>
                      <span className="font-bold text-slate-800">₹{selectedItem.salePrice}</span>
                    </div>
                    <div className="p-3 flex justify-between items-center">
                      <span className="text-slate-500">Total Stock Value</span>
                      <span className="font-black text-emerald-700 text-sm">
                        {formatCurrency(selectedItem.availableStock * selectedItem.unitCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3">
                <button
                  onClick={() => setIsAdjustModalOpen(true)}
                  className="flex-1 py-2.5 px-4 bg-[#79B433] hover:bg-[#689A2B] text-white font-bold rounded-xl text-xs border-none cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
                >
                  <RotateCcw size={14} /> Adjust Inventory Stock
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stock Adjustment Modal */}
        {selectedItem && isAdjustModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fadeIn">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-[#F7941D] tracking-wider">
                    Inventory Audit & Correction
                  </span>
                  <h3 className="text-base font-black text-slate-900 m-0">Adjust Stock for {selectedItem.sku}</h3>
                </div>
                <button
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg border-none bg-transparent cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleStockAdjustment} className="p-6 space-y-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Product Name</span>
                    <span className="font-bold text-slate-800">{selectedItem.productName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-medium block">Current Stock</span>
                    <span className="text-base font-black text-slate-900">{selectedItem.availableStock} Units</span>
                  </div>
                </div>

                {/* Adjustment Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Adjustment Direction
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAdjustType('ADD')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        adjustType === 'ADD'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Plus size={15} /> Add Stock (Restock)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('DEDUCT')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                        adjustType === 'DEDUCT'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Minus size={15} /> Deduct Stock (Damage/Loss)
                    </button>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quantity to {adjustType === 'ADD' ? 'Add' : 'Deduct'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={adjustType === 'DEDUCT' ? selectedItem.availableStock : 10000}
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="Enter unit quantity..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white transition-all"
                  />
                  {adjustQty && Number(adjustQty) > 0 && (
                    <p className="mt-1.5 text-xs font-medium text-slate-500">
                      New resulting stock:{' '}
                      <span className="font-bold text-slate-900">
                        {adjustType === 'ADD'
                          ? selectedItem.availableStock + parseInt(adjustQty, 10)
                          : Math.max(0, selectedItem.availableStock - parseInt(adjustQty, 10))}{' '}
                        Units
                      </span>
                    </p>
                  )}
                </div>

                {/* Audit Reason */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Audit Note / Reason
                  </label>
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-[#F7941D] focus:bg-white cursor-pointer"
                  >
                    <option value="Supplier Restock">Supplier Restock & Inward Shipment</option>
                    <option value="Physical Audit Correction">Physical Warehouse Audit Correction</option>
                    <option value="Damaged in Storage">Damaged / Expired in Storage</option>
                    <option value="Return Restock">Customer Return Restocked</option>
                    <option value="Manual Super Admin Override">Super Admin Manual Override</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-5 bg-[#1A2E0A] hover:bg-[#253f0e] text-white font-bold rounded-xl text-xs border-none cursor-pointer transition-all shadow-xs active:scale-95"
                  >
                    Confirm Stock Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default SuperAdminInventory;
