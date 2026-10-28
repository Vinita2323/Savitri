import mongoose from 'mongoose';

const employeeTaskSchema = new mongoose.Schema(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    brandId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    brandName: {
      type: String,
      default: '',
    },
    storeId: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      default: 'General',
    },
    category: {
      type: String,
      enum: [
        'Store Operations',
        'Inventory Audit',
        'Order Dispatch',
        'Customer Support',
        'Merchandising',
        'Maintenance',
        'Administrative',
        'Other',
      ],
      default: 'Store Operations',
    },
    assignedEmployees: [
      {
        employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
        employeeId: { type: String },
        name: { type: String },
        avatar: { type: String, default: '' },
        designation: { type: String, default: '' },
      },
    ],
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: 'Admin' },
      role: { type: String, default: 'super_admin' },
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'To Do',
        'Assigned',
        'In Progress',
        'Blocked',
        'Submitted for Review',
        'Completed',
        'Reopened',
      ],
      default: 'To Do',
      index: true,
    },
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    subtasks: [
      {
        id: { type: String },
        title: { type: String, required: true },
        isCompleted: { type: Boolean, default: false },
        completedAt: { type: Date, default: null },
      },
    ],
    comments: [
      {
        id: { type: String },
        authorName: { type: String, default: '' },
        authorRole: { type: String, default: '' },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        name: { type: String },
        url: { type: String },
        size: { type: String, default: '' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    completionNotes: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: '',
    },
    reviewedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
    },
    isOverdue: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

employeeTaskSchema.index({ brandId: 1, status: 1 });
employeeTaskSchema.index({ 'assignedEmployees.employee': 1, status: 1 });

const EmployeeTask = mongoose.model('EmployeeTask', employeeTaskSchema);
export default EmployeeTask;
