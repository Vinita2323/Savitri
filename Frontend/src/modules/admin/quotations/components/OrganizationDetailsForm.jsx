import React from 'react';
import { Building2, User, Mail, Phone, MapPin, Copy, Check } from 'lucide-react';
import { ORGANIZATION_TYPES } from '../data/mockQuotations';

export const OrganizationDetailsForm = ({ buyer, onChangeBuyer }) => {
  const [copied, setCopied] = React.useState(false);

  const handleChange = (field, value) => {
    onChangeBuyer({
      ...buyer,
      [field]: value,
    });
  };

  const handleCopyBillingToShipping = () => {
    onChangeBuyer({
      ...buyer,
      shippingAddress: buyer.billingAddress || '',
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Row 1: Org Name, Type, Department */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Client / Buyer Organization Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={buyer.organizationName}
              onChange={(e) => handleChange('organizationName', e.target.value)}
              placeholder="e.g. Directorate of Health Services / ABC Corp"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Client Organization Type <span className="text-rose-500">*</span>
          </label>
          <select
            value={buyer.organizationType}
            onChange={(e) => handleChange('organizationType', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-800 outline-none focus:border-[#F7941D] focus:bg-white cursor-pointer"
          >
            {ORGANIZATION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Department / Division Name
          </label>
          <input
            type="text"
            value={buyer.department}
            onChange={(e) => handleChange('department', e.target.value)}
            placeholder="e.g. Central Procurement & Canteen Wing"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
          />
        </div>
      </div>

      {/* Row 2: Contact Person, Designation, Email, Mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Client Contact Person <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              value={buyer.contactPerson}
              onChange={(e) => handleChange('contactPerson', e.target.value)}
              placeholder="e.g. Dr. R. K. Saxena"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Designation
          </label>
          <input
            type="text"
            value={buyer.designation}
            onChange={(e) => handleChange('designation', e.target.value)}
            placeholder="e.g. Joint Director Logistics"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={buyer.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="e.g. procurement@domain.gov.in"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Mobile Number <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="tel"
              required
              value={buyer.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. +91 94250 18920"
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Row 3: GSTIN & PAN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            GSTIN (If Applicable)
          </label>
          <input
            type="text"
            value={buyer.gstin}
            onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
            placeholder="e.g. 23AAAGM1289F1ZS"
            maxLength={15}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            PAN Number (If Applicable)
          </label>
          <input
            type="text"
            value={buyer.pan}
            onChange={(e) => handleChange('pan', e.target.value.toUpperCase())}
            placeholder="e.g. AAAGM1289F"
            maxLength={10}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white"
          />
        </div>
      </div>

      {/* Row 4: Billing Address vs Shipping Address */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Billing Address <span className="text-rose-500">*</span>
            </label>
          </div>
          <div className="relative">
            <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <textarea
              rows={3}
              required
              value={buyer.billingAddress}
              onChange={(e) => handleChange('billingAddress', e.target.value)}
              placeholder="Full registered commercial address for GST invoicing..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white resize-none"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Shipping / Delivery Address <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleCopyBillingToShipping}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F7941D] hover:underline cursor-pointer bg-transparent border-none"
            >
              {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              <span>{copied ? 'Copied Billing Address!' : 'Same as Billing'}</span>
            </button>
          </div>
          <div className="relative">
            <MapPin size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <textarea
              rows={3}
              required
              value={buyer.shippingAddress}
              onChange={(e) => handleChange('shippingAddress', e.target.value)}
              placeholder="Warehouse / store receiving bay address..."
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F7941D] focus:bg-white resize-none"
            />
          </div>
        </div>
      </div>

      {/* Row 5: City, State, PIN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            City <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={buyer.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="e.g. Indore"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            State <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={buyer.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="e.g. Madhya Pradesh"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            PIN Code <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={buyer.pincode}
            onChange={(e) => handleChange('pincode', e.target.value)}
            placeholder="e.g. 452001"
            maxLength={6}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 font-mono text-xs font-bold text-slate-900 outline-none focus:border-[#F7941D] focus:bg-white"
          />
        </div>
      </div>
    </div>
  );
};
