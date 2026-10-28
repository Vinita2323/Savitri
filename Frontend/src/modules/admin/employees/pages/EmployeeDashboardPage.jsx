import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  LogIn,
  LogOut,
  CalendarCheck,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Briefcase,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';

export const EmployeeDashboardPage = ({ onNavigate }) => {
  const navigate = useNavigate();
  const {
    employees,
    attendanceRecords,
    tasks,
    leaves,
    dashboardMetrics,
    handleCheckIn,
    handleCheckOut,
    handleReviewLeave,
    activeBrandId,
  } = useEmployee();

  const [selectedKioskEmpId, setSelectedKioskEmpId] = useState('');
  const [isKioskSubmitting, setIsKioskSubmitting] = useState(false);

  const activeEmployees = (employees || []).filter((e) => e?.employmentStatus === 'Active');
  const pendingLeavesList = (leaves || []).filter((l) => l?.status === 'Pending').slice(0, 4);
  const urgentTasks = (tasks || [])
    .filter((t) => t?.status !== 'Completed')
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 4);

  const handleKioskAction = async (actionType) => {
    if (!selectedKioskEmpId) {
      alert('Please select an employee first.');
      return;
    }
    setIsKioskSubmitting(true);
    try {
      if (actionType === 'in') {
        await handleCheckIn(selectedKioskEmpId, 'Web Kiosk');
      } else {
        await handleCheckOut(selectedKioskEmpId, 'Web Kiosk');
      }
    } finally {
      setIsKioskSubmitting(false);
    }
  };

  const nav = (tabPath) => {
    if (onNavigate) {
      onNavigate(tabPath);
    } else {
      navigate(`/super-admin/employees/${tabPath === 'dashboard' ? '' : tabPath}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <EmployeeHeader activeTabName="dashboard" onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Employees */}
          <div
            onClick={() => nav('directory')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Staff
              </span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {dashboardMetrics.totalEmployees || employees.length}
            </div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <span>{dashboardMetrics.activeEmployees || activeEmployees.length} Active</span>
            </div>
          </div>

          {/* Present Today */}
          <div
            onClick={() => nav('attendance')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Present Today
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-800">
              {dashboardMetrics.presentToday || 0}
            </div>
            <div className="text-[11px] font-medium text-slate-500 mt-1">
              {dashboardMetrics.lateToday > 0 ? `${dashboardMetrics.lateToday} Late Arrivals` : 'On time'}
            </div>
          </div>

          {/* Currently Checked In */}
          <div
            onClick={() => nav('attendance')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                On Duty Now
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-900">
              {dashboardMetrics.currentlyCheckedIn || 0}
            </div>
            <div className="text-[11px] font-medium text-indigo-600 mt-1">
              Active Shift Workers
            </div>
          </div>

          {/* Pending Leaves */}
          <div
            onClick={() => nav('leaves')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-amber-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Pending Leaves
              </span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900">
              {dashboardMetrics.pendingLeaves || 0}
            </div>
            <div className="text-[11px] font-medium text-amber-700 mt-1">Requires Review</div>
          </div>

          {/* Active Tasks */}
          <div
            onClick={() => nav('tasks')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs hover:border-purple-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tasks in Work
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-purple-900">
              {dashboardMetrics.inProgressTasks || 0}
            </div>
            <div className="text-[11px] font-medium text-rose-600 mt-1">
              {dashboardMetrics.overdueTasks > 0 ? `${dashboardMetrics.overdueTasks} Overdue` : 'All on track'}
            </div>
          </div>
        </div>

        {/* Quick Kiosk / Action Widget */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-extrabold tracking-tight">
                Live Attendance Check-In / Check-Out Station
              </h3>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Simulate or record instant employee check-in or check-out directly with server-side
              timestamping and automatic shift late-arrival calculations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={selectedKioskEmpId}
              onChange={(e) => setSelectedKioskEmpId(e.target.value)}
              className="bg-slate-800 text-white border border-slate-600 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-emerald-500 flex-1 md:w-56"
            >
              <option value="">Select Employee...</option>
              {activeEmployees.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.fullName} ({e.employeeId})
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={isKioskSubmitting || !selectedKioskEmpId}
              onClick={() => handleKioskAction('in')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>Check In</span>
            </button>

            <button
              type="button"
              disabled={isKioskSubmitting || !selectedKioskEmpId}
              onClick={() => handleKioskAction('out')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              <span>Check Out</span>
            </button>
          </div>
        </div>

        {/* Split Grid: Today's Attendance Activity & Tasks/Leaves */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Attendance Table (2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Today's Attendance Stream
                </h3>
                <p className="text-xs text-slate-500">Live employee logs for today</p>
              </div>
              <button
                type="button"
                onClick={() => nav('attendance')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <span>Full Register</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Shift</th>
                    <th className="py-3 px-4">Check-In</th>
                    <th className="py-3 px-4">Check-Out</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {attendanceRecords.length > 0 ? (
                    attendanceRecords.slice(0, 5).map((rec) => (
                      <tr key={rec._id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{rec.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {rec.employeeId}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {rec.shift?.name?.split('(')[0] || 'Standard'}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {rec.checkIn
                            ? new Date(rec.checkIn).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">
                          {rec.checkOut
                            ? new Date(rec.checkOut).toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : rec.checkIn
                            ? 'Active (On Duty)'
                            : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'Late'
                                ? 'bg-amber-100 text-amber-800'
                                : rec.status === 'Half Day'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {rec.status}
                            {rec.lateMinutes > 0 && ` (+${rec.lateMinutes}m)`}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        No check-in activity recorded yet today. Use the live check-in station above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column: Pending Approvals & Urgent Tasks */}
          <div className="space-y-6">
            {/* Pending Leave Approvals */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-amber-600" /> Pending Leaves
                </h4>
                <button
                  type="button"
                  onClick={() => nav('leaves')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  View All
                </button>
              </div>

              {pendingLeavesList.length > 0 ? (
                <div className="space-y-2.5">
                  {pendingLeavesList.map((l) => (
                    <div
                      key={l._id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-slate-900">{l.employeeName}</div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {l.leaveType} ({l.totalDays} day{l.totalDays > 1 ? 's' : ''})
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                        "{l.reason}"
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(l._id, 'Rejected', 'Declined by Admin')}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReviewLeave(l._id, 'Approved', 'Approved')}
                          className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">
                  No pending leave requests.
                </div>
              )}
            </div>

            {/* Upcoming Deadlines & Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-purple-600" /> Priority Tasks
                </h4>
                <button
                  type="button"
                  onClick={() => nav('tasks')}
                  className="text-xs font-bold text-emerald-700 hover:underline"
                >
                  Task Board
                </button>
              </div>

              {urgentTasks.length > 0 ? (
                <div className="space-y-2">
                  {urgentTasks.map((t) => (
                    <div
                      key={t._id}
                      onClick={() => nav('tasks')}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 line-clamp-1">{t.title}</span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                            t.priority === 'Urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : t.priority === 'High'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Due: {new Date(t.dueDate).toLocaleDateString('en-IN')}</span>
                        <span className="font-semibold text-slate-600">{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-400">No active tasks.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
