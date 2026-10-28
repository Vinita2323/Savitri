import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema(
  {
    leaveId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    brandId: {
      type: String,
      required: true,
      index: true,
    },
    department: {
      type: String,
      default: 'Operations',
    },
    leaveType: {
      type: String,
      enum: [
        'Casual Leave',
        'Sick Leave',
        'Earned Leave',
        'Unpaid Leave',
        'Maternity/Paternity',
        'Compensatory Off',
      ],
      default: 'Casual Leave',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDayType: {
      type: String,
      enum: ['First Half', 'Second Half', 'None'],
      default: 'None',
    },
    totalDays: {
      type: Number,
      required: true,
      default: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    attachment: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
      default: 'Pending',
      index: true,
    },
    reviewedBy: {
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
      name: { type: String, default: '' },
      role: { type: String, default: '' },
      notes: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

leaveRequestSchema.index({ brandId: 1, status: 1 });
leaveRequestSchema.index({ employee: 1, startDate: 1, endDate: 1 });

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);
export default LeaveRequest;
