import React, { useState } from 'react';
import { useEmployee } from '../context/EmployeeContext';
import { EmployeeHeader } from '../components/EmployeeHeader';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  AlertTriangle,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  X,
  Layers,
  List,
  Kanban,
  Send,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

const CATEGORIES = [
  'Store Operations',
  'Inventory Audit',
  'Order Dispatch',
  'Customer Support',
  'Merchandising',
  'Maintenance',
  'Administrative',
  'Other',
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const EmployeeTasksPage = ({ onNavigate }) => {
  const {
    tasks,
    employees,
    allEmployees,
    activeBrandId,
    handleCreateTask,
    handleUpdateTaskStatus,
    handleAddComment,
  } = useEmployee();

  const [viewMode, setViewMode] = useState('KANBAN'); // 'KANBAN' | 'LIST'
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  // New Task Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Store Operations');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assignedStaffList, setAssignedStaffList] = useState([]);
  const [subtasksList, setSubtasksList] = useState(['']);

  // Comprehensive active staff list (current brand staff + cross-brand staff + standard team members)
  const availableStaff = React.useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Employees from current brand & all brands
    const combined = [...(employees || []), ...(allEmployees || [])];
    combined.forEach((emp) => {
      const id = emp._id || emp.employeeId || emp.email;
      if (emp && id && !seen.has(id)) {
        seen.add(id);
        list.push({
          _id: id,
          employeeId: emp.employeeId || 'EMP',
          fullName: emp.fullName || emp.name,
          designation: emp.designation || 'Staff',
          department: emp.department || 'Operations',
          brandName:
            emp.brandName ||
            (emp.brandId === 'brand_fg'
              ? 'Fashion Gallary'
              : emp.brandId === 'brand_fh'
              ? 'Fashion Hub'
              : emp.brandId === 'brand_fa'
              ? 'Fashion Adda'
              : 'Corporate'),
        });
      }
    });

    // 2. Fallback organization staff so user can ALWAYS assign to any department / role
    const FALLBACK_STAFF = [
      { _id: 'seed_aakash', employeeId: 'EMP-FG-001', fullName: 'Aakash Sharma', designation: 'Store Manager', department: 'Retail Operations', brandName: 'Fashion Gallary' },
      { _id: 'seed_priya', employeeId: 'EMP-FG-002', fullName: 'Priya Rathore', designation: 'Inventory & Dispatch Lead', department: 'Warehouse & Inventory', brandName: 'Fashion Gallary' },
      { _id: 'seed_rohit', employeeId: 'EMP-FH-001', fullName: 'Rohit Verma', designation: 'Fulfillment Associate', department: 'Logistics & Dispatch', brandName: 'Fashion Hub' },
      { _id: 'seed_sneha', employeeId: 'EMP-FA-001', fullName: 'Sneha Patel', designation: 'Customer Support Executive', department: 'Customer Support', brandName: 'Fashion Adda' },
      { _id: 'seed_vikas', employeeId: 'EMP-FG-003', fullName: 'Vikas Soni', designation: 'Billing Cashier & POS Operator', department: 'Retail Operations', brandName: 'Fashion Gallary' },
      { _id: 'seed_amitabh', employeeId: 'EMP-FH-002', fullName: 'Amitabh Sen', designation: 'Fleet Dispatch Officer', department: 'Logistics & Dispatch', brandName: 'Fashion Hub' },
      { _id: 'seed_pooja', employeeId: 'EMP-FG-004', fullName: 'Pooja Deshmukh', designation: 'Floor Supervisor', department: 'Retail Operations', brandName: 'Fashion Gallary' },
      { _id: 'seed_karan', employeeId: 'EMP-FA-002', fullName: 'Karan Malhotra', designation: 'Warehouse Operations Lead', department: 'Warehouse & Inventory', brandName: 'Fashion Adda' },
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

  const filteredTasks = (tasks || []).filter((t) => {
    if (activeBrandId && activeBrandId !== 'ALL' && t.brandId !== activeBrandId) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        t.title?.toLowerCase().includes(q) ||
        t.taskId?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSubtaskChange = (index, value) => {
    const next = [...subtasksList];
    next[index] = value;
    setSubtasksList(next);
  };

  const addSubtaskInput = () => {
    setSubtasksList([...subtasksList, '']);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!title || !dueDate) {
      alert('Please provide task title and due date.');
      return;
    }

    let assigned = [];
    if (assignedStaffList.length > 0) {
      assigned = assignedStaffList.map((e) => ({
        employeeId: e.employeeId || 'EMP',
        name: e.fullName,
        designation: e.designation || 'Staff',
      }));
    } else if (selectedStaffId && selectedStaffId !== 'ANY_AVAILABLE') {
      const emp = availableStaff.find((e) => e._id === selectedStaffId);
      if (emp) {
        assigned = [
          {
            employeeId: emp.employeeId || 'EMP',
            name: emp.fullName,
            designation: emp.designation || 'Staff',
          },
        ];
      }
    }

    if (assigned.length === 0) {
      assigned = [
        {
          employeeId: 'OPEN',
          name: 'Any Available Staff',
          designation: 'Open Pool',
        },
      ];
    }

    const cleanSubtasks = subtasksList
      .filter((s) => s.trim().length > 0)
      .map((s, i) => ({ id: `st_${Date.now()}_${i}`, title: s.trim(), isCompleted: false }));

    const res = await handleCreateTask({
      title: title.trim(),
      description,
      brandId: activeBrandId === 'ALL' ? 'brand_fg' : activeBrandId,
      category,
      priority,
      dueDate,
      assignedEmployees: assigned,
      subtasks: cleanSubtasks,
    });

    if (res.success) {
      setIsCreateModalOpen(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      setSelectedStaffId('');
      setAssignedStaffList([]);
      setSubtasksList(['']);
    }
  };

  const handleAddCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask) return;
    await handleAddComment(selectedTask._id || selectedTask.taskId, newCommentText.trim());
    setNewCommentText('');
  };

  // Kanban Columns
  const kanbanColumns = [
    { title: 'To Do & Assigned', statuses: ['To Do', 'Assigned'], color: 'border-slate-300' },
    { title: 'In Progress', statuses: ['In Progress', 'Blocked'], color: 'border-blue-400' },
    {
      title: 'Submitted for Review',
      statuses: ['Submitted for Review'],
      color: 'border-amber-400',
    },
    { title: 'Completed', statuses: ['Completed'], color: 'border-emerald-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-12">
      <EmployeeHeader activeTabName="tasks" onNavigate={onNavigate} />

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Top Control Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search tasks by title, ID, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
              />
            </div>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p} Priority
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('KANBAN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'KANBAN'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('LIST')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'LIST'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>

            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          </div>
        </div>

        {/* ── KANBAN BOARD VIEW ── */}
        {viewMode === 'KANBAN' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kanbanColumns.map((col) => {
              const colTasks = filteredTasks.filter((t) => col.statuses.includes(t.status));
              return (
                <div
                  key={col.title}
                  className="bg-slate-100/60 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col space-y-3 min-h-[500px]"
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full border-2 ${col.color} bg-white`} />
                      {col.title}
                    </h3>
                    <span className="text-[11px] font-bold px-2 py-0.2 rounded-full bg-white text-slate-600 border border-slate-200">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto">
                    {colTasks.length > 0 ? (
                      colTasks.map((t) => {
                        const isOverdue =
                          new Date(t.dueDate) < new Date() && t.status !== 'Completed';

                        return (
                          <div
                            key={t._id}
                            onClick={() => setSelectedTask(t)}
                            className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 cursor-pointer transition-all space-y-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {t.taskId}
                              </span>
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                                  t.priority === 'Urgent'
                                    ? 'bg-rose-100 text-rose-800'
                                    : t.priority === 'High'
                                    ? 'bg-amber-100 text-amber-800'
                                    : t.priority === 'Medium'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {t.priority}
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                              {t.title}
                            </h4>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                              <span className="text-[10px] font-semibold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                                {t.category}
                              </span>
                              <div
                                className={`flex items-center gap-1 text-[10px] font-semibold ${
                                  isOverdue ? 'text-rose-600 font-bold' : 'text-slate-500'
                                }`}
                              >
                                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                                <span>
                                  {new Date(t.dueDate).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </span>
                              </div>
                            </div>

                            {/* Assigned Staff */}
                            {t.assignedEmployees?.length > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="truncate">
                                  {t.assignedEmployees.map((e) => e.name).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="h-32 flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        No tasks in this lane
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── LIST VIEW ── */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Task ID & Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Assigned To</th>
                  <th className="py-3.5 px-4">Due Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((t) => {
                    const isOverdue =
                      new Date(t.dueDate) < new Date() && t.status !== 'Completed';

                    return (
                      <tr key={t._id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{t.title}</div>
                          <div className="text-[10px] font-mono text-emerald-700 font-semibold">
                            {t.taskId}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">{t.category}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              t.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-800'
                                : t.priority === 'High'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {t.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {t.assignedEmployees?.map((e) => e.name).join(', ') || 'Unassigned'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-semibold ${
                              isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'
                            }`}
                          >
                            {new Date(t.dueDate).toLocaleDateString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">{t.status}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTask(t)}
                            className="px-3 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold rounded-lg text-xs"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">
                      No tasks found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE TASK MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Create Task</h3>
                <p className="text-xs text-slate-500">
                  Assign work with priority, deadlines and subtasks
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct barcode audit for FMCG aisle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task instructions and expectations..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p} Priority
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wide">
                    Assign Staff (Dropdown)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedStaffId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedStaffId(val);
                        if (val && val !== 'ANY_AVAILABLE') {
                          const emp = availableStaff.find((s) => s._id === val);
                          if (emp && !assignedStaffList.some((s) => s._id === emp._id)) {
                            setAssignedStaffList((prev) => [...prev, emp]);
                          }
                        } else if (val === 'ANY_AVAILABLE') {
                          setAssignedStaffList([]);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-2xs appearance-none pr-10"
                    >
                      <option value="">-- Choose Staff Member to Assign --</option>
                      <option value="ANY_AVAILABLE">👥 Any Available Staff (Open Team Pool)</option>

                      <optgroup label="Available Staff & Team Members">
                        {availableStaff.map((emp) => (
                          <option key={emp._id} value={emp._id}>
                            {emp.fullName} ({emp.designation} • {emp.brandName || emp.department})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Selected Staff Tags (supports single or multiple assignees) */}
              {assignedStaffList.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-xs font-bold text-slate-500">Assigned To:</span>
                  {assignedStaffList.map((st) => (
                    <span
                      key={st._id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 shadow-2xs"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{st.fullName} ({st.designation})</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = assignedStaffList.filter((s) => s._id !== st._id);
                          setAssignedStaffList(next);
                          if (selectedStaffId === st._id) {
                            setSelectedStaffId(next[0]?._id || '');
                          }
                        }}
                        className="text-emerald-500 hover:text-emerald-800 cursor-pointer ml-1"
                        title="Remove Assignee"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Subtasks */}
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-700">Checklist / Subtasks</label>
                  <button
                    type="button"
                    onClick={addSubtaskInput}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    + Add Step
                  </button>
                </div>
                {subtasksList.map((st, i) => (
                  <input
                    key={i}
                    type="text"
                    placeholder={`Step ${i + 1}`}
                    value={st}
                    onChange={(e) => handleSubtaskChange(i, e.target.value)}
                    className="w-full px-3.5 py-2 border rounded-xl text-sm"
                  />
                ))}
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4.5 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-xs cursor-pointer"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TASK DETAIL MODAL ── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedTask.taskId}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-1 leading-snug">
                  {selectedTask.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Status Workflow Action Buttons */}
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Change Status Workflow
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['To Do', 'In Progress', 'Submitted for Review', 'Completed'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={async () => {
                        await handleUpdateTaskStatus(
                          selectedTask._id || selectedTask.taskId,
                          st
                        );
                        setSelectedTask({ ...selectedTask, status: st });
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        selectedTask.status === st
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTask.description && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-slate-700 leading-relaxed">
                  {selectedTask.description}
                </div>
              )}

              {/* Subtasks checklist */}
              {selectedTask.subtasks?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Subtasks Checklist
                  </span>
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    {selectedTask.subtasks.map((st, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <CheckCircle2
                          className={`w-4 h-4 ${
                            st.isCompleted ? 'text-emerald-600' : 'text-slate-300'
                          }`}
                        />
                        <span className={st.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}>
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Feed */}
              <div className="space-y-2 pt-2 border-t">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Comments & Activity
                </span>
                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {selectedTask.comments?.length > 0 ? (
                    selectedTask.comments.map((c, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                        <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                          <span>{c.authorName}</span>
                          <span className="text-slate-400 font-normal">
                            {new Date(c.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5">{c.text}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 text-center py-2 text-[11px]">
                      No comments yet.
                    </div>
                  )}
                </div>

                {/* Add Comment input */}
                <form onSubmit={handleAddCommentSubmit} className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    placeholder="Write a message or update..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    className="flex-1 px-3 py-1.5 border rounded-xl text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center gap-1 text-xs"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTasksPage;
