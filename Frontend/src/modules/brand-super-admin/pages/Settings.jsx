import React from 'react';
import { BrandSuperAdminHeader } from '../components/BrandSuperAdminHeader';
import { DemoBanner } from '../components/DemoBanner';

const Settings = () => (
  <div className="min-h-full">
    <BrandSuperAdminHeader
      title="Settings"
      subtitle="Prototype preferences — no backend persistence"
    />
    <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <DemoBanner />
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
        <h2 className="text-sm font-extrabold text-slate-900">About this module</h2>
        <ul className="list-disc space-y-1 pl-5 text-xs font-medium text-slate-600">
          <li>Frontend-only Brand Super Admin for multi-brand UI exploration.</li>
          <li>Does not replace the existing Admin Panel or financial Super Admin.</li>
          <li>All brand / admin / finance numbers are labelled demonstration data.</li>
          <li>No APIs, databases, or authentication systems are connected here.</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-xs font-semibold text-slate-500">
        Future settings (notifications, brand defaults, fiscal year) can be added here without touching production admin modules.
      </div>
    </div>
  </div>
);

export default Settings;
