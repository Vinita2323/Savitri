import React, { useState, useEffect } from 'react';
import { usePos } from '../context/PosContext';
import { posService } from '../../../../services/posService';
import {
  X,
  Search,
  UserPlus,
  UserCheck,
  MapPin,
  Phone,
  Mail,
  User,
  Check,
} from 'lucide-react';

export const PosCustomerModal = () => {
  const {
    isCustomerModalOpen,
    setIsCustomerModalOpen,
    customer,
    setCustomer,
    saleType,
    showAlert,
  } = usePos();

  const [activeTab, setActiveTab] = useState('SEARCH'); // 'SEARCH' | 'CREATE'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // New Customer Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('Indore');
  const [state, setState] = useState('Madhya Pradesh');
  const [pincode, setPincode] = useState('452001');

  // Load initial/recent customers
  useEffect(() => {
    if (isCustomerModalOpen) {
      searchCustomers('');
    }
  }, [isCustomerModalOpen]);

  const searchCustomers = async (q) => {
    setIsLoadingSearch(true);
    try {
      const list = await posService.searchCustomers(q);
      setSearchResults(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleSelectWalkIn = () => {
    setCustomer({
      isWalkIn: true,
      id: null,
      name: 'Walk-in Customer',
      phone: '',
      email: '',
      shippingAddress: {
        fullName: 'Walk-in Customer',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: 'Indore',
        state: 'Madhya Pradesh',
        pincode: '452001',
      },
    });
    setIsCustomerModalOpen(false);
    showAlert('Selected Walk-in Customer.', 'info');
  };

  const handleSelectCustomer = (c) => {
    const defaultAddr = c.addresses?.[0] || {};
    setCustomer({
      isWalkIn: false,
      id: c.id || c._id,
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      shippingAddress: {
        fullName: defaultAddr.fullName || c.name,
        phone: defaultAddr.phone || c.phone,
        addressLine1: defaultAddr.addressLine1 || '',
        addressLine2: defaultAddr.addressLine2 || '',
        city: defaultAddr.city || 'Indore',
        state: defaultAddr.state || 'Madhya Pradesh',
        pincode: defaultAddr.pincode || '452001',
      },
    });
    setIsCustomerModalOpen(false);
    showAlert(`Selected customer: ${c.name}`, 'success');
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 10) {
      alert('Please enter a valid 10-digit phone number.');
      return;
    }

    try {
      const created = await posService.createCustomer({
        name: (name || 'Customer').trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: {
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
      });

      handleSelectCustomer(created);
    } catch (err) {
      alert('Failed to register customer: ' + err.message);
    }
  };

  if (!isCustomerModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900">Select or Add Customer</h3>
            <p className="text-xs text-gray-500">
              {saleType === 'DELIVERY_ORDER'
                ? 'Delivery Orders require customer phone & delivery address'
                : 'Walk-in or registered loyalty customer'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCustomerModalOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="p-3 bg-gray-100/70 border-b border-gray-200 flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('SEARCH')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'SEARCH'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lookup Customer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CREATE')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'CREATE'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            + Add New Customer
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'SEARCH' ? (
            <div className="space-y-4">
              {/* Quick Walk-in Button */}
              {saleType !== 'DELIVERY_ORDER' && (
                <div
                  onClick={handleSelectWalkIn}
                  className={`p-3 rounded-xl border border-dashed cursor-pointer transition-all flex items-center justify-between ${
                    customer.isWalkIn
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-700">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Standard Walk-in Customer</div>
                      <div className="text-[11px] text-gray-500">
                        Default counter sale without customer details
                      </div>
                    </div>
                  </div>
                  {customer.isWalkIn && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
              )}

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by customer phone or name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchCustomers(e.target.value);
                  }}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Customers list */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Available Customers ({searchResults.length})
                </div>

                {isLoadingSearch ? (
                  <div className="py-8 text-center text-xs text-gray-400">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((c) => {
                    const isSelected = customer.id === (c.id || c._id);
                    return (
                      <div
                        key={c.id || c._id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 shadow-2xs'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900">{c.name}</span>
                            <span className="text-[11px] font-mono text-gray-600">
                              +91 {c.phone}
                            </span>
                          </div>

                          {c.addresses?.[0] && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 truncate max-w-sm">
                              <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                              <span className="truncate">
                                {c.addresses[0].addressLine1}, {c.addresses[0].city}
                              </span>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-6 text-center text-xs text-gray-400">
                    No registered customers match your search. Click '+ Add New Customer' above.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* CREATE CUSTOMER FORM */
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunil Verma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Phone Number (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="98260XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="customer@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Delivery Address fields */}
              <div className="pt-2 border-t border-gray-200 space-y-2">
                <span className="text-xs font-bold text-gray-800 block">
                  Delivery Address {saleType === 'DELIVERY_ORDER' && '*'}
                </span>

                <div>
                  <input
                    type="text"
                    required={saleType === 'DELIVERY_ORDER'}
                    placeholder="House/Flat No., Building, Street Address"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Landmark, Area / Colony (Optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                >
                  Save & Apply Customer to Bill
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PosCustomerModal;
