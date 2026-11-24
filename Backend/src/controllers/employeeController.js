import mongoose from 'mongoose';
import Employee from '../models/Employee.model.js';
import Attendance from '../models/Attendance.model.js';
import EmployeeTask from '../models/EmployeeTask.model.js';
import LeaveRequest from '../models/LeaveRequest.model.js';
import Shift from '../models/Shift.model.js';
import Holiday from '../models/Holiday.model.js';
import Brand from '../models/Brand.model.js';
import { parseTaskDate } from '../utils/taskDates.js';
import bcrypt from 'bcryptjs';
import {
  actorFromReq,
  escapeRegex,
  generateEmployeeCode,
  generateTaskCode,
  generateLeaveCode,
  getRules,
  istDateString,
  istMinutesOfDay,
  logActivity,
  notifyEmployee,
  parseHHmm,
} from '../services/employeeCore.js';
import { correctAttendance, decideLeave } from './employeeAdminController.js';

// Brand check for by-id access (IDOR protection). Consolidated scope (isAll) sees every brand;
// otherwise the record must belong to the validated brand. Callers answer 404 on failure.
const inBrand = (req, doc) => !req.scope || req.scope.isAll || (doc && doc.brandId === req.scope.brandId);

// Helper: YYYY-MM-DD in the business timezone (Asia/Kolkata), never the server's local time
const toDateString = (d = new Date()) => istDateString(d);

const generateEmployeeId = () => generateEmployeeCode();
const generateTaskId = () => generateTaskCode();
const generateLeaveId = () => generateLeaveCode();

// ==========================================
// 1. EMPLOYEE DIRECTORY & RECORDS
// ==========================================

export const getEmployees = async (req, res) => {
  try {
    const { brandId, department, status, search, page = 1 } = req.query;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    // Pending / rejected self-registrations live in the Registration Requests list.
    const query = { registrationStatus: { $nin: ['Pending', 'Rejected'] } };

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
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
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

    if (!employee || !inBrand(req, employee)) {
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
      storeId,
      storeName,
      employmentType,
      shift,
      emergencyContact,
      notes,
      password,
      gender,
      address,
      city,
    } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, and phone number are required.',
      });
    }

    // The brand must be a real, active brand; its name always comes from the brand record.
    const brand = brandId ? await Brand.findOne({ brandId }).select('brandId name').lean() : null;
    if (!brand) {
      return res.status(400).json({ success: false, message: 'Select a valid brand for this employee.' });
    }
    if (!inBrand(req, { brandId: brand.brandId })) {
      return res.status(404).json({ success: false, message: 'Brand not found.' });
    }

    if (password !== undefined && password !== '' && !/^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(String(password))) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters and include a letter and a number.' });
    }

    // Check duplicate email
    const existing = await Employee.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `An employee with email "${email}" already exists (Employee ID: ${existing.employeeId}).`,
      });
    }

    const employeeId = await generateEmployeeId();

    const newEmp = new Employee({
      employeeId,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: String(phone).trim(),
      designation: designation || 'Associate',
      department: department || 'Operations',
      brandId: brand.brandId,
      brandName: brand.name,
      storeId: storeId || '',
      storeName: storeName || '',
      employmentType: employmentType || 'Full-time',
      employmentStatus: 'Active',
      registrationStatus: 'Approved',
      registrationSource: 'admin',
      activatedAt: new Date(),
      gender: ['Male', 'Female', 'Other'].includes(gender) ? gender : '',
      address: address || '',
      city: city || '',
      password: password ? await bcrypt.hash(String(password), 10) : '',
      shift: shift || {
        name: 'Standard General Shift (9 AM - 6 PM)',
        startTime: '09:00',
        endTime: '18:00',
      },
      emergencyContact: emergencyContact || {},
      notes: notes || '',
    });

    await newEmp.save();
    await logActivity({ action: 'employee_created', actor: actorFromReq(req), employee: newEmp, entity: 'Employee', entityId: newEmp._id });

    const out = newEmp.toObject();
    delete out.password;
    return res.status(201).json({
      success: true,
      message: `Employee "${newEmp.fullName}" created successfully with ID ${newEmp.employeeId}.`,
      employee: out,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Fields an admin may change through the edit form. Credentials, status, approval and brand are NOT here:
// they have dedicated, audited endpoints.
const EDITABLE_EMPLOYEE_FIELDS = [
  'fullName', 'phone', 'designation', 'department', 'storeId', 'storeName', 'employmentType', 'shift',
  'emergencyContact', 'notes', 'avatar', 'gender', 'dateOfBirth', 'address', 'city', 'joiningDate', 'reportingManager',
];

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const current = await Employee.findById(id);
    if (!current || !inBrand(req, current)) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const updates = {};
    for (const key of EDITABLE_EMPLOYEE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.phone !== undefined) updates.phone = String(updates.phone).replace(/\D/g, '').slice(-10);
    if (updates.phone !== undefined && updates.phone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Enter a valid 10-digit mobile number.' });
    }

    const before = {};
    for (const k of Object.keys(updates)) before[k] = current[k];
    current.set(updates);
    await current.save();
    await logActivity({ action: 'employee_updated', actor: actorFromReq(req), employee: current, entity: 'Employee', entityId: current._id, details: { fields: Object.keys(updates) } });

    const out = current.toObject();
    delete out.password;
    return res.status(200).json({
      success: true,
      message: 'Employee record updated successfully.',
      employee: out,
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
    if (!emp || !inBrand(req, emp)) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    if ((emp.registrationStatus || 'Approved') !== 'Approved') {
      return res.status(409).json({ success: false, message: 'Approve the registration before changing this employee\'s status.' });
    }
    if (status !== undefined && !['Active', 'Inactive', 'On Leave', 'Terminated'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const previous = emp.employmentStatus;
    emp.employmentStatus = status || (emp.employmentStatus === 'Active' ? 'Inactive' : 'Active');
    // Deactivating signs the employee out of every device immediately.
    if (['Inactive', 'Terminated'].includes(emp.employmentStatus)) emp.tokenVersion = (emp.tokenVersion || 0) + 1;
    await emp.save();
    await logActivity({ action: 'employee_status_changed', actor: actorFromReq(req), employee: emp, entity: 'Employee', entityId: emp._id, details: { from: previous, to: emp.employmentStatus } });

    const out = emp.toObject();
    delete out.password;
    return res.status(200).json({
      success: true,
      message: `Employee status changed to ${emp.employmentStatus}.`,
      employee: out,
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
    if (emp && !inBrand(req, emp)) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

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

    // Late calculation uses the configured office rules, in Asia/Kolkata time
    const rules = await getRules(emp.brandId);
    const diffMinutes = istMinutesOfDay(now) - parseHHmm(rules.officeStartTime, 570);
    const graceMins = Number(rules.graceMinutes) || 0;

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
    if (emp && !inBrand(req, emp)) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

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

// Manual corrections are audited (reason + before/after history) in the shared handler.
export const requestOrApproveCorrection = correctAttendance;

// ==========================================
// 3. TASK MANAGEMENT & WORKFLOW
// ==========================================

export const getTasks = async (req, res) => {
  try {
    const { brandId, status, priority, employeeId, search, page = 1 } = req.query;
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

    const query = {};

    if (brandId && brandId !== 'ALL') {
      query.brandId = brandId;
    }

    if (status === 'Overdue') {
      query.status = { $nin: ['Completed', 'Rejected'] };
      query.dueDate = { $lt: new Date() };
    } else if (status && status !== 'ALL') {
      query.status = status;
    }

    if (priority && priority !== 'ALL') {
      query.priority = priority;
    }

    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query['assignedEmployees.employee'] = employeeId;
    }

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [{ title: regex }, { taskId: regex }, { category: regex }];
    }

    const total = await EmployeeTask.countDocuments(query);
    const tasks = await EmployeeTask.find(query)
      .sort({ dueDate: 1, priority: -1 })
      .skip((Number(page) - 1) * limit)
      .limit(limit)
      .lean();

    const now = new Date();
    return res.status(200).json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      tasks: tasks.map((t) => ({ ...t, isOverdue: !['Completed', 'Rejected'].includes(t.status) && new Date(t.dueDate) < now })),
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
      storeId,
      department,
      category,
      assignedEmployeeIds = [],
      assignedDepartment = '',
      priority,
      startDate,
      dueDate,
      subtasks = [],
      attachments = [],
    } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ success: false, message: 'Task title and due date are required.' });
    }
    const due = parseTaskDate(dueDate, { endOfDay: true });
    if (Number.isNaN(due.getTime())) return res.status(400).json({ success: false, message: 'Enter a valid due date.' });
    const start = startDate ? parseTaskDate(startDate) : new Date();
    if (Number.isNaN(start.getTime())) return res.status(400).json({ success: false, message: 'Enter a valid date for when the task is given.' });
    if (start > due) return res.status(400).json({ success: false, message: 'The due date must be on or after the date the task is given.' });
    if (priority && !['Low', 'Medium', 'High', 'Urgent'].includes(priority)) return res.status(400).json({ success: false, message: 'Invalid priority.' });

    const brand = brandId ? await Brand.findOne({ brandId }).select('brandId name').lean() : null;
    if (!brand || !inBrand(req, { brandId: brand.brandId })) {
      return res.status(400).json({ success: false, message: 'Select a valid brand for this task.' });
    }

    // Assignees must be approved, active employees of THIS brand (ids from the client are never trusted on their own).
    const ids = (Array.isArray(assignedEmployeeIds) ? assignedEmployeeIds : []).filter((i) => mongoose.Types.ObjectId.isValid(i));
    const eligible = { brandId: brand.brandId, registrationStatus: { $ne: 'Pending' }, employmentStatus: { $in: ['Active', 'On Leave'] } };
    const orClauses = [];
    if (ids.length) orClauses.push({ _id: { $in: ids } });
    if (assignedDepartment) orClauses.push({ department: String(assignedDepartment) });
    let assigned = [];
    if (orClauses.length) {
      const emps = await Employee.find({ ...eligible, $or: orClauses }).select('_id employeeId fullName designation avatar brandId');
      assigned = emps.map((e) => ({ employee: e._id, employeeId: e.employeeId, name: e.fullName, designation: e.designation, avatar: e.avatar }));
      if (ids.length && !assigned.length) return res.status(400).json({ success: false, message: 'None of the selected employees belong to this brand.' });
    }

    const taskId = await generateTaskId();
    const actor = actorFromReq(req);

    const task = new EmployeeTask({
      taskId,
      title: title.trim(),
      description: description || '',
      brandId: brand.brandId,
      brandName: brand.name,
      storeId: storeId || '',
      department: department || assignedDepartment || 'Operations',
      assignedDepartment: assignedDepartment || '',
      category: category || 'Store Operations',
      assignedEmployees: assigned,
      createdBy: { id: actor.id, name: actor.name || 'Admin', role: actor.type },
      priority: priority || 'Medium',
      startDate: start,
      dueDate: due,
      status: assigned.length > 0 ? 'Assigned' : 'To Do',
      attachments: (Array.isArray(attachments) ? attachments : [])
        .slice(0, 10)
        .map((a) => ({ name: String(a?.name || 'Attachment').slice(0, 150), url: String(a?.url || '') }))
        .filter((a) => /^(https?:\/\/|\/uploads\/)/i.test(a.url)),
      subtasks: subtasks.map((st, i) => ({
        id: `sub_${Date.now()}_${i}`,
        title: typeof st === 'string' ? st : st.title,
        isCompleted: false,
      })),
    });

    await task.save();
    await Promise.all(
      assigned.map((a) =>
        notifyEmployee({ _id: a.employee, brandId: brand.brandId }, {
          type: 'task_assigned',
          title: `New task: ${task.title}`,
          message: `Priority ${task.priority}. Due ${due.toISOString().slice(0, 10)}.`,
          link: `/employee/tasks/${task._id}`,
          meta: { taskId: String(task._id) },
        })
      )
    );
    await logActivity({ action: 'task_created', actor, brandId: brand.brandId, entity: 'EmployeeTask', entityId: task._id, details: { taskId, assigned: assigned.length } });

    return res.status(201).json({
      success: true,
      message: `Task "${task.title}" created with ID ${task.taskId}.`,
      task,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/employees/tasks/bulk  { tasks: [ {...same fields as one task...}, ... ] }
// Every task goes through createTask, so the rules (brand, assignees, dates, notifications) are identical. Each task
// succeeds or fails on its own and the answer lists the outcome per task, so a typo in one row never blocks the rest.
const runCreateTask = (req, body) =>
  new Promise((resolve) => {
    const sub = Object.create(req);
    sub.body = body;
    const out = { code: 200 };
    const fakeRes = {
      status(code) { out.code = code; return this; },
      json(payload) { resolve({ status: out.code, ...payload }); return this; },
    };
    createTask(sub, fakeRes).catch((err) => resolve({ status: 500, success: false, message: err.message }));
  });

export const createTasksBulk = async (req, res) => {
  try {
    const list = Array.isArray(req.body?.tasks) ? req.body.tasks : [];
    if (!list.length) return res.status(400).json({ success: false, message: 'Add at least one task.' });
    if (list.length > 50) return res.status(400).json({ success: false, message: 'You can create at most 50 tasks at a time.' });
    const results = [];
    for (let i = 0; i < list.length; i += 1) {
      const row = list[i] && typeof list[i] === 'object' ? list[i] : {};
      const r = await runCreateTask(req, row);
      const ok = r.status === 201 && r.success;
      results.push({ index: i, success: ok, message: ok ? '' : r.message || 'Could not create this task.', task: ok ? { _id: r.task._id, taskId: r.task.taskId, title: r.task.title } : undefined });
    }
    const created = results.filter((r) => r.success).length;
    return res.status(created === list.length ? 201 : 200).json({
      success: created > 0,
      created,
      failed: list.length - created,
      message: created === list.length ? `${created} task${created === 1 ? '' : 's'} created.` : created ? `${created} of ${list.length} tasks created; ${list.length - created} need fixing.` : 'No tasks were created.',
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const ADMIN_TASK_STATUSES = ['To Do', 'Assigned', 'In Progress', 'Blocked', 'Submitted for Review', 'Completed', 'Reopened', 'Pending', 'Rejected'];

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, completionNotes, progressPercent } = req.body;

    const task = await EmployeeTask.findById(id);
    if (!task || !inBrand(req, task)) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    if (!ADMIN_TASK_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid task status.' });
    }

    const previous = task.status;
    task.status = status;
    if (progressPercent !== undefined) {
      task.progressPercent = Math.min(100, Math.max(0, Number(progressPercent) || 0));
    }

    if (status === 'Completed') {
      task.progressPercent = 100;
      task.completedAt = new Date();
      if (completionNotes) task.completionNotes = completionNotes;
    }

    await task.save();
    await logActivity({ action: 'task_status_changed', actor: actorFromReq(req), brandId: task.brandId, entity: 'EmployeeTask', entityId: task._id, details: { from: previous, to: status } });

    return res.status(200).json({
      success: true,
      message: `Task status updated to "${status}".`,
      task,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Edit task details (admins only; assignment changes notify the new assignees).
export const updateTask = async (req, res) => {
  try {
    const task = await EmployeeTask.findById(req.params.id);
    if (!task || !inBrand(req, task)) return res.status(404).json({ success: false, message: 'Task not found.' });
    const b = req.body || {};
    if (b.title !== undefined) task.title = String(b.title).trim().slice(0, 200) || task.title;
    if (b.description !== undefined) task.description = String(b.description).slice(0, 5000);
    if (b.category !== undefined) task.category = b.category;
    if (['Low', 'Medium', 'High', 'Urgent'].includes(b.priority)) task.priority = b.priority;
    if (b.dueDate) {
      const d = parseTaskDate(b.dueDate, { endOfDay: true });
      if (!Number.isNaN(d.getTime())) {
        task.dueDate = d;
        task.overdueNotified = false;
        task.deadlineReminderSent = false;
      }
    }
    if (Array.isArray(b.assignedEmployeeIds)) {
      const ids = b.assignedEmployeeIds.filter((i) => mongoose.Types.ObjectId.isValid(i));
      const emps = await Employee.find({ _id: { $in: ids }, brandId: task.brandId, registrationStatus: { $ne: 'Pending' }, employmentStatus: { $in: ['Active', 'On Leave'] } }).select('_id employeeId fullName designation avatar brandId');
      const had = new Set(task.assignedEmployees.map((a) => String(a.employee)));
      task.assignedEmployees = emps.map((e) => ({ employee: e._id, employeeId: e.employeeId, name: e.fullName, designation: e.designation, avatar: e.avatar }));
      await task.save();
      await Promise.all(emps.filter((e) => !had.has(String(e._id))).map((e) => notifyEmployee(e, { type: 'task_assigned', title: `New task: ${task.title}`, link: `/employee/tasks/${task._id}` })));
    } else {
      await task.save();
    }
    await logActivity({ action: 'task_updated', actor: actorFromReq(req), brandId: task.brandId, entity: 'EmployeeTask', entityId: task._id });
    return res.status(200).json({ success: true, task });
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
    if (!task || !inBrand(req, task)) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    task.comments.push({
      id: `comm_${Date.now()}`,
      authorName: req.user?.name || 'Administrator',
      authorRole: req.user?.role || 'admin',
      text: text.trim().slice(0, 2000),
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

    const emp = mongoose.Types.ObjectId.isValid(employeeId) ? await Employee.findById(employeeId) : null;
    if (!emp || !inBrand(req, emp)) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, message: 'End date cannot be earlier than start date.' });
    }

    const overlap = await LeaveRequest.findOne({
      employee: emp._id,
      status: { $in: ['Pending', 'Approved'] },
      startDate: { $lte: end },
      endDate: { $gte: start },
    }).lean();
    if (overlap) {
      return res.status(409).json({ success: false, message: `A ${overlap.status.toLowerCase()} leave (${overlap.leaveId}) already covers these dates.` });
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
      reason: String(reason).trim().slice(0, 1000),
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

// Approval/rejection now lives in the shared handler: it writes the matching attendance rows,
// blocks conflicts with days already worked, notifies the employee and logs the action.
export const reviewLeaveRequest = decideLeave;

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
