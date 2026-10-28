import React, { useState, useMemo } from 'react';
import {
  Download,
  Filter,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Users,
  Search,
  FileSpreadsheet
} from 'lucide-react';
import { useEmployees } from '../context/EmployeeContext';
import EmployeeHeader from '../components/EmployeeHeader';

export default function EmployeeReportsPage({ onNavigate, currentTab = 'reports' }) {
  const {
    employees = [],
    attendance = [],
    attendanceRecords = [],
    tasks = [],
    leaves = [],
    shifts = [],
    currentBrand,
    activeBrandId
  } = useEmployees();

  const safeAttendance = (Array.isArray(attendance) && attendance.length > 0)
    ? attendance
    : (Array.isArray(attendanceRecords) ? attendanceRecords : []);
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const [activeReportTab, setActiveReportTab] = useState('attendance'); // 'attendance' | 'tasks' | 'exceptions'
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchEmployee, setSearchEmployee] = useState('');

  // Filtered dataset
  const filteredAttendance = useMemo(() => {
    return safeAttendance.filter(a => {
      if (!a) return false;
      const aDate = a.dateString || (a.checkIn ? new Date(a.checkIn).toISOString().split('T')[0] : '');
      const inRange = (!dateFrom || aDate >= dateFrom) && (!dateTo || aDate <= dateTo);
      const matchBrand = !activeBrandId || activeBrandId === 'ALL' || a.brandId === activeBrandId;
      const empName = (a.employee?.fullName || a.employeeName || '').toLowerCase();
      const empCode = (a.employee?.employeeId || a.employeeId || '').toLowerCase();
      const matchSearch = !searchEmployee || empName.includes(searchEmployee.toLowerCase()) || empCode.includes(searchEmployee.toLowerCase());
      return inRange && matchBrand && matchSearch;
    });
  }, [safeAttendance, dateFrom, dateTo, activeBrandId, searchEmployee]);

  const filteredTasks = useMemo(() => {
    return safeTasks.filter(t => {
      if (!t) return false;
      const matchBrand = !activeBrandId || activeBrandId === 'ALL' || t.brandId === activeBrandId;
      const title = (t.title || '').toLowerCase();
      const assignee = (t.assignedTo?.fullName || '').toLowerCase();
      const matchSearch = !searchEmployee || title.includes(searchEmployee.toLowerCase()) || assignee.includes(searchEmployee.toLowerCase());
      return matchBrand && matchSearch;
    });
  }, [safeTasks, activeBrandId, searchEmployee]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalRecords = filteredAttendance.length;
    const presentCount = filteredAttendance.filter(a => a?.status === 'PRESENT' || a?.status === 'Present').length;
    const lateCount = filteredAttendance.filter(a => a?.status === 'LATE' || a?.status === 'Late' || (a?.lateMinutes && a.lateMinutes > 0)).length;
    const halfDayCount = filteredAttendance.filter(a => a?.status === 'HALF_DAY' || a?.status === 'Half Day').length;
    const missingCheckouts = filteredAttendance.filter(a => a?.status === 'INCOMPLETE' || (a?.checkIn && !a?.checkOut)).length;

    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter(t => t?.status === 'COMPLETED' || t?.status === 'Completed').length;
    const overdueTasks = filteredTasks.filter(t => {
      if (t?.status === 'COMPLETED' || t?.status === 'Completed') return false;
      return t?.dueDate && new Date(t.dueDate) < new Date();
    }).length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalRecords,
      presentCount,
      lateCount,
      halfDayCount,
      missingCheckouts,
      totalTasks,
      completedTasks,
      overdueTasks,
      taskCompletionRate
    };
  }, [filteredAttendance, filteredTasks]);

  // Employee-wise Task Performance
  const employeeTaskStats = useMemo(() => {
    const map = {};
    safeEmployees.forEach(emp => {
      if (!emp || !emp._id) return;
      map[emp._id] = {
        name: emp.fullName || 'Unnamed',
        empId: emp.employeeId || 'ID: --',
        department: emp.department || 'General',
        total: 0,
        completed: 0,
        inProgress: 0,
        overdue: 0
      };
    });

    filteredTasks.forEach(task => {
      if (!task) return;
      const empId = task.assignedTo?._id || task.assignedTo;
      if (empId && map[empId]) {
        map[empId].total += 1;
        if (task.status === 'COMPLETED' || task.status === 'Completed') map[empId].completed += 1;
        else if (task.status === 'IN_PROGRESS' || task.status === 'In Progress') map[empId].inProgress += 1;

        if (task.status !== 'COMPLETED' && task.status !== 'Completed' && task.dueDate && new Date(task.dueDate) < new Date()) {
          map[empId].overdue += 1;
        }
      }
    });

    return Object.values(map).filter(e => e.total > 0);
  }, [safeEmployees, filteredTasks]);

  // Export to CSV Function
  const exportAttendanceCSV = () => {
    const headers = ['Date', 'Employee ID', 'Employee Name', 'Shift', 'Check-In', 'Check-Out', 'Status', 'Late Minutes', 'Total Hours'];
    const rows = filteredAttendance.map(a => [
      a.dateString,
      a.employee?.employeeId || a.employeeId || 'N/A',
      `"${a.employee?.fullName || a.employeeName || 'N/A'}"`,
      `"${a.shift?.name || a.shiftName || 'Standard'}"`,
      a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
      a.status,
      a.lateMinutes || 0,
      a.totalHours ? a.totalHours.toFixed(2) : 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${dateFrom}_to_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTasksCSV = () => {
    const headers = ['Task ID', 'Title', 'Priority', 'Assigned To', 'Status', 'Due Date', 'Progress %'];
    const rows = filteredTasks.map(t => [
      t.taskId || 'N/A',
      `"${(t.title || '').replace(/"/g, '""')}"`,
      t.priority,
      `"${t.assignedTo?.fullName || 'Unassigned'}"`,
      t.status,
      t.dueDate ? t.dueDate.split('T')[0] : 'N/A',
      t.progress || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Tasks_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <EmployeeHeader currentTab={currentTab} onNavigate={onNavigate} />

      {/* Header and Export Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-emerald-600" size={24} />
            Workforce Reports & Analytics
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Generate, filter, and export consolidated attendance registers, task completion rates, and exception audits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeReportTab === 'attendance' ? (
            <button
              onClick={exportAttendanceCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <FileSpreadsheet size={16} />
              Export Attendance CSV
            </button>
          ) : (
            <button
              onClick={exportTasksCSV}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <FileSpreadsheet size={16} />
              Export Tasks CSV
            </button>
          )}
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Logs</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <Calendar size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800">{metrics.totalRecords}</p>
          <p className="text-xs text-emerald-600 font-semibold mt-1">
            {metrics.presentCount} marked present
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Late Arrivals & Exceptions</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600">{metrics.lateCount}</p>
          <p className="text-xs text-rose-500 font-semibold mt-1">
            {metrics.missingCheckouts} missing checkouts flagged
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Task Completion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600">{metrics.taskCompletionRate}%</p>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${metrics.taskCompletionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Tasks</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600">{metrics.overdueTasks}</p>
          <p className="text-xs text-slate-500 mt-1">
            out of {metrics.totalTasks} total tasks
          </p>
        </div>
      </div>

      {/* Date & Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Filter employee or task..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
            Brand: {currentBrand ? currentBrand.name : 'All Brands'}
          </span>
          <button
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() - 30);
              setDateFrom(d.toISOString().split('T')[0]);
              setDateTo(new Date().toISOString().split('T')[0]);
              setSearchEmployee('');
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl font-medium transition-all"
          >
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveReportTab('attendance')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeReportTab === 'attendance'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar size={16} />
          Attendance Register
        </button>
        <button
          onClick={() => setActiveReportTab('tasks')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeReportTab === 'tasks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 size={16} />
          Task Performance by Employee
        </button>
        <button
          onClick={() => setActiveReportTab('exceptions')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2 ${
            activeReportTab === 'exceptions'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle size={16} />
          Exceptions & Missing Checkouts
        </button>
      </div>

      {/* Tab 1: Attendance Register Table */}
      {activeReportTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Shift</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Hours</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Late (Min)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                      No attendance records found for this period and brand.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((row) => (
                    <tr key={row._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">{row.dateString}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{row.employee?.fullName || row.employeeName || 'Unknown'}</p>
                        <p className="text-xs text-slate-400">{row.employee?.employeeId || row.employeeId || 'ID: --'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{row.shift?.name || row.shiftName || 'Standard'}</td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {row.checkOut ? (
                          new Date(row.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-amber-600 font-semibold font-sans">Active / Open</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {row.totalHours ? `${row.totalHours.toFixed(1)} hrs` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          row.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700' :
                          row.status === 'LATE' ? 'bg-amber-50 text-amber-700' :
                          row.status === 'INCOMPLETE' ? 'bg-rose-50 text-rose-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={row.lateMinutes > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {row.lateMinutes ? `${row.lateMinutes}m` : '-'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Task Performance by Employee */}
      {activeReportTab === 'tasks' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Total Tasks</th>
                  <th className="py-3 px-4 text-emerald-600">Completed</th>
                  <th className="py-3 px-4 text-sky-600">In Progress</th>
                  <th className="py-3 px-4 text-rose-600">Overdue</th>
                  <th className="py-3 px-4 min-w-[180px]">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeTaskStats.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      No task metrics available for current employees.
                    </td>
                  </tr>
                ) : (
                  employeeTaskStats.map((item, idx) => {
                    const rate = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.empId}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{item.department}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{item.total}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">{item.completed}</td>
                        <td className="py-3.5 px-4 font-medium text-sky-600">{item.inProgress}</td>
                        <td className="py-3.5 px-4 font-bold text-rose-600">{item.overdue}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  rate > 75 ? 'bg-emerald-500' : rate > 40 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-700 min-w-[32px]">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Exceptions & Missing Checkouts */}
      {activeReportTab === 'exceptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-rose-50/50 border-b border-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Issue Flagged</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAttendance.filter(a => a.status === 'INCOMPLETE' || a.status === 'LATE' || !a.checkOut).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-emerald-600 font-semibold">
                      🎉 No exceptions or missing checkouts flagged! Everything is healthy.
                    </td>
                  </tr>
                ) : (
                  filteredAttendance
                    .filter(a => a.status === 'INCOMPLETE' || a.status === 'LATE' || !a.checkOut)
                    .map((row) => {
                      const isMissingCheckout = !row.checkOut;
                      const isLate = row.status === 'LATE' || row.lateMinutes > 0;
                      return (
                        <tr key={row._id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">{row.dateString}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-800">{row.employee?.fullName || row.employeeName || 'Unknown'}</p>
                            <p className="text-xs text-slate-400">{row.employee?.employeeId || row.employeeId || 'ID: --'}</p>
                          </td>
                          <td className="py-3.5 px-4">
                            {isMissingCheckout && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 mr-1">
                                Missing Checkout
                              </span>
                            )}
                            {isLate && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                Late ({row.lateMinutes || 0}m)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                            {row.checkIn ? new Date(row.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500 max-w-xs">
                            {isMissingCheckout
                              ? 'Employee clocked in but no checkout timestamp was recorded for the shift.'
                              : `Shift started with ${row.lateMinutes} minutes delay beyond allowed grace period.`}
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => onNavigate && onNavigate('attendance')}
                              className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                              Apply Correction
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
