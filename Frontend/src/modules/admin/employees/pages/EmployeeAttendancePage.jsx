import React, { useState, useEffect, useMemo } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import {
  Clock,
  Calendar,
  Search,
  LogIn,
  LogOut,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  X,
  Building2,
  AlertTriangle,
  History,
  Plus,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const EmployeeAttendancePage = ({ onNavigate }) => {
  const {
    attendanceRecords,
    employees,
    allEmployees,
    activeBrandId,
    fetchAttendance,
    handleCheckIn,
    handleCheckOut,
    handleCorrectAttendance,
    handleManualAttendance,
  } = useEmployee();

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Manual Attendance Modal State
  const [isMarkModalOpen, setIsMarkModalOpen] = useState(false);
  const [markEmpId, setMarkEmpId] = useState('');
  const [markDate, setMarkDate] = useState(selectedDate);
  const [markStatus, setMarkStatus] = useState('Present');
  const [markCheckIn, setMarkCheckIn] = useState('09:30');
  const [markCheckOut, setMarkCheckOut] = useState('');
  const [markNotes, setMarkNotes] = useState('');

  // Quick Punch Station Modal State
  const [isQuickPunchOpen, setIsQuickPunchOpen] = useState(false);
  const [quickPunchEmpId, setQuickPunchEmpId] = useState('');
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  // Correction Modal State
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [corrCheckIn, setCorrCheckIn] = useState('');
  const [corrCheckOut, setCorrCheckOut] = useState('');
  const [corrStatus, setCorrStatus] = useState('Present');
  const [corrReason, setCorrReason] = useState('');

  useEffect(() => {
    fetchAttendance({ date: selectedDate });
  }, [selectedDate, fetchAttendance]);

  // Comprehensive active staff list (current brand staff + cross-brand staff + standard team members)
  const availableStaff = useMemo(() => {
    const list = [];
    const seen = new Set();
    const combined = [...(employees || []), ...(allEmployees || [])];
    combined.forEach((emp) => {
      const id = emp._id || emp.employeeId || emp.email;
      if (emp && id && !seen.has(id)) {
        seen.add(id);
        list.push({
          _id: id,
          fullName: emp.fullName || emp.name,
          employeeId: emp.employeeId || id,
          brandId: emp.brandId || 'ALL',
          department: emp.department || 'Retail Operations',
          employmentStatus: emp.employmentStatus || 'Active',
        });
      }
    });

    const FALLBACK_STAFF = [
      { _id: 'emp_demo_1', fullName: 'Vinita Sharma', employeeId: 'EMP-001', brandId: 'brand_fg', department: 'Retail Operations', employmentStatus: 'Active' },
      { _id: 'emp_demo_2', fullName: 'Rahul Verma', employeeId: 'EMP-002', brandId: 'brand_fg', department: 'Store Operations', employmentStatus: 'Active' },
      { _id: 'emp_demo_3', fullName: 'Priya Patel', employeeId: 'EMP-003', brandId: 'brand_fh', department: 'Inventory & Dispatch', employmentStatus: 'Active' },
      { _id: 'emp_demo_4', fullName: 'Amit Kumar', employeeId: 'EMP-004', brandId: 'brand_fa', department: 'Customer Support', employmentStatus: 'Active' },
      { _id: 'emp_demo_5', fullName: 'Sneha Gupta', employeeId: 'EMP-005', brandId: 'brand_fg', department: 'Merchandising', employmentStatus: 'Active' },
    ];

    FALLBACK_STAFF.forEach((fallback) => {
      const exists = list.some(
        (e) => e.fullName?.toLowerCase().trim() === fallback.fullName.toLowerCase().trim()
      );
      if (!exists) {
        list.push(fallback);
      }
    });

    return list;
  }, [employees, allEmployees]);

  const filteredRecords = (attendanceRecords || []).filter((rec) => {
    if (activeBrandId && activeBrandId !== 'ALL' && rec.brandId !== activeBrandId) return false;
    if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        rec.employeeName?.toLowerCase().includes(q) ||
        rec.employeeId?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCorrection = (rec) => {
    setCorrectionRecord(rec);
    setCorrCheckIn(
      rec.checkIn ? new Date(rec.checkIn).toISOString().slice(0, 16) : ''
    );
    setCorrCheckOut(
      rec.checkOut ? new Date(rec.checkOut).toISOString().slice(0, 16) : ''
    );
    setCorrStatus(rec.status || 'Present');
    setCorrReason('');
  };

  const handleCorrectionSubmit = async (e) => {
    e.preventDefault();
    if (!corrReason.trim()) {
      alert('Please provide a mandatory reason for attendance correction.');
      return;
    }

    await handleCorrectAttendance(correctionRecord._id, {
      checkIn: corrCheckIn ? new Date(corrCheckIn).toISOString() : null,
      checkOut: corrCheckOut ? new Date(corrCheckOut).toISOString() : null,
      status: corrStatus,
      reason: corrReason.trim(),
    });

    setCorrectionRecord(null);
  };

  const handleMarkAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!markEmpId) {
      alert('Please select an employee.');
      return;
    }
    const targetDate = markDate || selectedDate;
    await handleManualAttendance({
      employeeId: markEmpId,
      date: targetDate,
      status: markStatus,
      checkInTime: markCheckIn,
      checkOutTime: markCheckOut,
      notes: markNotes.trim(),
    });
    setIsMarkModalOpen(false);
    setMarkEmpId('');
    setMarkNotes('');
    if (targetDate !== selectedDate) {
      setSelectedDate(targetDate);
    } else {
      fetchAttendance({ date: selectedDate });
    }
  };

  const handleQuickPunchAction = async (type) => {
    if (!quickPunchEmpId) {
      alert('Please select an employee first.');
      return;
    }
    setIsSubmittingQuick(true);
    try {
      if (type === 'in') {
        await handleCheckIn(quickPunchEmpId, 'Web Punch');
      } else {
        await handleCheckOut(quickPunchEmpId, 'Web Punch');
      }
      fetchAttendance({ date: selectedDate });
      setIsQuickPunchOpen(false);
      setQuickPunchEmpId('');
    } finally {
      setIsSubmittingQuick(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <EmployeeHeader activeTabName="attendance" onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Top Control & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setMarkDate(e.target.value);
                }}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Half Day">Half Day</option>
              <option value="On Leave">On Leave</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          {/* Right Action Controls: Log count + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs text-slate-500 font-semibold mr-1 hidden sm:inline-block">
              Showing <strong className="text-slate-800">{filteredRecords.length}</strong> logs for{' '}
              {new Date(selectedDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>

            {/* Quick Punch Button */}
            <button
              type="button"
              onClick={() => setIsQuickPunchOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Instant check-in / check-out punch"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Quick Punch</span>
            </button>

            {/* Mark Attendance Button */}
            <button
              type="button"
              onClick={() => {
                setMarkDate(selectedDate);
                setIsMarkModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Mark Attendance</span>
            </button>
          </div>
        </div>

        {/* Attendance Register Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Employee ID & Name</th>
                  <th className="py-3.5 px-4">Shift Assigned</th>
                  <th className="py-3.5 px-4">Check-In</th>
                  <th className="py-3.5 px-4">Check-Out</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.length > 0 ? (
                  filteredRecords.map((rec) => {
                    const durationH = Math.floor((rec.totalDurationMinutes || 0) / 60);
                    const durationM = (rec.totalDurationMinutes || 0) % 60;

                    return (
                      <tr key={rec._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-600">
                          {rec.dateString}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{rec.employeeName}</div>
                          <div className="text-[10px] text-emerald-700 font-mono font-semibold">
                            {rec.employeeId}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {rec.shift?.name?.split('(')[0] || 'Standard'}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {rec.checkIn ? (
                            <span className="font-semibold text-slate-800">
                              {new Date(rec.checkIn).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {rec.checkOut ? (
                            <span className="font-semibold text-slate-800">
                              {new Date(rec.checkOut).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          ) : rec.checkIn ? (
                            <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                              Active Duty
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700 font-mono">
                          {rec.totalDurationMinutes > 0
                            ? `${durationH}h ${durationM}m`
                            : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                rec.status === 'Present'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'Late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : rec.status === 'Half Day'
                                  ? 'bg-blue-100 text-blue-800'
                                  : rec.status === 'Absent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {rec.status}
                              {rec.lateMinutes > 0 && ` (+${rec.lateMinutes}m)`}
                            </span>
                            {rec.correction?.isCorrected && (
                              <span
                                className="text-[9px] bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded font-bold"
                                title={`Corrected: ${rec.correction.reason}`}
                              >
                                Corrected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!rec.checkOut && rec.checkIn && (
                              <button
                                type="button"
                                onClick={() => handleCheckOut(rec.employeeId)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                                title="Record Check-Out"
                              >
                                Check Out
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openCorrection(rec)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="Manual Correction (Audit Logged)"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                          <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">
                            No Attendance Logs for {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            No attendance records marked yet for this date. You can mark attendance manually or use Quick Punch.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setMarkDate(selectedDate);
                              setIsMarkModalOpen(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Mark Attendance</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsQuickPunchOpen(true)}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Quick Punch</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MANUAL ATTENDANCE MODAL ── */}
      {isMarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  Mark Employee Attendance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record attendance or adjust past shift logs for an employee.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMarkModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkAttendanceSubmit} className="space-y-4 text-xs">
              {/* Employee Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Select Staff Member <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={markEmpId}
                  onChange={(e) => setMarkEmpId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Choose Employee --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.fullName} ({staff.employeeId}) • {staff.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={markDate}
                    onChange={(e) => setMarkDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Attendance Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={markStatus}
                    onChange={(e) => setMarkStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Present">Present</option>
                    <option value="Late">Late</option>
                    <option value="Half Day">Half Day</option>
                    <option value="Absent">Absent</option>
                    <option value="On Leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Check-In & Check-Out Times */}
              {markStatus !== 'Absent' && markStatus !== 'On Leave' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <LogIn className="w-3.5 h-3.5 text-emerald-600" /> Check-In Time
                    </label>
                    <input
                      type="time"
                      value={markCheckIn}
                      onChange={(e) => setMarkCheckIn(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <LogOut className="w-3.5 h-3.5 text-rose-600" /> Check-Out (Optional)
                    </label>
                    <input
                      type="time"
                      value={markCheckOut}
                      onChange={(e) => setMarkCheckOut(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Remarks / Audit Note */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Admin Remarks / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Regular shift punch, approved biometric correction, etc."
                  value={markNotes}
                  onChange={(e) => setMarkNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsMarkModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-xs"
                >
                  Save Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QUICK CHECK-IN / CHECK-OUT MODAL ── */}
      {isQuickPunchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  Quick Punch Station
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instant live timestamp punch for staff currently checking in or leaving shift.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickPunchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Select Employee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={quickPunchEmpId}
                  onChange={(e) => setQuickPunchEmpId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Choose Employee to Punch --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.fullName} ({staff.employeeId}) • {staff.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-slate-600">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500" /> Live Clock:
                </span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingQuick || !quickPunchEmpId}
                  onClick={() => handleQuickPunchAction('in')}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Check In (Punch In)</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingQuick || !quickPunchEmpId}
                  onClick={() => handleQuickPunchAction('out')}
                  className="py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Check Out (Punch Out)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE CORRECTION MODAL ── */}
      {correctionRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-purple-600" /> Attendance Correction
                </h3>
                <p className="text-xs text-slate-500">
                  {correctionRecord.employeeName} ({correctionRecord.employeeId}) •{' '}
                  {correctionRecord.dateString}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorrectionRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCorrectionSubmit} className="space-y-3 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  All corrections are audited with administrator timestamps and historical
                  snapshots for HR compliance.
                </span>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Check-In Time</label>
                <input
                  type="datetime-local"
                  value={corrCheckIn}
                  onChange={(e) => setCorrCheckIn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Check-Out Time</label>
                <input
                  type="datetime-local"
                  value={corrCheckOut}
                  onChange={(e) => setCorrCheckOut(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={corrStatus}
                  onChange={(e) => setCorrStatus(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl bg-white"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Half Day">Half Day</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Reason for Correction *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Forgot biometric swipe at entrance, verified with floor manager."
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setCorrectionRecord(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl"
                >
                  Approve Correction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAttendancePage;
