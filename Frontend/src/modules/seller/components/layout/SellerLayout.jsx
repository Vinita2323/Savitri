import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SellerSidebar from './SellerSidebar';
import SellerHeader from './SellerHeader';
import SellerOrderNotifier from './SellerOrderNotifier';
import SellerReturnNotifier from './SellerReturnNotifier';
import useIsCompact from './useIsCompact';
import useResponsiveTables from './useResponsiveTables';
import './sellerResponsive.css';

const SellerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  // Phones and tablets (< 1024px) use a slide-in drawer instead of the fixed sidebar
  const isCompact = useIsCompact();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef(null);
  const drawerOpen = isCompact && mobileNavOpen;
  useResponsiveTables(mainRef); // phones: tables render as labelled cards

  // Reset main container scroll position on every page navigation
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Close the drawer after navigating, and whenever the screen grows back to desktop size
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);
  useEffect(() => { if (!isCompact) setMobileNavOpen(false); }, [isCompact]);

  // While the drawer is open: no background scrolling, and Escape closes it
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setMobileNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener('keydown', onKey); };
  }, [drawerOpen]);

  const toggleNav = () => (isCompact ? setMobileNavOpen((o) => !o) : setIsSidebarOpen((o) => !o));

  return (
    // 100dvh keeps the layout above the mobile browser toolbar; h-screen is the fallback for older browsers
    <div className="seller-shell flex h-screen bg-[#f8fafc] font-sans text-slate-800 overflow-hidden select-none" style={{ height: '100dvh' }}>
      {/* Global incoming order audio ringtone and popup modal across all seller pages */}
      <SellerOrderNotifier />
      <SellerReturnNotifier />

      <SellerSidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCompact={isCompact}
        mobileOpen={drawerOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Dimmed backdrop behind the drawer; tapping it closes the drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <SellerHeader isSidebarOpen={isCompact ? drawerOpen : isSidebarOpen} toggleSidebar={toggleNav} />

        <main ref={mainRef} className={`seller-main flex-1 min-w-0 ${drawerOpen ? 'overflow-hidden' : 'overflow-y-auto'} p-3 sm:p-4 lg:p-6`}>
          <Outlet key={location.pathname} />
        </main>
      </div>
    </div>
  );
};

export default SellerLayout;
