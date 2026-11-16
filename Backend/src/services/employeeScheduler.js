import EmployeeTask from '../models/EmployeeTask.model.js';
import Employee from '../models/Employee.model.js';
import { notifyEmployee } from './employeeCore.js';

const CLOSED = ['Completed', 'Rejected'];
const DAY = 24 * 60 * 60 * 1000;

const notifyAssignees = async (task, payload) => {
  const emps = await Employee.find({ _id: { $in: task.assignedEmployees.map((a) => a.employee) } }).select('_id brandId').lean();
  await Promise.all(emps.map((e) => notifyEmployee(e, { ...payload, link: `/employee/tasks/${task._id}`, meta: { taskId: String(task._id) } })));
};

/** Deadline reminders + overdue flags. Each notification is sent once per deadline. */
export const runTaskDeadlineSweep = async () => {
  const now = new Date();
  const overdue = await EmployeeTask.find({ status: { $nin: CLOSED }, dueDate: { $lt: now }, overdueNotified: { $ne: true } }).limit(500);
  for (const t of overdue) {
    t.isOverdue = true;
    t.overdueNotified = true;
    // eslint-disable-next-line no-await-in-loop
    await t.save();
    // eslint-disable-next-line no-await-in-loop
    await notifyAssignees(t, { type: 'task_overdue', title: `Task overdue: ${t.title}`, message: `The deadline (${t.dueDate.toISOString().slice(0, 10)}) has passed.` });
  }
  const soon = await EmployeeTask.find({
    status: { $nin: CLOSED },
    dueDate: { $gte: now, $lte: new Date(now.getTime() + DAY) },
    deadlineReminderSent: { $ne: true },
  }).limit(500);
  for (const t of soon) {
    t.deadlineReminderSent = true;
    // eslint-disable-next-line no-await-in-loop
    await t.save();
    // eslint-disable-next-line no-await-in-loop
    await notifyAssignees(t, { type: 'task_deadline', title: `Deadline approaching: ${t.title}`, message: 'This task is due within 24 hours.' });
  }
  return { overdue: overdue.length, reminders: soon.length };
};

export const startEmployeeScheduler = () => {
  const run = () => runTaskDeadlineSweep().catch((e) => console.error('[EmployeeScheduler] sweep failed:', e.message));
  setTimeout(run, 30_000).unref?.();
  setInterval(run, 15 * 60 * 1000).unref?.();
};
