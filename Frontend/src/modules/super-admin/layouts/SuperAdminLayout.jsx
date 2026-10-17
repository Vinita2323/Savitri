import React from 'react';
import { Outlet } from 'react-router-dom';
import { SuperAdminSidebar } from '../components/SuperAdminSidebar';

export const SuperAdminLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] font-sans text-slate-800 select-none">
      <SuperAdminSidebar />
      <div className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#f8fafc]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
