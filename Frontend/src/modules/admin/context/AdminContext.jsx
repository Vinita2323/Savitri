import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const AdminContext = createContext();


export const AdminProvider = ({ children }) => {
  const [isCompact, setIsCompact] = useState(() => window.innerWidth < 1024);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromLocation = (pathname) => {
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length <= 1) return 'dashboard';
    if (parts[1] === 'quotations' && parts[2]) {
      return `quotations/${parts[2]}`;
    }
    if ((parts[1] === 'delivery-challans' || parts[1] === 'delivery_challans') && parts[2]) {
      return `delivery_challans/${parts[2]}`;
    }
    if (parts[1] === 'delivery-challans') {
      return 'delivery_challans';
    }
    return parts[1];
  };

  const [activeTab, setActiveState] = useState(() => getTabFromLocation(location.pathname));
  const [tabData, setTabData] = useState(null);

  useEffect(() => {
    setActiveState(getTabFromLocation(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    let compact = window.innerWidth < 1024;
    const syncLayout = () => {
      const next = window.innerWidth < 1024;
      if (next === compact) return;
      compact = next;
      setIsCompact(next);
      setSidebarOpen(!next);
    };
    window.addEventListener('resize', syncLayout);
    return () => window.removeEventListener('resize', syncLayout);
  }, []);

  const setActiveTab = (tab, data = null) => {
    setActiveState(tab);
    if (data !== undefined) {
      setTabData(data);
    }
    if (window.innerWidth < 1024) setSidebarOpen(false);
    if (tab === 'dashboard') {
      navigate('/admin');
    } else {
      const routePath = tab.replace(/_/g, '-');
      navigate(`/admin/${routePath}`, { state: data });
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsCount, setNotificationsCount] = useState(3);
  const [editingProductData, setEditingProductData] = useState(null);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  return (
    <AdminContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        isCompact,
        toggleSidebar,
        activeTab,
        setActiveTab,
        tabData,
        setTabData,
        searchQuery,
        setSearchQuery,
        notificationsCount,
        setNotificationsCount,
        editingProductData,
        setEditingProductData,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};


