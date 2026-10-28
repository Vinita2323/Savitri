import React, { useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import {
  Users,
  Search,
  Plus,
  UserCheck,
  UserX,
  Building2,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  X,
  Edit2,
  Eye,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const DEPARTMENTS = [
  'Retail Operations',
  'Warehouse & Inventory',
  'Logistics & Dispatch',
  'Customer Support',
  'Management & Accounts',
  'Security & Maintenance',
];

export const EmployeeDirectoryPage = ({ onNavigate }) => {
  const {
    employees,
    brandsList,
    activeBrandId,
    shifts,
    handleCreateEmployee,
    handleUpdateEmployee,
    handleToggleStatus,
    isLoading,
  } = useEmployee();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProfileEmp, setSelectedProfileEmp] = useState(null);
  const [editingEmp, setEditingEmp] = useState(null);

  // New Employee Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Retail Operations');
  const [brandId, setBrandId] = useState(activeBrandId === 'ALL' ? 'brand_fg' : activeBrandId);
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [shiftName, setShiftName] = useState(shifts[0]?.name || 'Standard Shift');
  const [emgName, setEmgName] = useState('');
  const [emgPhone, setEmgPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Filtered employees
  const filteredEmployees = (employees || []).filter((emp) => {
    if (activeBrandId && activeBrandId !== 'ALL' && emp.brandId !== activeBrandId) return false;
    if (departmentFilter !== 'ALL' && emp.department !== departmentFilter) return false;
    if (statusFilter !== 'ALL' && emp.employmentStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        emp.fullName?.toLowerCase().includes(q) ||
        emp.employeeId?.toLowerCase().includes(q) ||
        emp.email?.toLowerCase().includes(q) ||
        emp.phone?.includes(q) ||
        emp.designation?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setDesignation('');
    setDepartment('Retail Operations');
    setEmploymentType('Full-time');
    setEmgName('');
    setEmgPhone('');
    setNotes('');
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const brandObj = brandsList.find((b) => b.id === brandId);
    const shiftObj = shifts.find((s) => s.name === shiftName);

    const payload = {
      fullName,
      email,
      phone,
      designation: designation || 'Associate',
      department,
      brandId,
      brandName: brandObj?.name || 'Fashion Gallary',
      employmentType,
      shift: shiftObj || {
        name: shiftName,
        startTime: '09:30',
        endTime: '18:30',
      },
      emergencyContact: { name: emgName, phone: emgPhone },
      notes,
    };

    const res = await handleCreateEmployee(payload);
    if (res.success) {
      setIsAddModalOpen(false);
      resetForm();
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingEmp) return;

    await handleUpdateEmployee(editingEmp._id, editingEmp);
    setEditingEmp(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <EmployeeHeader activeTabName="directory" onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Top Control Bar */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3.5">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, employee ID, phone, email..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive</option>
              <option value="On Leave">On Leave</option>
            </select>
          </div>

          {/* Add Employee CTA */}
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5" />
            <span>Add New Employee</span>
          </button>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs font-bold">
                  <th className="py-4 px-4.5">Employee Details</th>
                  <th className="py-4 px-4.5">Role & Dept</th>
                  <th className="py-4 px-4.5">Brand / Store</th>
                  <th className="py-4 px-4.5">Shift</th>
                  <th className="py-4 px-4.5">Joining Date</th>
                  <th className="py-4 px-4.5">Status</th>
                  <th className="py-4 px-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & ID */}
                      <td className="py-4 px-4.5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                            {emp.avatar ? (
                              <img
                                src={emp.avatar}
                                alt={emp.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-slate-700">
                                {emp.fullName?.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="text-base font-bold text-slate-900 leading-snug">{emp.fullName}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                                {emp.employeeId}
                              </span>
                              <span className="text-xs text-slate-500 font-medium">{emp.phone}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Designation & Department */}
                      <td className="py-4 px-4.5">
                        <div className="text-sm font-bold text-slate-800">{emp.designation}</div>
                        <div className="text-xs font-medium text-slate-500 mt-0.5">{emp.department}</div>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-600 uppercase tracking-wide">
                          {emp.employmentType}
                        </span>
                      </td>

                      {/* Brand & Store */}
                      <td className="py-4 px-4.5">
                        <div className="text-sm font-bold text-slate-800">
                          {emp.brandName || emp.brandId}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 font-medium">{emp.storeName}</div>
                      </td>

                      {/* Shift */}
                      <td className="py-4 px-4.5">
                        <div className="text-sm text-slate-800 font-semibold">
                          {emp.shift?.name?.split('(')[0] || 'Standard'}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {emp.shift?.startTime} - {emp.shift?.endTime}
                        </div>
                      </td>

                      {/* Joining Date */}
                      <td className="py-4 px-4.5 text-sm text-slate-700 font-medium">
                        {new Date(emp.joiningDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4.5">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            emp.employmentStatus === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : emp.employmentStatus === 'On Leave'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {emp.employmentStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedProfileEmp(emp)}
                            className="p-2 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingEmp(emp)}
                            className="p-2 text-slate-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Employee"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(emp._id)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              emp.employmentStatus === 'Active'
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={
                              emp.employmentStatus === 'Active' ? 'Deactivate' : 'Activate'
                            }
                          >
                            {emp.employmentStatus === 'Active' ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-14 text-center text-slate-400 text-sm font-medium">
                      No employees match the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── CREATE EMPLOYEE MODAL ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="bg-slate-50 px-6 py-4.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Add New Employee</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Assign staff to brand, store, shift and department
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@brand.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Phone (10 digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="98260XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-sm font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Designation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Retail Associate"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Department *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Brand Assignment *
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {brandsList
                      .filter((b) => b.id !== 'ALL')
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Shift</label>
                  <select
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    className="w-full text-sm font-semibold px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {shifts.map((s) => (
                      <option key={s._id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">Emergency Contact</span>
                <div className="grid grid-cols-2 gap-3.5">
                  <input
                    type="text"
                    placeholder="Contact Person Name"
                    value={emgName}
                    onChange={(e) => setEmgName(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none font-medium"
                  />
                  <input
                    type="tel"
                    placeholder="Emergency Phone"
                    value={emgPhone}
                    onChange={(e) => setEmgPhone(e.target.value)}
                    className="w-full text-sm font-mono px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4.5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-xs cursor-pointer"
                >
                  Save Employee Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW PROFILE MODAL ── */}
      {selectedProfileEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white relative">
              <button
                type="button"
                onClick={() => setSelectedProfileEmp(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                  {selectedProfileEmp.avatar ? (
                    <img
                      src={selectedProfileEmp.avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {selectedProfileEmp.fullName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">{selectedProfileEmp.fullName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                      {selectedProfileEmp.employeeId}
                    </span>
                    <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">
                      {selectedProfileEmp.employmentStatus}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1 font-medium">
                    {selectedProfileEmp.designation} • {selectedProfileEmp.department}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-slate-400 font-bold block text-xs uppercase tracking-wide">
                    Email
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedProfileEmp.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-xs uppercase tracking-wide">
                    Phone
                  </span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                    +91 {selectedProfileEmp.phone}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-xs uppercase tracking-wide">
                    Brand
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedProfileEmp.brandName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block text-xs uppercase tracking-wide">
                    Shift
                  </span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">
                    {selectedProfileEmp.shift?.name?.split('(')[0]}
                  </span>
                </div>
              </div>

              {selectedProfileEmp.emergencyContact?.name && (
                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/70 space-y-1">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                    Emergency Contact
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {selectedProfileEmp.emergencyContact.name} (
                    {selectedProfileEmp.emergencyContact.relationship || 'Contact'})
                  </div>
                  <div className="font-mono text-slate-600 text-xs">
                    Phone: {selectedProfileEmp.emergencyContact.phone}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedProfileEmp(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                Edit Employee: {editingEmp.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={editingEmp.fullName}
                  onChange={(e) => setEditingEmp({ ...editingEmp, fullName: e.target.value })}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Designation</label>
                  <input
                    type="text"
                    value={editingEmp.designation}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, designation: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Department</label>
                  <select
                    value={editingEmp.department}
                    onChange={(e) =>
                      setEditingEmp({ ...editingEmp, department: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 border rounded-xl bg-white text-sm font-semibold"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">Status</label>
                <select
                  value={editingEmp.employmentStatus}
                  onChange={(e) =>
                    setEditingEmp({ ...editingEmp, employmentStatus: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 border rounded-xl bg-white text-sm font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4.5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-xs cursor-pointer"
                >
                  Update Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectoryPage;
