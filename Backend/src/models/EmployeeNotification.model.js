import mongoose from 'mongoose';

const employeeNotificationSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    brandId: { type: String, default: '' },
    type: {
      type: String,
      enum: [
        'registration_approved',
        'registration_rejected',
        'task_assigned',
        'task_deadline',
        'task_overdue',
        'task_approved',
        'task_rejected',
        'task_changes_requested',
        'extension_decided',
        'leave_approved',
        'leave_rejected',
        'attendance_correction',
        'general',
      ],
      default: 'general',
    },
    title: { type: String, required: true },
    message: { type: String, default: '' },
    link: { type: String, default: '' },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

employeeNotificationSchema.index({ employee: 1, isRead: 1, createdAt: -1 });

const EmployeeNotification = mongoose.model('EmployeeNotification', employeeNotificationSchema);
export default EmployeeNotification;
