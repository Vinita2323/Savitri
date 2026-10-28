import React, { useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import {
  CalendarCheck,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Unpaid Leave',
  'Maternity/Paternity',
  'Compensatory Off',
];

export const EmployeeLeavesPage = ({ onNavigate }) => {
  const {
    leaves,
    employees,
    activeBrandId,
    handleSubmitLeave,
    handleReviewLeave,
  } = useEmployee();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewAction, setReviewAction] = useState('Approved'); // 'Approved' | 'Rejected'
  const [reviewNotes, setReviewNotes] = useState('');

  // Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');

  const activeEmployees = (employees || []).filter((e) => e?.employmentStatus === 'Active');

  const filteredLeaves = (leaves || []).filter((l) => {
    if (activeBrandId && activeBrandId !== 'ALL' && l.brandId !== activeBrandId) return false;
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        l.employeeName?.toLowerCase().includes(q) ||
        l.employeeId?.toLowerCase().includes(q) ||
        l.leaveId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubmitLeaveRequest = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !startDate || !endDate || !reason) {
      alert('Please fill all required fields.');
      return;
    }

    const emp = employees.find((e) => e._id === selectedEmpId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = isHalfDay
      ? 0.5
      : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const res = await handleSubmitLeave({
      employeeId: selectedEmpId,
      employeeName: emp?.fullName || 'Employee',
      brandId: emp?.brandId || activeBrandId,
      department: emp?.department || 'Operations',
      leaveType,
      startDate,
      endDate,
      isHalfDay,
      totalDays,
      reason,
    });

    if (res.success) {
      setIsSubmitModalOpen(false);
      setSelectedEmpId('');
      setStartDate('');
      setEndDate('');
      setReason('');
    }
  };

  const handleConfirmReview = async (e) => {
    e.preventDefault();
    if (!reviewingLeave) return;

    await handleReviewLeave(reviewingLeave._id, reviewAction, reviewNotes);
    setReviewingLeave(null);
    setReviewNotes('');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <EmployeeHeader activeTabName="leaves" onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Top Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by employee name, ID, or leave reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>
        </div>

        {/* Leaves Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Leave ID & Employee</th>
                  <th className="py-3.5 px-4">Leave Type</th>
                  <th className="py-3.5 px-4">Dates & Duration</th>
                  <th className="py-3.5 px-4">Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Review Details</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLeaves.length > 0 ? (
                  filteredLeaves.map((l) => (
                    <tr key={l._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{l.employeeName}</div>
                        <div className="text-[10px] font-mono text-emerald-700 font-semibold">
                          {l.leaveId} • {l.employeeId}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {l.leaveType}
                        {l.isHalfDay && (
                          <span className="block text-[10px] text-purple-600 font-bold">
                            Half Day
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-700">
                          {new Date(l.startDate).toLocaleDateString('en-IN')} to{' '}
                          {new Date(l.endDate).toLocaleDateString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {l.totalDays} day{l.totalDays > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="line-clamp-2 text-slate-600">{l.reason}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500">
                        {l.reviewedBy?.name ? (
                          <div>
                            <span className="font-semibold text-slate-700">
                              By {l.reviewedBy.name}
                            </span>
                            {l.reviewedBy.notes && (
                              <span className="block italic text-[10px] text-slate-400">
                                "{l.reviewedBy.notes}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending Decision</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {l.status === 'Pending' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingLeave(l);
                                setReviewAction('Approved');
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingLeave(l);
                                setReviewAction('Rejected');
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Finalized</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No leave records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── APPLY LEAVE MODAL ── */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Apply Leave Request</h3>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitLeaveRequest} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Employee *</label>
                <select
                  required
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                >
                  <option value="">Choose Employee...</option>
                  {activeEmployees.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.fullName} ({e.employeeId} - {e.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="halfDayChk"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="halfDayChk" className="font-semibold text-slate-700 cursor-pointer">
                  Half-Day Leave
                </label>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="State the reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── APPROVE / REJECT MODAL ── */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {reviewAction === 'Approved' ? 'Approve Leave' : 'Reject Leave'}
                </h3>
                <p className="text-xs text-slate-500">
                  {reviewingLeave.employeeName} • {reviewingLeave.leaveType} ({reviewingLeave.totalDays} day)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReview} className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 italic">
                "{reviewingLeave.reason}"
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reviewer Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Add approval comment or rejection reason..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-white font-bold rounded-xl ${
                    reviewAction === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirm {reviewAction}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeavesPage;
