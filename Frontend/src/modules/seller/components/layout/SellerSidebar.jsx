import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../../../services/authService';
import { 
  Home, 
  ShoppingCart,
  FolderTree,
  Layers,
  Package, 
  Percent, 
  FileCheck2, 
  Boxes, 
  Wallet, 
  FileText,
  RotateCcw,
  LogOut, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  Gift,
  UploadCloud,
  X
} from 'lucide-react';

// Desktop (>= 1024px): the original fixed sidebar. Phones/tablets: the same navigation as a slide-in drawer.
const SellerSidebar = ({ isOpen: isOpenProp, isCompact = false, mobileOpen = false, onMobileClose }) => {
  // inside the drawer the full labels are always shown, whatever the desktop collapse state is
  const isOpen = isCompact ? true : isOpenProp;
  const location = useLocation();
  const navigate = useNavigate();

  // Submenu toggle states
  const [openMenus, setOpenMenus] = useState({
    product: true,
    reports: true,
  });

  // Automatically keep submenus open if active route is inside them
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/seller/product') || path.includes('/seller/stock-management') || path.includes('/seller/products')) {
      setOpenMenus(prev => ({ ...prev, product: true }));
    }
    if (path.includes('/seller/reports')) {
      setOpenMenus(prev => ({ ...prev, reports: true }));
    }
  }, [location.pathname]);

  const toggleSubmenu = (key) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside
      className={`${isCompact ? 'fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw]' : `${isOpen ? 'w-64' : 'w-20'} z-40 shrink-0`} bg-[#1A2E0A] text-white transition-all duration-300 flex flex-col h-full shadow-xl font-sans ${isCompact ? (mobileOpen ? 'translate-x-0' : '-translate-x-full invisible') : ''}`}
      style={isCompact ? { height: '100dvh' } : undefined}
      aria-hidden={isCompact && !mobileOpen ? true : undefined}
      role={isCompact ? 'dialog' : undefined}
      aria-modal={isCompact && mobileOpen ? true : undefined}
      aria-label="Seller navigation"
    >
      {/* Brand Header - White Background Logo Section */}
      <div className="h-20 bg-white flex items-center justify-center px-3 border-b border-slate-200 shrink-0 relative">
        {isCompact && (
          <button
            type="button"
            onClick={onMobileClose}
            aria-label="Close menu"
            className="absolute right-2 top-2 w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 bg-transparent border-none cursor-pointer"
          >
            <X size={22} />
          </button>
        )}
        <Link to="/seller/dashboard" className="flex items-center justify-center w-full">
          <img 
            src="/LogoSavitri.png" 
            alt="Logo" 
            className={`${isOpen ? 'h-16' : 'h-10'} max-w-full object-contain transition-all`} 
          />
        </Link>
      </div>

      {/* Navigation List */}
      <nav
        className="flex-1 overflow-y-auto overscroll-contain py-4 px-3 space-y-1.5 [&::-webkit-scrollbar]:hidden"
        onClick={(e) => { if (isCompact && e.target.closest && e.target.closest('a')) onMobileClose?.(); }}
      >
        
        {/* 1. Dashboard */}
        <Link
          to="/seller/dashboard"
          className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all cursor-pointer font-semibold text-[15px] ${
            isActive('/seller/dashboard')
              ? 'bg-[#2A4515] text-white shadow-sm font-bold border-l-4 border-[#F7941D]'
              : 'text-slate-200 hover:bg-[#2A4515]/60'
          }`}
          title={!isOpen ? 'Dashboard' : undefined}
        >
          <Home size={20} className="shrink-0 text-white" />
          {isOpen && <span>Dashboard</span>}
        </Link>

        {/* 2. Orders */}
        <Link
          to="/seller/orders"
          className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all cursor-pointer font-semibold text-[15px] ${
            isActive('/seller/orders')
              ? 'bg-[#2A4515] text-white shadow-sm font-bold border-l-4 border-[#F7941D]'
              : 'text-slate-200 hover:bg-[#2A4515]/60'
          }`}
          title={!isOpen ? 'Orders' : undefined}
        >
          <ShoppingCart size={20} className="shrink-0 text-white" />
          {isOpen && <span>Orders</span>}
        </Link>

        {/* 3. Product (Collapsible Menu) */}
        <div>
          <button
            onClick={() => toggleSubmenu('product')}
            className={`w-full flex items-center ${isOpen ? 'justify-between px-4' : 'justify-center px-2'} py-3 rounded-xl text-slate-200 hover:bg-[#2A4515]/60 transition-all font-semibold text-[15px] cursor-pointer bg-transparent border-none`}
            title={!isOpen ? 'Product' : undefined}
          >
            <div className="flex items-center gap-3">
              <Package size={20} className="shrink-0 text-white" />
              {isOpen && <span>Product</span>}
            </div>
            {isOpen && (
              openMenus.product ? <ChevronUp size={18} /> : <ChevronDown size={18} />
            )}
          </button>

          {/* Product Submenu Items */}
          {openMenus.product && isOpen && (
            <div className="pl-4 pr-1 py-1 space-y-1">
              {/* Add new Product */}
              <Link
                to="/seller/product/add"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                  isActive('/seller/product/add')
                    ? 'bg-[#2A4515] text-white font-bold border-l-2 border-[#F7941D]'
                    : 'text-slate-300 hover:bg-[#2A4515]/50 hover:text-white'
                }`}
              >
                <Package size={18} className="shrink-0 text-white/90" />
                <span>Add new Product</span>
              </Link>

              {/* Bulk Upload */}
              <Link
                to="/seller/products/bulk-upload"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                  isActive('/seller/products/bulk-upload')
                    ? 'bg-[#2A4515] text-white font-bold border-l-2 border-[#F7941D]'
                    : 'text-slate-300 hover:bg-[#2A4515]/50 hover:text-white'
                }`}
              >
                <UploadCloud size={18} className="shrink-0 text-white/90" />
                <span>Bulk Upload</span>
              </Link>

              {/* Product List */}
              <Link
                to="/seller/products"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                  (isActive('/seller/products') && !isActive('/seller/products/bulk-upload')) || isActive('/seller/product/list')
                    ? 'bg-[#2A4515] text-white font-bold border-l-2 border-[#F7941D]'
                    : 'text-slate-300 hover:bg-[#2A4515]/50 hover:text-white'
                }`}
              >
                <FileCheck2 size={18} className="shrink-0 text-white/90" />
                <span>Product List</span>
              </Link>

              {/* Stock Management */}
              <Link
                to="/seller/stock-management"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                  isActive('/seller/stock-management') || isActive('/seller/inventory')
                    ? 'bg-[#2A4515] text-white font-bold border-l-2 border-[#F7941D]'
                    : 'text-slate-300 hover:bg-[#2A4515]/50 hover:text-white'
                }`}
              >
                <Boxes size={18} className="shrink-0 text-white/90" />
                <span>Stock Management</span>
              </Link>
            </div>
          )}
        </div>

        {/* 6. Wallet */}
        <Link
          to="/seller/wallet"
          className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all cursor-pointer font-semibold text-[15px] ${
            isActive('/seller/wallet')
              ? 'bg-[#2A4515] text-white shadow-sm font-bold border-l-4 border-[#F7941D]'
              : 'text-slate-200 hover:bg-[#2A4515]/60'
          }`}
          title={!isOpen ? 'Wallet' : undefined}
        >
          <Wallet size={20} className="shrink-0 text-white" />
          {isOpen && <span>Wallet</span>}
        </Link>

        {/* 7. Reports (Collapsible Menu) */}
        <div>
          <button
            onClick={() => toggleSubmenu('reports')}
            className={`w-full flex items-center ${isOpen ? 'justify-between px-4' : 'justify-center px-2'} py-3 rounded-xl text-slate-200 hover:bg-[#2A4515]/60 transition-all font-semibold text-[15px] cursor-pointer bg-transparent border-none`}
            title={!isOpen ? 'Reports' : undefined}
          >
            <div className="flex items-center gap-3">
              <FileText size={20} className="shrink-0 text-white" />
              {isOpen && <span>Reports</span>}
            </div>
            {isOpen && (
              openMenus.reports ? <ChevronUp size={18} /> : <ChevronDown size={18} />
            )}
          </button>

          {/* Reports Submenu Items */}
          {openMenus.reports && isOpen && (
            <div className="pl-4 pr-1 py-1 space-y-1">
              <Link
                to="/seller/reports/sales"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium transition-all ${
                  isActive('/seller/reports') || isActive('/seller/reports/sales')
                    ? 'bg-[#2A4515] text-white font-bold border-l-2 border-[#F7941D]'
                    : 'text-slate-300 hover:bg-[#2A4515]/50 hover:text-white'
                }`}
              >
                <Boxes size={18} className="shrink-0 text-white/90" />
                <span>Sales Report</span>
              </Link>
            </div>
          )}
        </div>

        {/* 8. Return */}
        <Link
          to="/seller/return"
          className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all cursor-pointer font-semibold text-[15px] ${
            isActive('/seller/return') || isActive('/seller/returns')
              ? 'bg-[#2A4515] text-white shadow-sm font-bold border-l-4 border-[#F7941D]'
              : 'text-slate-200 hover:bg-[#2A4515]/60'
          }`}
          title={!isOpen ? 'Return' : undefined}
        >
          <RotateCcw size={20} className="shrink-0 text-white" />
          {isOpen && <span>Return</span>}
        </Link>

        {/* 9. Refer & Earn */}
        <Link
          to="/seller/refer-earn"
          className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all cursor-pointer font-semibold text-[15px] ${
            isActive('/seller/refer-earn') || isActive('/seller/referral')
              ? 'bg-[#2A4515] text-white shadow-sm font-bold border-l-4 border-[#F7941D]'
              : 'text-slate-200 hover:bg-[#2A4515]/60'
          }`}
          title={!isOpen ? 'Refer & Earn' : undefined}
        >
          <Gift size={20} className="shrink-0 text-[#F7941D]" />
          {isOpen && <span>Refer & Earn</span>}
        </Link>

        {/* 10. Help & Support */}
        <Link
          to="/seller/support"
          className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-3 rounded-xl transition-all cursor-pointer font-semibold text-[15px] ${
            isActive('/seller/support') || isActive('/seller/faqs') || isActive('/seller/help')
              ? 'bg-[#2A4515] text-white shadow-sm font-bold border-l-4 border-[#F7941D]'
              : 'text-slate-200 hover:bg-[#2A4515]/60'
          }`}
          title={!isOpen ? 'Help & Support' : undefined}
        >
          <HelpCircle size={20} className="shrink-0 text-white" />
          {isOpen && <span>Help & Support</span>}
        </Link>

      </nav>

      {/* Footer / Logout */}
      <div className="p-3 border-t border-[#2A4515]">
        <button
          onClick={() => {
            authService.logout('seller');
            navigate('/seller/login');
          }}
          className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-2'} py-2.5 rounded-xl text-slate-200 hover:bg-red-500/20 hover:text-white transition-all cursor-pointer bg-transparent border-none w-full text-left font-medium text-[15px]`}
          title={!isOpen ? 'Logout' : undefined}
        >
          <LogOut size={20} className="shrink-0 text-slate-300" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default SellerSidebar;
