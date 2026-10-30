import mongoose from 'mongoose';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import EmployeeTask from '../models/EmployeeTask.model.js';
import LeaveRequest from '../models/LeaveRequest.model.js';
import Shift from '../models/Shift.model.js';
import Holiday from '../models/Holiday.model.js';

// Helper: Format Date to YYYY-MM-DD
const toDateString = (d = new Date()) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Generate Collision-Safe Unique Employee ID
const generateEmployeeId = async (brandCode = 'EMP') => {
  const year = new Date().getFullYear();
  const count = await Employee.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  const prefix = brandCode ? brandCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) : 'EMP';
  return `${prefix}-${year}-${seq}`;
};

// Helper: Generate Unique Task ID
const generateTaskId = async () => {
  const year = new Date().getFullYear();
  const count = await EmployeeTask.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  return `TSK-${year}-${seq}`;
};

// Helper: Generate Unique Leave ID
const generateLeaveId = async () => {
  const year = new Date().getFullYear();
  const count = await LeaveRequest.countDocuments();
  const seq = String(count + 1).padStart(4, '0');
  return `LV-${year}-${seq}`;
};

// ==========================================
// 1. EMPLOYEE DIRECTORY & RECORDS
// ==========================================

const DEFAULT_SEED_EMPLOYEES = [
  {
    employeeId: 'EMP-FG-001',
    fullName: 'Aakash Sharma',
    email: 'aakash.sharma@fashiongallary.in',
    phone: '9826011223',
    designation: 'Store Manager',
    department: 'Retail Operations',
    brandId: 'brand_fg',
    brandName: 'Fashion Gallary',
    storeName: 'Indore MG Road Store',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'Morning Retail Shift (9:30 AM - 6:30 PM)',
      startTime: '09:30',
      endTime: '18:30',
      graceMinutes: 15,
    },
  },
  {
    employeeId: 'EMP-FG-002',
    fullName: 'Priya Rathore',
    email: 'priya.rathore@fashiongallary.in',
    phone: '9425022334',
    designation: 'Inventory & Dispatch Lead',
    department: 'Warehouse & Inventory',
    brandId: 'brand_fg',
    brandName: 'Fashion Gallary',
    storeName: 'Indore MG Road Store',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'General Shift (10:00 AM - 7:00 PM)',
      startTime: '10:00',
      endTime: '19:00',
      graceMinutes: 15,
    },
  },
  {
    employeeId: 'EMP-FH-001',
    fullName: 'Rohit Verma',
    email: 'rohit.verma@fashionhub.in',
    phone: '9893033445',
    designation: 'Fulfillment Associate',
    department: 'Logistics & Dispatch',
    brandId: 'brand_fh',
    brandName: 'Fashion Hub',
    storeName: 'Bhopal Dark Store #02',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'Morning Express Shift (8:00 AM - 5:00 PM)',
      startTime: '08:00',
      endTime: '17:00',
      graceMinutes: 10,
    },
  },
  {
    employeeId: 'EMP-FA-001',
    fullName: 'Sneha Patel',
    email: 'sneha.patel@fashionadda.in',
    phone: '9123455667',
    designation: 'Customer Support Executive',
    department: 'Customer Support',
    brandId: 'brand_fa',
    brandName: 'Fashion Adda',
    storeName: 'Jabalpur Hub',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'General Shift (10:00 AM - 7:00 PM)',
      startTime: '10:00',
      endTime: '19:00',
      graceMinutes: 15,
    },
  },
  {
    employeeId: 'EMP-FG-003',
    fullName: 'Vikas Soni',
    email: 'vikas.soni@fashiongallary.in',
    phone: '9827044556',
    designation: 'Billing Cashier & POS Operator',
    department: 'Retail Operations',
    brandId: 'brand_fg',
    brandName: 'Fashion Gallary',
    storeName: 'Indore MG Road Store',
    employmentType: 'Part-time',
    employmentStatus: 'Active',
    shift: {
      name: 'Evening Shift (1:00 PM - 10:00 PM)',
      startTime: '13:00',
      endTime: '22:00',
      graceMinutes: 15,
    },
  },
  {
    employeeId: 'EMP-FH-002',
    fullName: 'Amitabh Sen',
    email: 'amitabh.sen@fashionhub.in',
    phone: '9826077889',
    designation: 'Logistics & Fleet Dispatcher',
    department: 'Logistics & Dispatch',
    brandId: 'brand_fh',
    brandName: 'Fashion Hub',
    storeName: 'Bhopal Dark Store #02',
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    shift: {
      name: 'General Shift (10:00 AM - 7:00 PM)',
      startTime: '10:00',
      endTime: '19:00',
      graceMinutes: 15,
    },
  },
];

export const getEmployees = async (req, res) => {
  try {
    const { brandId, department, status, search, page = 1, limit = 50 } = req.query;

    // Ensure realistic seed staff exists if DB has fewer than 2 employees
    try {
      const currentCount = await Employee.countDocuments();
      if (currentCount < 2) {
        for (const seed of DEFAULT_SEED_EMPLOYEES) {
          const exists = await Employee.findOne({ email: seed.email });
          if (!exists) {
            await Employee.create(seed);
          }
        }
      }
    } catch (_) {}

    const query = {};

    // Scoped brand filter
    const activeBrandId = (req.scope && !req.scope.isAll) ? req.scope.brandId : (brandId && brandId !== 'ALL' ? brandId : null);
    if (activeBrandId) {
      query.brandId = activeBrandId;
    }

    if (department && department !== 'ALL') {
      query.department = department;
    }

    if (status && status !== 'ALL') {
      query.employmentStatus = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fullName: regex },
        { employeeId: regex },
        { email: regex },
        { phone: regex },
        { designation: regex },
      ];
    }

    const total = await Employee.countDocuments(query);
    const employees = await Employee.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      employees,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id).lean();

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    // Also fetch recent 30 days attendance and pending tasks
    const [recentAttendance, activeTasks, recentLeaves] = await Promise.all([
      Attendance.find({ employee: id }).sort({ date: -1 }).limit(30).lean(),
      EmployeeTask.find({
        'assignedEmployees.employee': id,
        status: { $in: ['To Do', 'Assigned', 'In Progress', 'Submitted for Review'] },
      })
        .sort({ dueDate: 1 })
        .limit(10)
        .lean(),
      LeaveRequest.find({ employee: id }).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return res.status(200).json({
      success: true,
      employee: {
        ...employee,
        recentAttendance,
        activeTasks,
        recentLeaves,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      designation,
      department,
      brandId,
      brandName,
      storeId,
      storeName,
      employmentType,
      shift,
      emergencyContact,
      notes,
    } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and phone number are required.',
      });
    }

    // Check duplicate email
    const existing = await Employee.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `An employee with email "${email}" already exists (Employee ID: ${existing.employeeId}).`,
      });
    }

    const employeeId = await generateEmployeeId(brandId);

    const newEmp = new Employee({
      employeeId,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      designation: designation || 'Associate',
      department: department || 'Operations',
      brandId: brandId || 'brand_fg',
      brandName: brandName || 'Fashion Gallary',
      storeId: storeId || '',
      storeName: storeName || 'Central Store',
      employmentType: employmentType || 'Full-time',
      employmentStatus: 'Active',
      shift: shift || {
        name: 'Standard General Shift (9 AM - 6 PM)',
        startTime: '09:00',
        endTime: '18:00',
      },
      emergencyContact: emergencyContact || {},
      notes: notes || '',
    });

    await newEmp.save();

    return res.status(201).json({
      success: true,
      message: `Employee "${newEmp.fullName}" created successfully with ID ${newEmp.employeeId}.`,
      employee: newEmp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.employeeId; // Immutable ID

    const updated = await Employee.findByIdAndUpdate(id, updates, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Employee record updated successfully.',
      employee: updated,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const toggleEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const emp = await Employee.findById(id);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    emp.employmentStatus = status || (emp.employmentStatus === 'Active' ? 'Inactive' : 'Active');
    await emp.save();

    return res.status(200).json({
      success: true,
      message: `Employee status changed to ${emp.employmentStatus}.`,
      employee: emp,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 2. ATTENDANCE TRACKING & CHECK-IN/OUT
// ==========================================

export const getAttendanceRecords = async (req, res) => {
  try {
    const {
      date,
      startDate,
      endDate,
      brandId,
      department,
      status,
      employeeId,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (date) {
      query.dateString = date;
    } else if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    } else {
      // Default to today
      query.dateString = toDateString();
    }

    if (brandId && brandId !== 'ALL') {
      query.brandId = brandId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ employeeName: regex }, { employeeId: regex }];
    }

    const total = await Attendance.countDocuments(query);
    const records = await Attendance.find(query)
      .populate('employee', 'fullName employeeId department designation avatar phone')
      .sort({ checkIn: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      records,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const checkIn = async (req, res) => {
  try {
    const { employeeId, source = 'Web', location = {} } = req.body;

    const emp = await Employee.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(employeeId) ? employeeId : null },
        { employeeId: employeeId },
      ],
    });

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    if (emp.employmentStatus !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `Employee is currently marked as ${emp.employmentStatus}. Cannot check in.`,
      });
    }

    const todayStr = toDateString();
    const now = new Date();

    // Check if duplicate check-in exists for today
    let attendance = await Attendance.findOne({
      employee: emp._id,
      dateString: todayStr,
    });

    if (attendance && attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: `Already checked in today at ${new Date(attendance.checkIn).toLocaleTimeString('en-IN')}.`,
        record: attendance,
      });
    }

    // Determine shift start time and late calculation
    const shiftStartTime = emp.shift?.startTime || '09:00';
    const [shiftHour, shiftMinute] = shiftStartTime.split(':').map(Number);

    const shiftStartDate = new Date(now);
    shiftStartDate.setHours(shiftHour, shiftMinute, 0, 0);

    const graceMins = emp.shift?.graceMinutes || 15;
    const diffMinutes = Math.round((now.getTime() - shiftStartDate.getTime()) / 60000);

    let lateMinutes = 0;
    let initialStatus = 'Present';

    if (diffMinutes > graceMins) {
      lateMinutes = diffMinutes;
      initialStatus = 'Late';
    }

    if (!attendance) {
      attendance = new Attendance({
        employee: emp._id,
        employeeId: emp.employeeId,
        employeeName: emp.fullName,
        brandId: emp.brandId,
        storeId: emp.storeId,
        date: new Date(todayStr),
        dateString: todayStr,
        shift: emp.shift,
        checkIn: now,
        checkInSource: source,
        checkInLocation: location,
        status: initialStatus,
        lateMinutes,
        isMissingCheckout: true,
      });
    } else {
      attendance.checkIn = now;
      attendance.checkInSource = source;
      attendance.checkInLocation = location;
      attendance.status = initialStatus;
      attendance.lateMinutes = lateMinutes;
      attendance.isMissingCheckout = true;
    }

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: `Checked in successfully at ${now.toLocaleTimeString('en-IN')}.${lateMinutes > 0 ? ` (Late by ${lateMinutes} mins)` : ''}`,
      record: attendance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const checkOut = async (req, res) => {
  try {
    const { employeeId, source = 'Web', location = {} } = req.body;

    const emp = await Employee.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(employeeId) ? employeeId : null },
        { employeeId: employeeId },
      ],
    });

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const todayStr = toDateString();
    const now = new Date();

    const attendance = await Attendance.findOne({
      employee: emp._id,
      dateString: todayStr,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in record found for today. Please check in first.',
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: `Already checked out today at ${new Date(attendance.checkOut).toLocaleTimeString('en-IN')}.`,
        record: attendance,
      });
    }

    // Calculate duration
    const workedMinutes = Math.round((now.getTime() - new Date(attendance.checkIn).getTime()) / 60000);
    const halfDayThreshold = emp.shift?.halfDayMinutes || 240; // 4 hours

    attendance.checkOut = now;
    attendance.checkOutSource = source;
    attendance.checkOutLocation = location;
    attendance.totalDurationMinutes = workedMinutes;
    attendance.isMissingCheckout = false;

    // If worked duration is less than half day threshold, mark as Half Day
    if (workedMinutes < halfDayThreshold && attendance.status !== 'On Leave') {
      attendance.status = 'Half Day';
    }

    await attendance.save();

    const hours = Math.floor(workedMinutes / 60);
    const mins = workedMinutes % 60;

    return res.status(200).json({
      success: true,
      message: `Checked out successfully at ${now.toLocaleTimeString('en-IN')}. Total duration: ${hours}h ${mins}m.`,
      record: attendance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const requestOrApproveCorrection = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, status, reason } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    // Save historical snapshot in correction audit trail
    attendance.correction = {
      isCorrected: true,
      originalCheckIn: attendance.checkIn,
      originalCheckOut: attendance.checkOut,
      originalStatus: attendance.status,
      reason: reason || 'Administrative correction',
      requestedBy: {
        id: req.user?._id || null,
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'super_admin',
      },
      approvedBy: {
        id: req.user?._id || null,
        name: req.user?.name || 'Administrator',
        role: req.user?.role || 'super_admin',
      },
      correctedAt: new Date(),
    };

    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
    if (status) attendance.status = status;

    if (attendance.checkIn && attendance.checkOut) {
      attendance.totalDurationMinutes = Math.round(
        (new Date(attendance.checkOut) - new Date(attendance.checkIn)) / 60000
      );
      attendance.isMissingCheckout = false;
    }

    await attendance.save();

    return res.status(200).json({
      success: true,
      message: 'Attendance record corrected and audited successfully.',
      record: attendance,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 3. TASK MANAGEMENT & WORKFLOW
// ==========================================

export const getTasks = async (req, res) => {
  try {
    const { brandId, status, priority, employeeId, search, page = 1, limit = 50 } = req.query;

    const query = {};

    if (brandId && brandId !== 'ALL') {
      query.brandId = brandId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }

    if (employeeId) {
      query['assignedEmployees.employee'] = employeeId;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { taskId: regex }, { category: regex }];
    }

    const total = await EmployeeTask.countDocuments(query);
    const tasks = await EmployeeTask.find(query)
      .sort({ dueDate: 1, priority: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      tasks,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      brandId,
      brandName,
      storeId,
      department,
      category,
      assignedEmployeeIds = [],
      priority,
      startDate,
      dueDate,
      subtasks = [],
    } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Task title and due date are required.' });
    }

    // Look up assigned employees
    let assigned = [];
    if (assignedEmployeeIds.length > 0) {
      const emps = await Employee.find({ _id: { $in: assignedEmployeeIds } }).select(
        '_id employeeId fullName designation avatar'
      );
      assigned = emps.map((e) => ({
        employee: e._id,
        employeeId: e.employeeId,
        name: e.fullName,
        designation: e.designation,
        avatar: e.avatar,
      }));
    }

    const taskId = await generateTaskId();

    const task = new EmployeeTask({
      taskId,
      title: title.trim(),
      description: description || '',
      brandId: brandId || 'brand_fg',
      brandName: brandName || 'Fashion Gallary',
      storeId: storeId || '',
      department: department || 'Operations',
      category: category || 'Store Operations',
      assignedEmployees: assigned,
      createdBy: {
        id: req.user?._id || null,
        name: req.user?.name || 'Super Admin',
        role: req.user?.role || 'super_admin',
      },
      priority: priority || 'Medium',
      startDate: startDate ? new Date(startDate) : new Date(),
      dueDate: new Date(dueDate),
      status: assigned.length > 0 ? 'Assigned' : 'To Do',
      subtasks: subtasks.map((st, i) => ({
        id: `sub_${Date.now()}_${i}`,
        title: typeof st === 'string' ? st : st.title,
        isCompleted: false,
      })),
    });

    await task.save();

    return res.status(201).json({
      success: true,
      message: `Task "${task.title}" created with ID ${task.taskId}.`,
      task,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completionNotes, progressPercent } = req.body;

    const task = await EmployeeTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    task.status = status;
    if (progressPercent !== undefined) {
      task.progressPercent = Number(progressPercent);
    }

    if (status === 'Completed') {
      task.progressPercent = 100;
      task.completedAt = new Date();
      if (completionNotes) task.completionNotes = completionNotes;
    }

    await task.save();

    return res.status(200).json({
      success: true,
      message: `Task status updated to "${status}".`,
      task,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const addTaskComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
    }

    const task = await EmployeeTask.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    task.comments.push({
      id: `comm_${Date.now()}`,
      authorName: req.user?.name || 'Administrator',
      authorRole: req.user?.role || 'admin',
      text: text.trim(),
      createdAt: new Date(),
    });

    await task.save();

    return res.status(200).json({
      success: true,
      message: 'Comment added.',
      comments: task.comments,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 4. LEAVE MANAGEMENT & APPROVALS
// ==========================================

export const getLeaveRequests = async (req, res) => {
  try {
    const { brandId, status, employeeId, page = 1, limit = 50 } = req.query;

    const query = {};

    if (brandId && brandId !== 'ALL') {
      query.brandId = brandId;
    }

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (employeeId) {
      query.employee = employeeId;
    }

    const total = await LeaveRequest.countDocuments(query);
    const leaves = await LeaveRequest.find(query)
      .populate('employee', 'fullName employeeId department designation avatar')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      leaves,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const submitLeaveRequest = async (req, res) => {
  try {
    const { employeeId, leaveType, startDate, endDate, isHalfDay, halfDayType, reason } = req.body;

    if (!employeeId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID, start date, end date, and reason are required.',
      });
    }

    const emp = await Employee.findById(employeeId);
    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
    }

    const totalDays = isHalfDay
      ? 0.5
      : Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leaveId = await generateLeaveId();

    const leave = new LeaveRequest({
      leaveId,
      employee: emp._id,
      employeeId: emp.employeeId,
      employeeName: emp.fullName,
      brandId: emp.brandId,
      department: emp.department,
      leaveType: leaveType || 'Casual Leave',
      startDate: start,
      endDate: end,
      isHalfDay: !!isHalfDay,
      halfDayType: halfDayType || 'None',
      totalDays,
      reason: reason.trim(),
      status: 'Pending',
    });

    await leave.save();

    return res.status(201).json({
      success: true,
      message: `Leave request ${leave.leaveId} submitted for approval.`,
      leave,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const reviewLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body; // 'Approved' | 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected.' });
    }

    const leave = await LeaveRequest.findById(id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    leave.status = status;
    leave.reviewedBy = {
      id: req.user?._id || null,
      name: req.user?.name || 'Administrator',
      role: req.user?.role || 'super_admin',
      notes: notes || '',
      reviewedAt: new Date(),
    };

    await leave.save();

    // If approved, mark employee's status as 'On Leave' if current date falls within range
    if (status === 'Approved') {
      const today = new Date();
      if (today >= leave.startDate && today <= leave.endDate) {
        await Employee.findByIdAndUpdate(leave.employee, { employmentStatus: 'On Leave' });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Leave request ${leave.leaveId} has been ${status}.`,
      leave,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 5. SHIFTS & HOLIDAYS MANAGEMENT
// ==========================================

export const getShifts = async (req, res) => {
  try {
    const { brandId } = req.query;
    const query = { isActive: true };
    if (brandId && brandId !== 'ALL') {
      query.$or = [{ brandId }, { brandId: 'ALL' }];
    }
    const shifts = await Shift.find(query).sort({ startTime: 1 }).lean();
    return res.status(200).json({ success: true, shifts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createShift = async (req, res) => {
  try {
    const { name, brandId, startTime, endTime, isOvernight, graceMinutes, weeklyOffs } = req.body;
    if (!name || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'Shift name, start time, and end time are required.' });
    }

    const shift = new Shift({
      name: name.trim(),
      brandId: brandId || 'ALL',
      startTime,
      endTime,
      isOvernight: !!isOvernight,
      graceMinutes: Number(graceMinutes) || 15,
      weeklyOffs: weeklyOffs || ['Sunday'],
    });

    await shift.save();
    return res.status(201).json({ success: true, message: 'Shift created successfully.', shift });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getHolidays = async (req, res) => {
  try {
    const { brandId, year } = req.query;
    const currentYear = year || new Date().getFullYear();
    const query = {
      dateString: new RegExp(`^${currentYear}-`),
    };
    if (brandId && brandId !== 'ALL') {
      query.$or = [{ brandId }, { brandId: 'ALL' }];
    }
    const holidays = await Holiday.find(query).sort({ date: 1 }).lean();
    return res.status(200).json({ success: true, holidays });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const createHoliday = async (req, res) => {
  try {
    const { name, date, brandId, isOptional, description } = req.body;
    if (!name || !date) {
      return res.status(400).json({ success: false, message: 'Holiday name and date are required.' });
    }

    const d = new Date(date);
    const dateString = toDateString(d);

    const holiday = new Holiday({
      name: name.trim(),
      date: d,
      dateString,
      brandId: brandId || 'ALL',
      isOptional: !!isOptional,
      description: description || '',
    });

    await holiday.save();
    return res.status(201).json({ success: true, message: 'Holiday added successfully.', holiday });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// 6. DASHBOARD METRICS & SUMMARY
// ==========================================

export const getEmployeeDashboardSummary = async (req, res) => {
  try {
    const { brandId } = req.query;
    const filter = {};
    if (brandId && brandId !== 'ALL') {
      filter.brandId = brandId;
    }

    const todayStr = toDateString();

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      pendingLeaves,
      tasksMetrics,
    ] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.countDocuments({ ...filter, employmentStatus: 'Active' }),
      Attendance.find({ ...filter, dateString: todayStr }).select('status checkIn checkOut isMissingCheckout'),
      LeaveRequest.countDocuments({ ...filter, status: 'Pending' }),
      EmployeeTask.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const presentToday = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'Late').length;
    const lateToday = todayAttendance.filter((a) => a.status === 'Late').length;
    const currentlyCheckedIn = todayAttendance.filter((a) => a.checkIn && !a.checkOut).length;
    const missingCheckouts = todayAttendance.filter((a) => a.isMissingCheckout).length;
    const absentToday = Math.max(0, activeEmployees - todayAttendance.length);

    const taskCounts = tasksMetrics.reduce((acc, t) => {
      acc[t._id] = t.count;
      return acc;
    }, {});

    const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0);
    const inProgressTasks = (taskCounts['In Progress'] || 0) + (taskCounts['Assigned'] || 0);
    const completedTasks = taskCounts['Completed'] || 0;
    const overdueTasks = await EmployeeTask.countDocuments({
      ...filter,
      dueDate: { $lt: new Date() },
      status: { $ne: 'Completed' },
    });

    return res.status(200).json({
      success: true,
      metrics: {
        totalEmployees,
        activeEmployees,
        presentToday,
        absentToday,
        lateToday,
        currentlyCheckedIn,
        missingCheckouts,
        pendingLeaves,
        totalTasks,
        inProgressTasks,
        completedTasks,
        overdueTasks,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
