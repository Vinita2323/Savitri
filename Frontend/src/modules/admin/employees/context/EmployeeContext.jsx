import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { employeeService } from '../../../../services/employeeService';
import API from '../../../../services/api';
import { useSuperAdmin } from '../../../super-admin/context/SuperAdminContext';

const EmployeeContext = createContext();

export const EmployeeProvider = ({ children }) => {
  // Brand scoping - sync with SuperAdminContext if present
  let superAdminCtx = null;
  try {
    superAdminCtx = useSuperAdmin();
  } catch (_) {
    // If rendered outside SuperAdminProvider (e.g. within Admin panel)
  }

  const selectedBrand = superAdminCtx?.selectedBrand || null;
  // Outside the Super Admin panel the brand list comes from the API (the brands this admin may access), never a hard-coded list.
  const [apiBrands, setApiBrands] = useState([{ id: 'ALL', name: 'All Brands (Consolidated)' }]);
  useEffect(() => {
    if (superAdminCtx?.brands) return undefined;
    let alive = true;
    API.get('/super-admin/brands')
      .then((res) => {
        const list = res.data?.brands || res.data?.data || [];
        if (alive) setApiBrands([{ id: 'ALL', name: 'All Brands (Consolidated)' }, ...list.map((x) => ({ id: x.brandId, name: x.name }))]);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [superAdminCtx?.brands]);
  const brandsList = superAdminCtx?.brands || apiBrands;
  // A brand-restricted admin who can access exactly one brand is always scoped to it (never the consolidated view).
  const activeBrandId = superAdminCtx?.selectedBrandId || (apiBrands.length === 2 ? apiBrands[1].id : 'ALL');

  const employeesTicket = useRef(0);
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
    currentlyCheckedIn: 0,
    missingCheckouts: 0,
    pendingLeaves: 0,
    totalTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (text, type = 'info') => {
    setAlert({ text, type });
    setTimeout(() => {
      setAlert((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // 1. Fetch Employees
  const fetchEmployees = useCallback(
    async (params = {}) => {
      const ticket = ++employeesTicket.current;
      setIsLoading(true);
      try {
        const res = await employeeService.getEmployees({
          brandId: activeBrandId,
          ...params,
        });
        if (ticket !== employeesTicket.current) return res.employees || []; // a newer brand selection already replaced this request
        setEmployees(res.employees || []);

        // People lists (attendance, tasks) follow the selected brand: another brand's staff is never mixed in
        setAllEmployees(res.employees || []);

        return res.employees || [];
      } catch (err) {
        console.error('fetchEmployees error:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [activeBrandId]
  );

  // 2. Fetch Attendance
  const fetchAttendance = useCallback(
    async (params = {}) => {
      try {
        const res = await employeeService.getAttendanceRecords({
          brandId: activeBrandId,
          ...params,
        });
        setAttendanceRecords(res.records || []);
        return res.records || [];
      } catch (err) {
        console.error('fetchAttendance error:', err);
        return [];
      }
    },
    [activeBrandId]
  );

  // 3. Fetch Tasks
  const fetchTasks = useCallback(
    async (params = {}) => {
      try {
        const res = await employeeService.getTasks({
          brandId: activeBrandId,
          ...params,
        });
        setTasks(res.tasks || []);
        return res.tasks || [];
      } catch (err) {
        console.error('fetchTasks error:', err);
        return [];
      }
    },
    [activeBrandId]
  );

  // 4. Fetch Leaves
  const fetchLeaves = useCallback(
    async (params = {}) => {
      try {
        const res = await employeeService.getLeaveRequests({
          brandId: activeBrandId,
          ...params,
        });
        setLeaves(res.leaves || []);
        return res.leaves || [];
      } catch (err) {
        console.error('fetchLeaves error:', err);
        return [];
      }
    },
    [activeBrandId]
  );

  // 5. Fetch Shifts & Holidays
  const fetchShifts = useCallback(async () => {
    try {
      const data = await employeeService.getShifts({ brandId: activeBrandId });
      setShifts(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [activeBrandId]);

  const fetchHolidays = useCallback(async () => {
    try {
      const data = await employeeService.getHolidays({ brandId: activeBrandId });
      setHolidays(data || []);
    } catch (err) {
      console.error(err);
    }
  }, [activeBrandId]);

  // 6. Fetch Dashboard Metrics
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const metrics = await employeeService.getDashboardSummary({ brandId: activeBrandId });
      setDashboardMetrics(metrics || {});
    } catch (err) {
      console.error(err);
    }
  }, [activeBrandId]);

  // Initial load & when active brand changes
  useEffect(() => {
    fetchEmployees();
    fetchAttendance();
    fetchTasks();
    fetchLeaves();
    fetchShifts();
    fetchHolidays();
    fetchDashboardMetrics();
  }, [
    fetchEmployees,
    fetchAttendance,
    fetchTasks,
    fetchLeaves,
    fetchShifts,
    fetchHolidays,
    fetchDashboardMetrics,
  ]);

  // CRUD Mutations
  const handleCheckIn = async (employeeId, source = 'Web') => {
    try {
      const res = await employeeService.checkIn({ employeeId, source });
      showAlert(res.message, 'success');
      fetchAttendance();
      fetchDashboardMetrics();
      return { success: true };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const handleCheckOut = async (employeeId, source = 'Web') => {
    try {
      const res = await employeeService.checkOut({ employeeId, source });
      showAlert(res.message, 'success');
      fetchAttendance();
      fetchDashboardMetrics();
      return { success: true };
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const handleCorrectAttendance = async (recordId, payload) => {
    try {
      const res = await employeeService.correctAttendance(recordId, payload);
      if (res.success) {
        showAlert('Attendance corrected and audited.', 'success');
        fetchAttendance();
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const handleManualAttendance = async (payload) => {
    try {
      const res = await employeeService.manualMarkAttendance(payload);
      if (res.success) {
        showAlert(res.message, 'success');
        fetchAttendance({ date: payload.date });
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const handleCreateEmployee = async (formData) => {
    try {
      const res = await employeeService.createEmployee(formData);
      if (res.success) {
        showAlert(`Employee ${res.employee.fullName} added successfully!`, 'success');
        fetchEmployees();
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const handleUpdateEmployee = async (id, updates) => {
    try {
      const res = await employeeService.updateEmployee(id, updates);
      if (res.success) {
        showAlert('Employee details updated.', 'success');
        fetchEmployees();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const handleToggleStatus = async (id, status) => {
    try {
      const res = await employeeService.toggleEmployeeStatus(id, status);
      if (res.success) {
        showAlert(`Employee status updated to ${res.employee?.employmentStatus}`, 'info');
        fetchEmployees();
        fetchDashboardMetrics();
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const res = await employeeService.createTask(taskData);
      if (res.success) {
        showAlert(`Task "${res.task.title}" created successfully!`, 'success');
        fetchTasks();
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  // Several tasks at once: one message and one refresh for the whole batch
  const handleCreateTasksBulk = async (list) => {
    try {
      const res = await employeeService.createTasksBulk(list);
      if (res.created > 0) {
        showAlert(res.message, res.failed ? 'info' : 'success');
        fetchTasks();
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false, created: 0, failed: list.length, results: [] };
    }
  };

  const handleUpdateTaskStatus = async (taskId, status, progressPercent) => {
    try {
      const res = await employeeService.updateTaskStatus(taskId, { status, progressPercent });
      if (res.success) {
        showAlert(`Task status changed to "${status}".`, 'info');
        fetchTasks();
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const handleAddComment = async (taskId, comment) => {
    try {
      const res = await employeeService.addTaskComment(taskId, comment);
      if (res.success) {
        fetchTasks();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const handleSubmitLeave = async (leaveData) => {
    try {
      const res = await employeeService.submitLeaveRequest(leaveData);
      if (res.success) {
        showAlert('Leave request submitted successfully.', 'success');
        fetchLeaves();
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const handleReviewLeave = async (leaveId, status, notes) => {
    try {
      const res = await employeeService.reviewLeaveRequest(leaveId, status, notes);
      if (res.success) {
        showAlert(`Leave request marked as ${status}.`, 'success');
        fetchLeaves();
        fetchEmployees();
        fetchDashboardMetrics();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const handleCreateShift = async (shiftData) => {
    try {
      const res = await employeeService.createShift(shiftData);
      if (res.success) {
        showAlert('New shift created.', 'success');
        fetchShifts();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const handleCreateHoliday = async (holData) => {
    try {
      const res = await employeeService.createHoliday(holData);
      if (res.success) {
        showAlert('Holiday added to calendar.', 'success');
        fetchHolidays();
      }
      return res;
    } catch (err) {
      showAlert(err.message, 'error');
      return { success: false };
    }
  };

  const value = {
    activeBrandId,
    selectedBrand,
    brandsList,
    employees,
    allEmployees,
    attendanceRecords,
    attendance: attendanceRecords,
    tasks,
    leaves,
    shifts,
    holidays,
    dashboardMetrics,
    isLoading,
    alert,
    showAlert,

    // Actions
    fetchEmployees,
    fetchAttendance,
    fetchTasks,
    fetchLeaves,
    fetchShifts,
    fetchHolidays,
    fetchDashboardMetrics,

    handleCheckIn,
    handleCheckOut,
    handleCorrectAttendance,
    handleManualAttendance,
    handleCreateEmployee,
    handleUpdateEmployee,
    handleToggleStatus,
    handleCreateTask,
    handleCreateTasksBulk,
    handleUpdateTaskStatus,
    handleAddComment,
    handleSubmitLeave,
    handleReviewLeave,
    handleCreateShift,
    handleCreateHoliday,
  };

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
};

export const useEmployee = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
};

export const useEmployees = useEmployee;

export default EmployeeContext;
