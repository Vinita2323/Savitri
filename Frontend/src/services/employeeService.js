import API from './api';

const EMPLOYEES_KEY = 'savitri_employees_data';
const ATTENDANCE_KEY = 'savitri_attendance_data';
const TASKS_KEY = 'savitri_tasks_data';
const LEAVES_KEY = 'savitri_leaves_data';
const SHIFTS_KEY = 'savitri_shifts_data';
const HOLIDAYS_KEY = 'savitri_holidays_data';

// Helper: Format Date to YYYY-MM-DD
const toDateStr = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Initial realistic seed data for employees
const INITIAL_EMPLOYEES = [
  {
    _id: 'emp_001',
    employeeId: 'EMP-FG-001',
    fullName: 'Aakash Sharma',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&q=80',
    email: 'aakash.sharma@fashiongallary.in',
    phone: '9826011223',
    designation: 'Store Manager',
    department: 'Retail Operations',
    brandId: 'brand_fg',
    brandName: 'Fashion Gallary',
    storeId: 'store_ind_01',
    storeName: 'Indore MG Road Store',
    joiningDate: '2024-03-15',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'Morning Retail Shift (9:30 AM - 6:30 PM)',
      startTime: '09:30',
      endTime: '18:30',
      graceMinutes: 15,
    },
    emergencyContact: { name: 'Sunita Sharma', relationship: 'Spouse', phone: '9826099881' },
    notes: 'Key holder for Indore central retail flagship.',
  },
  {
    _id: 'emp_002',
    employeeId: 'EMP-FG-002',
    fullName: 'Priya Rathore',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&q=80',
    email: 'priya.rathore@fashiongallary.in',
    phone: '9425022334',
    designation: 'Inventory & Dispatch Lead',
    department: 'Warehouse & Inventory',
    brandId: 'brand_fg',
    brandName: 'Fashion Gallary',
    storeId: 'store_ind_01',
    storeName: 'Indore MG Road Store',
    joiningDate: '2024-06-01',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'General Shift (10:00 AM - 7:00 PM)',
      startTime: '10:00',
      endTime: '19:00',
      graceMinutes: 15,
    },
    emergencyContact: { name: 'Kishan Rathore', relationship: 'Father', phone: '9425088776' },
    notes: 'Handles SKU barcodes, audits and inbound consignments.',
  },
  {
    _id: 'emp_003',
    employeeId: 'EMP-FH-001',
    fullName: 'Rohit Verma',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&q=80',
    email: 'rohit.verma@fashionhub.in',
    phone: '9893033445',
    designation: 'Quick Commerce Fulfillment Associate',
    department: 'Logistics & Dispatch',
    brandId: 'brand_fh',
    brandName: 'Fashion Hub',
    storeId: 'store_bpl_01',
    storeName: 'Bhopal Dark Store #02',
    joiningDate: '2025-01-10',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'Morning Express Shift (8:00 AM - 5:00 PM)',
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 10,
    },
    emergencyContact: { name: 'Anita Verma', relationship: 'Mother', phone: '9893077665' },
    notes: 'Assigned to 15-minute quick delivery packing.',
  },
  {
    _id: 'emp_004',
    employeeId: 'EMP-FA-001',
    fullName: 'Sneha Patel',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
    email: 'sneha.patel@fashionadda.in',
    phone: '9123455667',
    designation: 'Customer Experience Executive',
    department: 'Customer Support',
    brandId: 'brand_fa',
    brandName: 'Fashion Adda',
    storeId: 'store_jbp_01',
    storeName: 'Jabalpur Hub',
    joiningDate: '2025-02-18',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'General Shift (10:00 AM - 7:00 PM)',
      startTime: '10:00',
      endTime: '19:00',
      graceMinutes: 15,
    },
    emergencyContact: { name: 'Ramesh Patel', relationship: 'Brother', phone: '9123488990' },
    notes: 'Handles order status inquiries and return escalations.',
  },
  {
    _id: 'emp_005',
    employeeId: 'EMP-FG-003',
    fullName: 'Vikas Soni',
    avatar: '',
    email: 'vikas.soni@fashiongallary.in',
    phone: '9827044556',
    designation: 'Billing Cashier & POS Operator',
    department: 'Retail Operations',
    brandId: 'brand_fg',
    brandName: 'Fashion Gallary',
    storeId: 'store_ind_01',
    storeName: 'Indore MG Road Store',
    joiningDate: '2025-03-01',
    employmentType: 'Part-time',
    employmentStatus: 'Active',
    shift: {
      name: 'Evening Shift (1:00 PM - 10:00 PM)',
      startTime: '13:00',
      endTime: '22:00',
      graceMinutes: 15,
    },
    emergencyContact: { name: 'Manoj Soni', relationship: 'Father', phone: '9827011223' },
    notes: 'Counter sales terminal operator.',
  },
];

// Initial shifts
const INITIAL_SHIFTS = [
  {
    _id: 'shift_1',
    name: 'General Retail Shift (9:30 AM - 6:30 PM)',
    brandId: 'ALL',
    startTime: '09:30',
    endTime: '18:30',
    graceMinutes: 15,
    halfDayMinutes: 240,
    weeklyOffs: ['Sunday'],
    isActive: true,
  },
  {
    _id: 'shift_2',
    name: 'Morning Quick Commerce (8:00 AM - 5:00 PM)',
    brandId: 'ALL',
    startTime: '08:00',
    endTime: '17:00',
    graceMinutes: 10,
    halfDayMinutes: 240,
    weeklyOffs: ['Monday'],
    isActive: true,
  },
  {
    _id: 'shift_3',
    name: 'Evening Store Shift (1:00 PM - 10:00 PM)',
    brandId: 'ALL',
    startTime: '13:00',
    endTime: '22:00',
    graceMinutes: 15,
    halfDayMinutes: 240,
    weeklyOffs: ['Sunday'],
    isActive: true,
  },
  {
    _id: 'shift_4',
    name: 'Night Logistics Shift (10:00 PM - 6:00 AM)',
    brandId: 'ALL',
    startTime: '22:00',
    endTime: '06:00',
    isOvernight: true,
    graceMinutes: 15,
    halfDayMinutes: 240,
    weeklyOffs: ['Sunday'],
    isActive: true,
  },
];

// Initial holidays
const INITIAL_HOLIDAYS = [
  {
    _id: 'hol_1',
    name: 'Republic Day',
    date: '2026-01-26',
    dateString: '2026-01-26',
    brandId: 'ALL',
    isOptional: false,
    description: 'National Holiday',
  },
  {
    _id: 'hol_2',
    name: 'Holi Festival',
    date: '2026-03-04',
    dateString: '2026-03-04',
    brandId: 'ALL',
    isOptional: false,
    description: 'Festival of Colors',
  },
  {
    _id: 'hol_3',
    name: 'Independence Day',
    date: '2026-08-15',
    dateString: '2026-08-15',
    brandId: 'ALL',
    isOptional: false,
    description: 'National Independence Day',
  },
  {
    _id: 'hol_4',
    name: 'Diwali Deepawali',
    date: '2026-11-08',
    dateString: '2026-11-08',
    brandId: 'ALL',
    isOptional: false,
    description: 'Festival of Lights',
  },
];

// Storage helper functions
const getLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const setLocal = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error('Local storage write failed for ' + key, e);
  }
};

export const employeeService = {
  // 1. Employees Directory
  async getEmployees(params = {}) {
    try {
      const res = await API.get('/employees', { params });
      if (res.data?.success && Array.isArray(res.data.employees)) {
        return res.data;
      }
    } catch {
      // Fallback
    }

    let list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const { brandId, department, status, search } = params;

    if (brandId && brandId !== 'ALL') {
      list = list.filter((e) => e.brandId === brandId);
    }
    if (department && department !== 'ALL') {
      list = list.filter((e) => e.department === department);
    }
    if (status && status !== 'ALL') {
      list = list.filter((e) => e.employmentStatus === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.phone.includes(q) ||
          e.designation.toLowerCase().includes(q)
      );
    }

    return { success: true, total: list.length, employees: list };
  },

  async getEmployeeById(id) {
    try {
      const res = await API.get(`/employees/${id}`);
      if (res.data?.success && res.data.employee) {
        return res.data.employee;
      }
    } catch {}

    const list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const emp = list.find((e) => e._id === id || e.employeeId === id);
    return emp || null;
  },

  async createEmployee(data) {
    try {
      const res = await API.post('/employees', data);
      if (res.data?.success && res.data.employee) {
        const list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
        list.unshift(res.data.employee);
        setLocal(EMPLOYEES_KEY, list);
        return res.data;
      }
    } catch (err) {
      if (err.response?.status === 409) {
        throw new Error(err.response.data?.message || 'Employee email already exists');
      }
    }

    const list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const year = new Date().getFullYear();
    const count = list.length + 1;
    const prefix = data.brandId ? data.brandId.replace('brand_', '').toUpperCase() : 'EMP';
    const employeeId = `${prefix}-${year}-${String(count).padStart(3, '0')}`;

    const newEmp = {
      _id: `emp_${Date.now()}`,
      employeeId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      designation: data.designation || 'Associate',
      department: data.department || 'Operations',
      brandId: data.brandId || 'brand_fg',
      brandName: data.brandName || 'Fashion Gallary',
      storeId: data.storeId || '',
      storeName: data.storeName || 'Central Store',
      joiningDate: data.joiningDate || new Date().toISOString().slice(0, 10),
      employmentType: data.employmentType || 'Full-time',
      employmentStatus: 'Active',
      shift: data.shift || {
        name: 'General Shift (9:30 AM - 6:30 PM)',
        startTime: '09:30',
        endTime: '18:30',
      },
      emergencyContact: data.emergencyContact || {},
      notes: data.notes || '',
    };

    list.unshift(newEmp);
    setLocal(EMPLOYEES_KEY, list);
    return { success: true, employee: newEmp };
  },

  async updateEmployee(id, updates) {
    try {
      const res = await API.put(`/employees/${id}`, updates);
      if (res.data?.success) return res.data;
    } catch {}

    const list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const idx = list.findIndex((e) => e._id === id || e.employeeId === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...updates };
      setLocal(EMPLOYEES_KEY, list);
      return { success: true, employee: list[idx] };
    }
    return { success: false, message: 'Employee not found' };
  },

  async toggleEmployeeStatus(id, status) {
    try {
      const res = await API.patch(`/employees/${id}/status`, { status });
      if (res.data?.success) return res.data;
    } catch {}

    const list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const idx = list.findIndex((e) => e._id === id || e.employeeId === id);
    if (idx >= 0) {
      const nextStatus = status || (list[idx].employmentStatus === 'Active' ? 'Inactive' : 'Active');
      list[idx].employmentStatus = nextStatus;
      setLocal(EMPLOYEES_KEY, list);
      return { success: true, employee: list[idx] };
    }
    return { success: false };
  },

  // 2. Attendance Tracking
  async getAttendanceRecords(params = {}) {
    try {
      const res = await API.get('/employees/attendance/records', { params });
      if (res.data?.success && Array.isArray(res.data.records)) {
        return res.data;
      }
    } catch {}

    let records = getLocal(ATTENDANCE_KEY, []);
    const { date, brandId, status, search } = params;
    const targetDate = date || toDateStr();

    records = records.filter((r) => r.dateString === targetDate);

    if (brandId && brandId !== 'ALL') {
      records = records.filter((r) => r.brandId === brandId);
    }
    if (status && status !== 'ALL') {
      records = records.filter((r) => r.status === status);
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      records = records.filter(
        (r) =>
          r.employeeName?.toLowerCase().includes(q) ||
          r.employeeId?.toLowerCase().includes(q)
      );
    }

    return { success: true, total: records.length, records };
  },

  async checkIn(payload) {
    try {
      const res = await API.post('/employees/attendance/check-in', payload);
      if (res.data?.success) return res.data;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const { employeeId, source = 'Web', location = {} } = payload;
    const list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const emp = list.find((e) => e._id === employeeId || e.employeeId === employeeId);

    if (!emp) throw new Error('Employee not found.');
    if (emp.employmentStatus !== 'Active') {
      throw new Error(`Employee is ${emp.employmentStatus}. Cannot check in.`);
    }

    const todayStr = toDateStr();
    const records = getLocal(ATTENDANCE_KEY, []);
    const existing = records.find((r) => r.employeeId === emp.employeeId && r.dateString === todayStr);

    if (existing && existing.checkIn) {
      throw new Error(`Already checked in today at ${new Date(existing.checkIn).toLocaleTimeString('en-IN')}`);
    }

    const now = new Date();
    const shiftStartTime = emp.shift?.startTime || '09:30';
    const [sH, sM] = shiftStartTime.split(':').map(Number);
    const shiftDate = new Date();
    shiftDate.setHours(sH, sM, 0, 0);

    const diffMins = Math.round((now.getTime() - shiftDate.getTime()) / 60000);
    const isLate = diffMins > (emp.shift?.graceMinutes || 15);

    const newRecord = {
      _id: `att_${Date.now()}`,
      employee: emp._id,
      employeeId: emp.employeeId,
      employeeName: emp.fullName,
      brandId: emp.brandId,
      storeId: emp.storeId,
      dateString: todayStr,
      date: new Date().toISOString(),
      shift: emp.shift,
      checkIn: now.toISOString(),
      checkInSource: source,
      checkInLocation: location,
      checkOut: null,
      totalDurationMinutes: 0,
      status: isLate ? 'Late' : 'Present',
      lateMinutes: isLate ? diffMins : 0,
      isMissingCheckout: true,
      correction: { isCorrected: false },
    };

    if (existing) {
      Object.assign(existing, newRecord);
    } else {
      records.unshift(newRecord);
    }
    setLocal(ATTENDANCE_KEY, records);

    return {
      success: true,
      message: `Checked in successfully at ${now.toLocaleTimeString('en-IN')}.${isLate ? ` (Late by ${diffMins} mins)` : ''}`,
      record: newRecord,
    };
  },

  async checkOut(payload) {
    try {
      const res = await API.post('/employees/attendance/check-out', payload);
      if (res.data?.success) return res.data;
    } catch (err) {
      if (err.response?.data?.message) {
        throw new Error(err.response.data.message);
      }
    }

    const { employeeId } = payload;
    const records = getLocal(ATTENDANCE_KEY, []);
    const todayStr = toDateStr();

    const record = records.find(
      (r) => (r.employeeId === employeeId || r.employee === employeeId) && r.dateString === todayStr
    );

    if (!record || !record.checkIn) {
      throw new Error('No active check-in record found for today.');
    }
    if (record.checkOut) {
      throw new Error(`Already checked out at ${new Date(record.checkOut).toLocaleTimeString('en-IN')}`);
    }

    const now = new Date();
    const duration = Math.round((now.getTime() - new Date(record.checkIn).getTime()) / 60000);

    record.checkOut = now.toISOString();
    record.totalDurationMinutes = duration;
    record.isMissingCheckout = false;
    if (duration < 240) {
      record.status = 'Half Day';
    }

    setLocal(ATTENDANCE_KEY, records);

    const h = Math.floor(duration / 60);
    const m = duration % 60;

    return {
      success: true,
      message: `Checked out successfully. Total worked: ${h}h ${m}m.`,
      record,
    };
  },

  async manualMarkAttendance(payload) {
    try {
      const res = await API.post('/employees/attendance/manual', payload);
      if (res.data?.success) return res.data;
    } catch {}

    const { employeeId, date = toDateStr(), status = 'Present', checkInTime, checkOutTime, notes = '' } = payload;
    const list = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const emp = list.find((e) => e._id === employeeId || e.employeeId === employeeId);

    if (!emp) throw new Error('Employee not found.');

    const records = getLocal(ATTENDANCE_KEY, []);
    let rec = records.find(
      (r) => (r.employeeId === emp.employeeId || r.employee === emp._id) && r.dateString === date
    );

    let checkInISO = null;
    let checkOutISO = null;
    let durationMins = 0;

    if (checkInTime) {
      const [h, m] = checkInTime.split(':').map(Number);
      const dIn = new Date(date + 'T00:00:00');
      dIn.setHours(h, m, 0, 0);
      checkInISO = dIn.toISOString();
    }
    if (checkOutTime) {
      const [h, m] = checkOutTime.split(':').map(Number);
      const dOut = new Date(date + 'T00:00:00');
      dOut.setHours(h, m, 0, 0);
      checkOutISO = dOut.toISOString();
    }
    if (checkInISO && checkOutISO) {
      durationMins = Math.max(0, Math.round((new Date(checkOutISO) - new Date(checkInISO)) / 60000));
    }

    if (!rec) {
      rec = {
        _id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        employee: emp._id,
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        brandId: emp.brandId,
        storeId: emp.storeId,
        dateString: date,
        date: new Date(date + 'T00:00:00').toISOString(),
        shift: emp.shift || { name: 'Standard (09:30 - 18:30)', startTime: '09:30', endTime: '18:30' },
        checkIn: checkInISO,
        checkInSource: 'Admin Manual',
        checkOut: checkOutISO,
        totalDurationMinutes: durationMins,
        status: status,
        lateMinutes: status === 'Late' ? 30 : 0,
        isMissingCheckout: !checkOutISO && status !== 'Absent' && status !== 'On Leave',
        correction: notes ? { isCorrected: true, reason: notes, correctedAt: new Date().toISOString() } : { isCorrected: false },
      };
      records.unshift(rec);
    } else {
      rec.status = status;
      if (checkInISO) rec.checkIn = checkInISO;
      if (checkOutISO) rec.checkOut = checkOutISO;
      if (durationMins > 0) rec.totalDurationMinutes = durationMins;
      rec.isMissingCheckout = !rec.checkOut && status !== 'Absent' && status !== 'On Leave';
      if (notes) {
        rec.correction = {
          isCorrected: true,
          reason: notes,
          correctedAt: new Date().toISOString(),
        };
      }
    }

    setLocal(ATTENDANCE_KEY, records);
    return {
      success: true,
      message: `Attendance marked for ${emp.fullName} as ${status}.`,
      record: rec,
    };
  },

  async correctAttendance(id, payload) {
    try {
      const res = await API.patch(`/employees/attendance/${id}/correction`, payload);
      if (res.data?.success) return res.data;
    } catch {}

    const records = getLocal(ATTENDANCE_KEY, []);
    const rec = records.find((r) => r._id === id);
    if (rec) {
      rec.correction = {
        isCorrected: true,
        originalStatus: rec.status,
        reason: payload.reason || 'Admin Correction',
        correctedAt: new Date().toISOString(),
      };
      if (payload.status) rec.status = payload.status;
      if (payload.checkIn) rec.checkIn = payload.checkIn;
      if (payload.checkOut) rec.checkOut = payload.checkOut;
      rec.isMissingCheckout = false;
      setLocal(ATTENDANCE_KEY, records);
      return { success: true, record: rec };
    }
    return { success: false, message: 'Record not found' };
  },

  // 3. Task Management
  async getTasks(params = {}) {
    try {
      const res = await API.get('/employees/tasks/all', { params });
      if (res.data?.success && Array.isArray(res.data.tasks)) {
        return res.data;
      }
    } catch {}

    let tasks = getLocal(TASKS_KEY, [
      {
        _id: 'tsk_101',
        taskId: 'TSK-2026-0001',
        title: 'Weekly Physical Stock Audit - Ethnic Wear Section',
        description: 'Verify physical rack counts against ERP inventory numbers before weekend sale.',
        brandId: 'brand_fg',
        brandName: 'Fashion Gallary',
        department: 'Warehouse & Inventory',
        category: 'Inventory Audit',
        priority: 'High',
        status: 'In Progress',
        progressPercent: 60,
        startDate: '2026-10-27',
        dueDate: '2026-10-29',
        assignedEmployees: [
          { employeeId: 'EMP-FG-002', name: 'Priya Rathore', designation: 'Inventory Lead' },
        ],
        subtasks: [
          { id: 'st1', title: 'Count Kurtis & Gowns Aisle 3', isCompleted: true },
          { id: 'st2', title: 'Count Lehengas High-Value Vault', isCompleted: true },
          { id: 'st3', title: 'Cross-check discrepancies in POS system', isCompleted: false },
        ],
        comments: [
          { id: 'c1', authorName: 'Aakash Sharma', text: 'Please complete vault items by 4 PM.', createdAt: new Date().toISOString() },
        ],
      },
      {
        _id: 'tsk_102',
        taskId: 'TSK-2026-0002',
        title: 'POS Terminal Barcode Scanner Firmware Check',
        description: 'Ensure USB handheld guns register code 128 barcodes swiftly for billing.',
        brandId: 'brand_fg',
        brandName: 'Fashion Gallary',
        department: 'Retail Operations',
        category: 'Store Operations',
        priority: 'Urgent',
        status: 'To Do',
        progressPercent: 0,
        startDate: '2026-10-28',
        dueDate: '2026-10-28',
        assignedEmployees: [
          { employeeId: 'EMP-FG-003', name: 'Vikas Soni', designation: 'Billing Cashier' },
        ],
        subtasks: [
          { id: 'st4', title: 'Test 10 sample items', isCompleted: false },
        ],
        comments: [],
      },
      {
        _id: 'tsk_103',
        taskId: 'TSK-2026-0003',
        title: 'Customer Return Verification & Re-tagging',
        description: 'Inspect 12 returned packages, verify tags, and return to live warehouse stock.',
        brandId: 'brand_fh',
        brandName: 'Fashion Hub',
        department: 'Logistics & Dispatch',
        category: 'Order Dispatch',
        priority: 'Medium',
        status: 'Submitted for Review',
        progressPercent: 90,
        startDate: '2026-10-26',
        dueDate: '2026-10-28',
        assignedEmployees: [
          { employeeId: 'EMP-FH-001', name: 'Rohit Verma', designation: 'Fulfillment Associate' },
        ],
        subtasks: [
          { id: 'st5', title: 'Tag inspection completed', isCompleted: true },
        ],
        comments: [],
      },
    ]);

    const { brandId, status, priority, search } = params;
    if (brandId && brandId !== 'ALL') tasks = tasks.filter((t) => t.brandId === brandId);
    if (status && status !== 'ALL') tasks = tasks.filter((t) => t.status === status);
    if (priority && priority !== 'ALL') tasks = tasks.filter((t) => t.priority === priority);
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      tasks = tasks.filter((t) => t.title.toLowerCase().includes(q) || t.taskId.toLowerCase().includes(q));
    }

    return { success: true, total: tasks.length, tasks };
  },

  async createTask(data) {
    try {
      const res = await API.post('/employees/tasks', data);
      if (res.data?.success && res.data.task) {
        const tasks = getLocal(TASKS_KEY, []);
        tasks.unshift(res.data.task);
        setLocal(TASKS_KEY, tasks);
        return res.data;
      }
    } catch {}

    const tasks = getLocal(TASKS_KEY, []);
    const count = tasks.length + 1;
    const year = new Date().getFullYear();
    const taskId = `TSK-${year}-${String(count).padStart(4, '0')}`;

    const newTask = {
      _id: `tsk_${Date.now()}`,
      taskId,
      title: data.title,
      description: data.description || '',
      brandId: data.brandId || 'brand_fg',
      brandName: data.brandName || 'Fashion Gallary',
      department: data.department || 'Operations',
      category: data.category || 'Store Operations',
      priority: data.priority || 'Medium',
      status: data.assignedEmployees?.length > 0 ? 'Assigned' : 'To Do',
      progressPercent: 0,
      startDate: data.startDate || new Date().toISOString().slice(0, 10),
      dueDate: data.dueDate,
      assignedEmployees: data.assignedEmployees || [],
      subtasks: (data.subtasks || []).map((s, i) => ({
        id: `st_${Date.now()}_${i}`,
        title: typeof s === 'string' ? s : s.title,
        isCompleted: false,
      })),
      comments: [],
    };

    tasks.unshift(newTask);
    setLocal(TASKS_KEY, tasks);
    return { success: true, task: newTask };
  },

  async updateTaskStatus(id, payload) {
    try {
      const res = await API.patch(`/employees/tasks/${id}/status`, payload);
      if (res.data?.success) return res.data;
    } catch {}

    const tasks = getLocal(TASKS_KEY, []);
    const t = tasks.find((item) => item._id === id || item.taskId === id);
    if (t) {
      t.status = payload.status;
      if (payload.status === 'Completed') {
        t.progressPercent = 100;
        t.completedAt = new Date().toISOString();
      }
      if (payload.progressPercent !== undefined) {
        t.progressPercent = payload.progressPercent;
      }
      setLocal(TASKS_KEY, tasks);
      return { success: true, task: t };
    }
    return { success: false };
  },

  async addTaskComment(id, text) {
    try {
      const res = await API.post(`/employees/tasks/${id}/comments`, { text });
      if (res.data?.success) return res.data;
    } catch {}

    const tasks = getLocal(TASKS_KEY, []);
    const t = tasks.find((item) => item._id === id || item.taskId === id);
    if (t) {
      if (!t.comments) t.comments = [];
      const newComment = {
        id: `c_${Date.now()}`,
        authorName: 'Administrator',
        text,
        createdAt: new Date().toISOString(),
      };
      t.comments.push(newComment);
      setLocal(TASKS_KEY, tasks);
      return { success: true, comments: t.comments };
    }
    return { success: false };
  },

  // 4. Leave Management
  async getLeaveRequests(params = {}) {
    try {
      const res = await API.get('/employees/leaves/all', { params });
      if (res.data?.success && Array.isArray(res.data.leaves)) {
        return res.data;
      }
    } catch {}

    let leaves = getLocal(LEAVES_KEY, [
      {
        _id: 'lv_01',
        leaveId: 'LV-2026-0001',
        employeeId: 'EMP-FG-001',
        employeeName: 'Aakash Sharma',
        brandId: 'brand_fg',
        department: 'Retail Operations',
        leaveType: 'Casual Leave',
        startDate: '2026-10-30',
        endDate: '2026-10-31',
        totalDays: 2,
        isHalfDay: false,
        reason: 'Family wedding attendance in Ujjain.',
        status: 'Pending',
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'lv_02',
        leaveId: 'LV-2026-0002',
        employeeId: 'EMP-FH-001',
        employeeName: 'Rohit Verma',
        brandId: 'brand_fh',
        department: 'Logistics & Dispatch',
        leaveType: 'Sick Leave',
        startDate: '2026-10-25',
        endDate: '2026-10-25',
        totalDays: 1,
        isHalfDay: false,
        reason: 'Viral fever rest as advised by physician.',
        status: 'Approved',
        reviewedBy: { name: 'Super Admin', notes: 'Approved. Take care.', reviewedAt: new Date().toISOString() },
        createdAt: '2026-10-25T08:00:00Z',
      },
    ]);

    const { brandId, status } = params;
    if (brandId && brandId !== 'ALL') leaves = leaves.filter((l) => l.brandId === brandId);
    if (status && status !== 'ALL') leaves = leaves.filter((l) => l.status === status);

    return { success: true, total: leaves.length, leaves };
  },

  async submitLeaveRequest(data) {
    try {
      const res = await API.post('/employees/leaves', data);
      if (res.data?.success && res.data.leave) {
        const leaves = getLocal(LEAVES_KEY, []);
        leaves.unshift(res.data.leave);
        setLocal(LEAVES_KEY, leaves);
        return res.data;
      }
    } catch {}

    const leaves = getLocal(LEAVES_KEY, []);
    const count = leaves.length + 1;
    const year = new Date().getFullYear();
    const leaveId = `LV-${year}-${String(count).padStart(4, '0')}`;

    const newLeave = {
      _id: `lv_${Date.now()}`,
      leaveId,
      ...data,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    };

    leaves.unshift(newLeave);
    setLocal(LEAVES_KEY, leaves);
    return { success: true, leave: newLeave };
  },

  async reviewLeaveRequest(id, status, notes = '') {
    try {
      const res = await API.patch(`/employees/leaves/${id}/review`, { status, notes });
      if (res.data?.success) return res.data;
    } catch {}

    const leaves = getLocal(LEAVES_KEY, []);
    const l = leaves.find((item) => item._id === id || item.leaveId === id);
    if (l) {
      l.status = status;
      l.reviewedBy = { name: 'Super Admin', notes, reviewedAt: new Date().toISOString() };
      setLocal(LEAVES_KEY, leaves);
      return { success: true, leave: l };
    }
    return { success: false };
  },

  // 5. Shifts & Holidays
  async getShifts(params = {}) {
    try {
      const res = await API.get('/employees/shifts', { params });
      if (res.data?.success && Array.isArray(res.data.shifts)) {
        return res.data.shifts;
      }
    } catch {}
    return getLocal(SHIFTS_KEY, INITIAL_SHIFTS);
  },

  async createShift(data) {
    try {
      const res = await API.post('/employees/shifts', data);
      if (res.data?.success) return res.data;
    } catch {}
    const shifts = getLocal(SHIFTS_KEY, INITIAL_SHIFTS);
    const newShift = { _id: `shift_${Date.now()}`, ...data, isActive: true };
    shifts.push(newShift);
    setLocal(SHIFTS_KEY, shifts);
    return { success: true, shift: newShift };
  },

  async getHolidays(params = {}) {
    try {
      const res = await API.get('/employees/holidays', { params });
      if (res.data?.success && Array.isArray(res.data.holidays)) {
        return res.data.holidays;
      }
    } catch {}
    return getLocal(HOLIDAYS_KEY, INITIAL_HOLIDAYS);
  },

  async createHoliday(data) {
    try {
      const res = await API.post('/employees/holidays', data);
      if (res.data?.success) return res.data;
    } catch {}
    const holidays = getLocal(HOLIDAYS_KEY, INITIAL_HOLIDAYS);
    const newHol = { _id: `hol_${Date.now()}`, ...data, dateString: data.date };
    holidays.push(newHol);
    setLocal(HOLIDAYS_KEY, holidays);
    return { success: true, holiday: newHol };
  },

  // 6. Dashboard Metrics
  async getDashboardSummary(params = {}) {
    try {
      const res = await API.get('/employees/dashboard-summary', { params });
      if (res.data?.success && res.data.metrics) {
        return res.data.metrics;
      }
    } catch {}

    const employees = getLocal(EMPLOYEES_KEY, INITIAL_EMPLOYEES);
    const attendance = getLocal(ATTENDANCE_KEY, []);
    const tasks = getLocal(TASKS_KEY, []);
    const leaves = getLocal(LEAVES_KEY, []);

    const todayStr = toDateStr();
    const todayAtt = attendance.filter((a) => a.dateString === todayStr);

    const present = todayAtt.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const late = todayAtt.filter((a) => a.status === 'Late').length;
    const checkedIn = todayAtt.filter((a) => a.checkIn && !a.checkOut).length;
    const pendingLeaves = leaves.filter((l) => l.status === 'Pending').length;

    const inProgress = tasks.filter((t) => t.status === 'In Progress' || t.status === 'Assigned').length;
    const completed = tasks.filter((t) => t.status === 'Completed').length;
    const overdue = tasks.filter((t) => new Date(t.dueDate) < new Date() && t.status !== 'Completed').length;

    return {
      totalEmployees: employees.length,
      activeEmployees: employees.filter((e) => e.employmentStatus === 'Active').length,
      presentToday: present,
      absentToday: Math.max(0, employees.length - todayAtt.length),
      lateToday: late,
      currentlyCheckedIn: checkedIn,
      missingCheckouts: todayAtt.filter((a) => a.isMissingCheckout).length,
      pendingLeaves,
      totalTasks: tasks.length,
      inProgressTasks: inProgress,
      completedTasks: completed,
      overdueTasks: overdue,
    };
  },
};

export default employeeService;
